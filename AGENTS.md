# Agent Development Guidelines

## Build/Test Commands

- `pnpm run lint` - Lint all workspaces
- `pnpm run lint:fix` - Auto-fix linting issues
- `anchor test` - Run all Solana program tests
- `cd tests && npx jest` - Run TypeScript tests
- `cd packages/sdk && pnpm run build` - Build SDK package
- `cd packages/sdk && pnpm run manager` - Run SDK manager CLI
- `make prep` - Setup Solana toolchain (v1.18.20, Anchor 0.31.0)
- `make build` - build every component of the repo

## Code Style

- Use TypeScript with strict types, avoid `any` except for Anchor wallet compatibility
- Import statements: Solana imports first, then Anchor, then local modules
- Use camelCase for variables/functions, PascalCase for types/classes
- Error handling: Use Anchor's `Result<()>` in Rust, proper try/catch in TypeScript
- Format with Prettier (configured), use `pnpm run lint:fix` before commits
- File naming: snake_case for Rust, camelCase for TypeScript
- Use `PublicKey` for Solana addresses, `anchor.BN` for big numbers
- Prefer `accountsStrict()` over `accounts()` for type safety
- Use PDAs consistently with helper functions from `packages/sdk/src/pda.ts`
- Test files should mirror source structure with `.test.ts` suffix

## Project Overview

**Tributary** - Automated recurring payments on Solana using token delegation. Web2 subscription UX with Web3 transparency.

### Repository Layout

```
programs/tributary/   Rust smart contract (Anchor 0.31.0)
packages/sdk/         TypeScript SDK + manager CLI (@tributary-so/sdk)
packages/sdk-react/   React hooks bindings
packages/sdk-x402/    x402 / HTTP-402 payment integration
packages/payments/    Payment helper utilities
packages/lighthouse/  Vendored official Lighthouse SDK (not on npm)
tests/                Integration test suite (jest, runs against Surfpool)
apps/docs/            MkDocs documentation site (what/how/why)
apps/docs/adr/        Architecture Decision Records (numbered, immutable-once-deployed)
apps/showcase-payment-policies/   Owner-direct policy creation showcase (HeroUI/jotai)
CONTEXT.md            Domain glossary / ubiquitous language (single-context repo)
landing/              React/Tailwind marketing site
```

> **Reading order for new agents:** `CONTEXT.md` (domain language) →
> `AGENTS.md` (this file — build/test, gotchas) → `apps/docs/adr/` (the
> _why_ behind every locked-in architectural decision). The ADRs are the
> authority on rationale; the code is the authority on current state.

### Core Architecture

The program exposes two families of pull-payment policies that share the same
payment-schedule model but differ in execution semantics:

1. **PaymentPolicy** — direct pull payments (subscription / milestone / pay-as-you-go)
2. **ComposablePolicy** — programmable pull payments with optional validation + token forwarding

Both reuse the same `PolicyType` enum, `UserPayment` account, `PaymentGateway`,
and fee-distribution logic.

## Program Details

**Program ID:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

### Instructions

**Regular (PaymentPolicy):**
`initialize`, `create_user_payment`, `create_payment_gateway`, `create_payment_policy`,
`execute_payment`, `change_payment_policy_status`, `delete_payment_policy`,
`delete_user_payment`, `delete_payment_gateway`, `change_gateway_signer`,
`change_gateway_fee_recipient`, `change_gateway_fee_bps`, `update_gateway_referral_settings`,
`update_gateway_protocol_fee`, `update_gateway_feature_flags`, `create_referral_account`,
`transfer`

**Composable:**
`create_composable_policy`, `execute_composable`, `delete_composable_policy`,
`change_composable_status`

**Admin:**
`change_program_authority`

### PDAs

| PDA              | Seeds                                            | Notes                                                                              |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| ProgramConfig    | `["config"]`                                     | singleton — protocol fees/admin, emergency pause                                   |
| PaymentGateway   | `["gateway", authority]`                         | per-authority gateway settings/fees                                                |
| UserPayment      | `["user_payment", owner, mint]`                  | per user+mint; tracks both `created_policies_count` AND `created_composable_count` |
| PaymentPolicy    | `["payment_policy", user_payment, policy_id]`    | regular pull-payment policy                                                        |
| ComposablePolicy | `["composable_policy", user_payment, policy_id]` | programmable pull-payment policy                                                   |
| ValidationPda    | `["composable_validation", composable_policy]`   | stores Lighthouse assertion data (≤1024 bytes)                                     |
| PaymentsDelegate | `["payments"]`                                   | legacy global delegate (deprecated — UserPayment PDA is the delegate now)          |
| ReferralAccount  | `["referral", gateway, referral_code]`           | 6-char referral code tracking                                                      |

> **Counter separation:** `PaymentPolicy` IDs come from
> `user_payment.created_policies_count`; `ComposablePolicy` IDs come from
> `user_payment.created_composable_count`. These are independent counters — a
> regular policy #1 and a composable policy #1 can coexist on the same
> UserPayment.

---

## PaymentPolicy (Direct Pull Payments)

A PaymentPolicy is a non-custodial recurring payment where the gateway pulls
tokens **directly** from the user's token account to the recipient. No
intermediate accounts, no swaps, no validation hooks — simple `transfer` +
fee split.

### How it works

```
User → createUserPayment(owner, mint)
    → createPaymentGateway(authority, feeBps, feeRecipient)
    → createPaymentPolicy(userPayment, recipient, gateway, PolicyType)
    → approve delegate on user token account (UserPayment PDA)
    → executePayment (permissionless — any gateway signer)
       → transfer user_token → recipient + protocol fee + gateway fee
```

Execution is a single CPI `transfer` from the user's token account to the
recipient's ATA, with protocol fee (100 bps) and gateway fee deducted and
routed to their respective fee recipients. The delegate on the user's token
account **must** be the UserPayment PDA with sufficient `delegated_amount`.

### PolicyType (shared by both policy families)

All variants are exactly 128 bytes (fixed-size for account stability):

- **Subscription** — fixed `amount` every `payment_frequency` until
  `max_renewals` reached (or indefinitely if `auto_renew`). `next_payment_due`
  gates execution.
- **Milestone** — up to 4 milestone amounts/timestamps held in escrow.
  Released via `release_condition` bitmap: bit0=due-date check, bit1=gateway
  signer, bit2=owner signer, bit3=recipient signer (bits 1–3 mutually
  exclusive).
- **PayAsYouGo** — usage-based: claim up to `max_chunk_amount` per call, capped
  at `max_amount_per_period` per `period_length_seconds`. Period resets
  automatically. Optional `expiry_date` (ADR-0024): `None` = never expires;
  `Some(ts)` with `ts > 0` rejects execution once `current_time > ts`
  (boundary `<=` permitted). Orthogonal to the period cap.
- **OneTime** (ADR-0019) — fixed `amount`, fires exactly once then transitions
  to `Completed`. `due_date <= 0` means immediate; `expiry_date = None` means
  never expires. Full gateway lifecycle (PDA, pausable, deletable, schedulable,
  composable hooks). Not the standalone `transfer` instruction (ADR-0004).
- **UpTo** (ADR-0020) — single-use, time-bound variable-amount authorization.
  The actual settled amount is caller-supplied at execute time, bounded by
  `max_amount` (`0 <= actual <= max`). `valid_after <= 0` means immediate;
  `deadline` is mandatory (`> 0`, `> valid_after`). Recipient-triggerable
  (like PayAsYouGo). The x402 `upto` scheme primitive — settle what was
  actually used, once.

### SDK usage

```typescript
import { Tributary, getPaymentFrequency, encodeMemo } from "@tributary-so/sdk";

// Full subscription setup (ATA creation + user payment + policy + delegate approval)
const ixs = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN("1000000"), // amount
  true, // auto-renew
  12, // max renewals
  getPaymentFrequency("monthly"),
  encodeMemo("Pro plan")
);

// Permissionless execution (called by gateway signer)
const execIxs = await sdk.executePayment(paymentPolicyPda);
```

Low-level instruction-only variants: `getCreateSubscriptionPolicyInstruction`,
`getCreatePayAsYouGoPolicyInstruction`, `getCreateMilestonePolicyInstruction`.

---

## ComposablePolicy (Programmable Pull Payments)

A ComposablePolicy extends pull payments with two optional hooks that run
**during** execution, between the pull and the settlement:

1. **Validation** — a read-only assertion CPI (Lighthouse) that can veto the
   transaction if on-chain state doesn't meet a condition (e.g. "hot wallet
   balance below threshold").
2. **Forward** — a token-transform CPI (Meteora DLMM) that swaps the pulled
   input token into an output token before delivering to the recipient
   (e.g. pull USDC, deliver WSOL).

Both hooks are **opt-in** via sentinel values (disabled = `Pubkey::default` /
`SystemProgram`). A composable policy with both disabled behaves like a
PaymentPolicy but with a separate PDA namespace and an intermediate ATA hop.

### Execution flow (5 phases, v2.2)

```
execute_composable:
  ┌─ Phase 0: BYTE-RANGE CHECKS + GATE ─────────────────────────────┐
  │ Validate forward instruction_data against InstructionConstraint   │
  │ data_checks (if forward enabled). Cold-relayer OR-gate:           │
  │   has_post_validation || has_route_pin (ADR-0016 amended)        │
  └──────────────────────────────────────────────────────────────────┘
  ┌─ Phase 1: PULL (gross, NET-on-pull hardcoded) ──────────────────┐
  │ Pull face + fee from user → intermediate_input. Delegate +       │
  │ balance + PayAsYouGo caps all bind on GROSS (ADR-0026).          │
  └──────────────────────────────────────────────────────────────────┘
  ┌─ Phase 1b: SKIM FEES (input-side, ADR-0026) ────────────────────┐
  │ Skim protocol + gateway + scheduler cuts from                    │
  │ intermediate_input → input_mint fee accounts. After skim,        │
  │ intermediate_input holds exactly `face` (what forward consumes).  │
  └──────────────────────────────────────────────────────────────────┘
  ┌─ Phase 2: PRE-VALIDATION (optional) ─────────────────────────────┐
  │ If pre_validation = ProgramCall: CPI into validation_program     │
  │ (Lighthouse) with assertion data from pre ValidationPda.         │
  │ Fails the tx if the assertion doesn't hold. Read-only.           │
  └──────────────────────────────────────────────────────────────────┘
  ┌─ Phase 3: FORWARD (optional) + PIN-CHECK ────────────────────────┐
  │ If forward enabled: pin-check InstructionConstraint.pinned_accounts│
  │ against remaining_accounts. CPI into target_program (Meteora DLMM)│
  │ to swap intermediate_input → intermediate_output.                │
  │ Byte-range checks validate the forward instruction selector.     │
  └──────────────────────────────────────────────────────────────────┘
  ┌─ Phase 4: POST-VALIDATION (optional) ────────────────────────────┐
  │ If post_validation = ProgramCall: CPI into validation_program    │
  │ with assertion data from post ValidationPda. The owner's floor    │
  │ on output (deliver-transform) or settlement (act mode).          │
  └──────────────────────────────────────────────────────────────────┘
  ┌─ Phase 5: SETTLE (shape-dependent, ADR-0026) ────────────────────┐
  │ Three shapes:                                                    │
  │  • deliver-no-transform: sweep intermediate_input (face) → recip │
  │  • deliver-transform: sweep intermediate_output → recipient      │
  │    (>0 guard KEPT); input residue → user                        │
  │  • act: input residue → user; NO deliver sweep, NO >0 guard      │
  │ Fees already skimmed in Phase 1b — settle moves only principal.  │
  └──────────────────────────────────────────────────────────────────┘
```

### ForwardConfig

```rust
struct ForwardConfig {
    instruction_constraint: InstructionConstraint,  // see below
    input_mint: Pubkey,           // == user_payment.token_mint
    output_mint: Pubkey,          // recipient delivery mint
    forward_flags: u8,
}

struct InstructionConstraint {
    program_id: Pubkey,       // Pubkey::default() = disabled (sentinel)
    num_data_checks: u8,
    data_checks: [ByteRangeCheck; 4], // pin forward instruction selector
    num_pinned_accounts: u8,
    pinned_accounts: [Pubkey; 4],     // positional, default() = wildcard slot
}
```

- `program_id` must be in `ALLOWED_FORWARD_PROGRAMS` (currently: Meteora DLMM
  `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`). `Pubkey::default()` disables
  the forward step entirely.
- When enabled, at least one `ByteRangeCheck` must pin the discriminator at
  offset 0 — prevents a gateway from swapping in an arbitrary instruction.
- **Degenerate-pin guard**: `InstructionConstraint` with zero effective pins
  is rejected at create when forward is enabled.
- **output_mint** has three semantics (ADR-0026):
  - `== input_mint` + forward disabled → **deliver-no-transform** (same-mint topup)
  - set, `!= input_mint` + forward enabled → **deliver-transform** (swap)
  - `Pubkey::default()` + forward enabled → **act mode** (no fungible output;
    e.g. Velocity subaccount deposit). No output ATA, no deliver sweep, no `>0` guard.
- **min_output_amount REMOVED** (v2.1). `post_validation` generalizes it. The
  `>0` guard survives only in deliver-transform mode as an existence assertion.

### ValidationSpec (pre + post, same type)

```rust
enum ValidationSpec {
    Disabled,
    ProgramCall { program_id: Pubkey },  // must be in ALLOWED_VALIDATION_PROGRAMS
    Inline { reserved: u8 },             // not implemented, errors at create
}
```

ComposablePolicy carries TWO instances: `pre_validation` (after PULL, before
FORWARD) and `post_validation` (after FORWARD, before SETTLE).

Two separate ValidationPda accounts:

- `["composable_validation_pre", composable_policy]`
- `["composable_validation_post", composable_policy]`

Each independently created only when the corresponding `ValidationSpec` is
`ProgramCall`. The assertion **data** (≤1024 bytes) is stored in the
ValidationPda account, not inline.

- `validation_program` must be in `ALLOWED_VALIDATION_PROGRAMS` (currently:
  Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`). `SystemProgram`
  disables validation.

### Building Lighthouse assertions (SDK facade)

Use the fluent `lighthouse` facade from `@tributary-so/sdk` — never hand-roll
the serialization. It wraps the vendored official Lighthouse client
(`packages/lighthouse`) and produces the `{ data, numAccounts, accounts }`
triple:

```typescript
import { lighthouse, LIGHTHOUSE_PROGRAM_ID } from "@tributary-so/sdk";

// Assert hotWallet USDC balance < 50 USDC before topping up
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<") // or IntegerOperator.LessThan
  .build();

// guard.data        → Buffer (stored in ValidationPda)
// guard.numAccounts → 1        (numValidationAccounts)
// guard.accounts    → [hotWalletUsdcAta]  (Lighthouse read-account slice)
```

Covers all assertion families + multi-variants: `tokenAccount`, `mintAccount`,
`accountInfo`, `accountData`, `accountDelta` (2 accounts), `sysvarClock` (0
accounts), `stakeAccount`, `merkleTree`. Operator sugar: `"<"`, `">="`,
`"!="`, `"in"`, … alongside the `IntegerOperator` / `EquatableOperator` enums.

> **Scope:** the facade owns ONLY the Lighthouse target_account(s). The caller
> assembles Tributary's full `remaining_accounts` list (`[ValidationPda,
...guard.accounts]`) — this is intentional.

### SDK usage — create + execute

```typescript
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";

// 1. Build the assertion
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .build();

// 2. Create the composable policy (low-level instruction)
const ix = await sdk.getCreateComposablePolicyInstruction(
  tokenMint,
  recipient,
  gateway,
  policyType, // same PolicyType enum (Subscription/Milestone/PayAsYouGo)
  "Auto topup guard",
  forwardConfig, // targetProgram = PublicKey.default for no-swap topup
  LIGHTHOUSE_PROGRAM_ID, // validation program (SystemProgram = none)
  guard.numAccounts, // numValidationAccounts
  guard.data // validation data buffer
);

// 3. Execute (permissionless — caller supplies forward instruction data + remaining accounts)
const execIx = await sdk.executeComposable(
  composablePolicyPda,
  instructionData, // forward program ix data (empty if forward disabled)
  forwardAmount ?? null,
  remainingAccounts // [ValidationPda, ...lighthouseTargetAccounts, ...forwardAccounts]
);
```

---

## Critical Gotchas

### 1. Delegate Approval Required (both policy types)

User must approve token delegation on their token account before payments can
execute. `execute_payment` / `execute_composable` fail if delegate permissions
are missing or insufficient. The delegate is the **UserPayment PDA** (the
legacy global `PaymentsDelegate` PDA is still accepted for backward compat).

### 2. Payment Execution Timing

`execute_payment` checks `next_payment_due`. Payments only execute if current
time >= due time. `PayAsYouGo` enforces a per-period cap instead.

### 3. Fee Distribution

Unified fee model (ADR-0018, supersedes ADR-0006): **one** `gateway_fee_bps`
(gateway-authority-set) decomposed into carve-outs:

- **Protocol cut**: `total_fee × protocol_share_bps` (global rate on
  `ProgramConfig`; per-gateway admin-granted override via
  `FEATURE_CUSTOM_PROTOCOL_FEE`, can be zero)
- **Scheduler cut**: `total_fee × scheduler_share_bps` (per-gateway) — pays
  the execute-tx signer; merges into `gateway.fee_recipient` when the
  gateway signer self-executes, otherwise routes to the signer's ATA
  (`remaining_account`)
- **Referral pool**: `total_fee × referral_allocation_bps` (per-gateway,
  tiered, `FEATURE_REFERRAL`)
- **Gateway residual**: the rest → `gateway.fee_recipient`

Constraint: `protocol_share + scheduler_share + referral_allocation ≤ 10000`
(enforced at every gateway-config write site). NET_AMOUNT (gross/net pull
basis) is orthogonal. No absolute protocol floor — the share rate is the
mechanism. **Composable fee path is input-side** (ADR-0026): fees are
skimmed from the gross pull in `input_mint` before the forward runs;
NET-on-pull is hardcoded (the `FEATURE_NET_AMOUNT` flag is ignored for
composable). PaymentPolicy still honors the flag (fees off the payment
amount).

### 4. Account Size Padding

All state accounts use fixed sizes with padding. `PolicyType` variants are 128
bytes each. **Changing padding breaks deserialization.**

### 5. Composable: Intermediate ATA Ownership

Intermediate ATAs are owned by the **ComposablePolicy PDA**, not the
UserPayment PDA. This decouples intermediate-ATA signing authority from the
user-source delegate, so a forward program can only move transient intermediate
balances — never the user's source funds.

### 6. Composable: CPI Signer Sanitization

Validation and forward CPI builders do **not** forward `is_signer` from
`remaining_accounts`. This closes a privilege-pass-through vector where the
fee payer (a Signer) re-passed as a remaining account could grant Lighthouse /
DLMM unintended signer authority.

### 7. Composable: Allowlists

Forward and validation target programs are hard-allowlisted on-chain
(`programs/tributary/src/constants.rs`):

- `ALLOWED_FORWARD_PROGRAMS`: Meteora DLMM
- `ALLOWED_VALIDATION_PROGRAMS`: Lighthouse

Sentinels (`Pubkey::default()` / `SystemProgram`) disable the respective hook.

### 8. Emergency Pause

`ProgramConfig.emergency_pause` flag. When true, all `execute_payment` AND
`execute_composable` calls fail.

## Architecture Decision Records (ADRs)

ADRs live in `apps/docs/adr/` and capture the _why_ behind every locked-in
architectural decision. They are numbered chronologically:
**0001–0006** are v1 PaymentPolicy-era decisions; **0007–0016** are v2
ComposablePolicy-era decisions (0015 is a positioning/narrative ADR, the
rest are architectural). Each ADR is 1–3 paragraphs naming the
decision, the rejected alternatives, and the rationale. **Code is the
authority on current state; ADRs are the authority on rationale.** If the
two disagree, the ADR is wrong — fix it.

When making a change that locks in a new architectural decision (hard to
reverse, surprising without context, real trade-off), add a new numbered
ADR. Use the format in `apps/docs/adr/0001-…md` as the template.

### ADR map

**v1 — PaymentPolicy era:**

| ADR    | Title                                                                   |
| ------ | ----------------------------------------------------------------------- |
| [0001] | Account topology and the UserPayment-as-delegate model                  |
| [0002] | PolicyType: three variants in a 128-byte fixed layout                   |
| [0003] | Milestone release_condition as a bitmap                                 |
| [0004] | Permissionless execution and the standalone `transfer` instruction      |
| [0005] | Referral system: gateway-scoped, 3-level chain, ref-code in seeds       |
| [0006] | Per-gateway fee model with feature-flag gating _(superseded by [0018])_ |

**v2 — ComposablePolicy era:**

| ADR    | Title                                                                                   |
| ------ | --------------------------------------------------------------------------------------- |
| [0007] | ComposablePolicy as a separate account type, not a PolicyType variant                   |
| [0008] | Composable CPI privilege boundary (intermediate ATA ownership + signer sanitizing)      |
| [0009] | Composable hooks: sentinel-disabled, externally stored                                  |
| [0010] | Composable settlement semantics (NET min_output, PayAsYouGo-only forward_amount)        |
| [0011] | Referral chain hardened at execution: re-validated + payer-bound                        |
| [0012] | Mint compatibility: Token-2022 extension blocklist                                      |
| [0013] | Lighthouse SDK vendored with an anti-corruption facade in `@tributary-so/sdk`           |
| [0014] | Composable scheduler trigger model: per-policy state-poll                               |
| [0015] | Position Tributary as one primitive — "If This Then Money" (positioning)                |
| [0016] | Permissionless composable execution: parameter-constrained schedulers                   |
| 0017   | Composable Memo 32-bytes                                                                |
| [0018] | Unified gateway fee model with scheduler incentive                                      |
| [0019] | OneTime payment policy variant (fixed amount, single execution, full gateway lifecycle) |
| [0020] | UpTo scheme: variable-amount single-settlement authorization (x402 `upto`)              |
| [0021] | Composable v2.1: InstructionConstraint + Unified ValidationSpec                         |
| [0022] | Fixed-size PDAs (no realloc)                                                            |
| [0023] | Payments session encoding v2 — all PolicyType variants                                  |
| [0024] | Optional PayAsYouGo expiration (per-variant `expiry_date`)                              |
| [0025] | JWT payload generalized to `policies: PolicyClaim[]` (all 5 variants)                   |
| [0026] | Composable input-side fees + act/deliver settlement shapes                              |
| [0027] | Gateway merchant layer — off-chain derived analytics                                    |
| [0029] | Program authority rotation (`change_program_authority`) — admin key recovery path       |

[0001]: apps/docs/adr/0001-account-topology-and-delegate-model.md
[0002]: apps/docs/adr/0002-policytype-three-variants-128-byte-fixed-layout.md
[0003]: apps/docs/adr/0003-milestone-release-condition-bitmap.md
[0004]: apps/docs/adr/0004-permissionless-execution-and-standalone-transfer.md
[0005]: apps/docs/adr/0005-referral-system-gateway-scoped-3-level-chain.md
[0006]: apps/docs/adr/0006-per-gateway-fee-model.md
[0007]: apps/docs/adr/0007-composablepolicy-as-separate-account-type.md
[0008]: apps/docs/adr/0008-composable-cpi-privilege-boundary.md
[0009]: apps/docs/adr/0009-composable-hooks-sentinel-disabled-externally-stored.md
[0010]: apps/docs/adr/0010-composable-settlement-semantics.md
[0011]: apps/docs/adr/0011-referral-chain-hardened-at-execution.md
[0012]: apps/docs/adr/0012-mint-compatibility-token-2022-blocklist.md
[0013]: apps/docs/adr/0013-lighthouse-sdk-vendored-facade.md
[0014]: apps/docs/adr/0014-composable-scheduler-trigger-model.md
[0015]: apps/docs/adr/0015-positioning-if-this-then-money.md
[0016]: apps/docs/adr/0016-permissionless-composable-execution.md
[0018]: apps/docs/adr/0018-unified-fee-model.md
[0019]: apps/docs/adr/0019-onetime-policy-variant.md
[0020]: apps/docs/adr/0020-upto-scheme-and-policy-variant.md
[0021]: apps/docs/adr/0021-composable-v21-instructionconstraint-validation-spec.md
[0022]: apps/docs/adr/0022-fixed-size-pdas-no-realloc.md
[0023]: apps/docs/adr/0023-payments-session-encoding-v2-all-policytype-variants.md
[0024]: apps/docs/adr/0024-payasyougo-optional-expiration.md
[0025]: apps/docs/adr/0025-jwt-payload-generalized-policyclaim-union.md
[0026]: apps/docs/adr/0026-composable-input-side-fees-act-deliver-shapes.md
[0027]: apps/docs/adr/0027-gateway-merchant-layer-off-chain-derived-analytics.md
[0029]: apps/docs/adr/0029-program-authority-rotation.md

## SDK

TypeScript SDK in `packages/sdk/`:

```typescript
import { Tributary } from "@tributary-so/sdk"; // Main SDK class
```

Manager CLI: `cd packages/sdk && pnpm run manager`

## Testing

```bash
anchor test              # Rust program tests
cd tests && npx jest     # TypeScript integration tests (requires Surfpool)
```

Composable / topup tests live in `tests/topup-balance.test.ts` and
`tests/topup-balance-swap.test.ts`. They require Surfpool
(`surfpool start --legacy-anchor-compatibility --no-tui`).

## Beans

**IMPORTANT**: before you do anything else, run the `beans prime` command and heed its output.
When making a commit, include the relevant bean IDs in the commit message.

### Milestone structure (mandatory)

Every body of work large enough to warrant a release ships as a **milestone**
bean with a fixed type hierarchy. The bean `type` MUST match its level:

```
milestone            ← one per release / main topic
├─ epic              ← thematic container, NEVER worked on directly
│  ├─ feature        ← user-facing capability or distinct deliverable
│  │  └─ task        ← concrete, grabbable unit of work
│  └─ ...
└─ ...
```

Levels map 1:1 to bean types: `milestone` → `epic` → `feature` → `task`.
Never skip a level (no `task` directly under a `milestone`). The one
exception: a standalone `feature: documentation` may sit directly under the
milestone when docs is a single deliverable (no testing/implementation
sub-structure needed). Epics and the milestone are containers only — they
hold children, they are not executed. Wire parents with `--parent`.

**Epic vs feature — the quick test:** epic groups features by theme
(implementation, testing). Feature produces one concrete artifact (the
program diff, the SDK update, the test suite). If it ships a diff to one
layer of the repo, it's a feature; if it groups diffs across layers, it's
an epic. When in doubt: a feature should be closeable with a single PR; an
epic closes when all its child features close.

### Canonical milestone template

When the agent creates a milestone, it evaluates which of the following apply
to the change at hand and instantiates **only** the relevant ones. Scope
drives selection — not every milestone touches every layer. If a layer in the
program structure is untouched, omit it.

```
milestone: <main topic>
├─ epic: implementation
│  ├─ feature: changes to program contract      ← programs/tributary/ (Rust/Anchor)
│  ├─ feature: sdk compatibility                ← packages/sdk, sdk-react, sdk-x402, payments
│  └─ feature: update of apps                   ← only the apps/ entries actually touched
│     ├─ task: update apps/landing
│     ├─ task: update apps/app
│     ├─ task: update apps/checkout
│     ├─ task: update apps/showcase-*           ← showcase-payment-policies, -payments, -topup-sol
│     ├─ task: update apps/scheduler
│     ├─ task: update apps/cli
│     └─ task: ....
├─ epic: testing
│  ├─ feature: integration tests using surfpool ← tests/
│  ├─ feature: formal verification updates      ← formal_verification/ + tributary.qedspec
│  ├─ feature: update github ci/cd pipeline     ← .github/workflows
│  └─ ....
└─ feature: documentation                       ← README.md, apps/docs, apps/docs/adr/ (new ADR if a decision locks in)
```

### Rules for the agent producing the milestone

- **Read the change first.** Trace what the feature actually touches
  (program? SDK only? an app? docs?) before creating any bean.
- **Pick levels by type.** `milestone` for the release, `epic` for each
  theme (implementation / testing / …), `feature` per deliverable, `task`
  per grabbable unit. Epics with no children = wrong; create the children.
- **Omit what doesn't apply.** A pure-SDK change needs no program-contract
  feature. A doc-only milestone has no implementation epic. Don't pad.
- **One feature per `apps/` deliverable group**; one task per touched
  `apps/<dir>`. Don't fan out tasks for untouched apps.
- **New ADR ⇒ documentation feature** (or its own epic if the decision is
  the milestone). Code is authority on state; ADR is authority on rationale.
- **Program changes ⇒ Update of tributary.qedspec**; update the spec and
  recreate the entire formal_verification directory accordingly!
- **Link with `--parent` and `--blocked-by`** so the tree reflects real
  dependencies (e.g. SDK feature blocked-by program-contract feature; apps
  blocked-by SDK feature; tests blocked-by implementation epic).
- **Status flows up.** A milestone is `completed` only when all its leaf
  tasks are `completed`. Epics close when all their features close.

### Bean hygiene

1. **Check before creating.** Run `beans list --json` and scan for existing
   beans covering the same scope. Duplicates waste context. If a new bean
   subsumes an old one, scrap the old with a `## Reasons for Scrapping`
   section — don't leave both.
2. **Restructuring.** When a grilling or design session changes scope,
   rewrite bean bodies by appending a `## REWRITTEN SCOPE (date —
supersedes content above)` section. Update titles via GraphQL (CLI has
   no `--title` flag — see cheat sheet). Don't scrap and recreate beans
   that have accumulated context; rewrite in place.
3. **Design decisions → milestone body.** When a grilling resolves
   architectural questions, capture them in the milestone body as a
   "Design decisions" section with struct layouts, flow diagrams, and
   rationale. Individual tasks under features carry the acceptance criteria
   (TDD checklist).
4. **Investigation beans.** Research that may never become actionable goes
   as a `draft` epic with `low` priority. Don't create task children until
   the investigation concludes and the scope is concrete.
5. **Active milestones may supersede code state.** The AGENTS.md and ADRs
   describe the _current deployed_ architecture. An active milestone's body
   may contain design decisions that will change the code but haven't
   landed yet. Always check `beans list --json --ready` for in-flight work
   before assuming the docs reflect reality.
