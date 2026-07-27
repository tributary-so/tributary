# Composable Recipes — `@tributary-so/forward-builders`

How to build composable policies that **pull a token, swap it through a pinned
DEX pool, and deliver the output** — the auto-topup / auto-conversion pattern.
This reference documents the recipe layer (ADR-0030, ADR-0033) and the concrete
`ForwardBuilder` implementations, with examples lifted from
`tests/topup-balance*`.

> **Naming:** the codebase calls these *recipes* (`composablePolicyRecipe`,
> `createSwapWhenBalanceLow`, ADR-0033 "validation recipe layer"). "Receipts"
> and "recipes" are the same thing here.

---

## 1. Mental model — three tiers

Creating + firing a swap-forward composable is a **setup** half and a **fire**
half, split across three tiers. Each tier is independent — swap a tier-2
validation recipe without touching the tier-1 forward builder.

| Tier | What | Where | Setup or fire |
| ---- | ---- | ----- | ------------- |
| **1 — Forward builder** | The DEX swap instruction producer + its on-chain `ForwardConfig` constraint | `@tributary-so/forward-builders` | both (config = setup, builder = fire) |
| **2 — Validation recipe** | `{ spec, init }` pair for a pre/post Lighthouse assertion | `@tributary-so/sdk` | setup |
| **3 — Policy recipe + fire helper** | `composablePolicyRecipe` (setup bundle + enforcement) and `buildComposableExecutionPayload` (fire orchestrator) | `@tributary-so/sdk` | both |

The **named recipes** (`createSwapWhenBalanceLow` per DEX) compose all three
tiers into one call so an integrator provides only accounts + programId. For
the long tail (custom validation, a DEX without a named recipe), compose the
tiers manually — every seam stays open.

```
                 ┌─ tier 1 ─┐   ┌─ tier 2 ──────────┐   ┌─ tier 3 ──────────────────────┐
  create time →  │ *Forward │ + │ validation recipe │ → │ composablePolicyRecipe        │ → createComposablePolicy
                 │ Config   │   │ (balanceCheck…)   │   │  (bundles + enforcement)      │
                 └──────────┘   └───────────────────┘   └───────────────────────────────┘
                 ┌─ tier 1 ─┐                           ┌─ tier 3 ──────────────────────┐
   fire time  →  │ Forward  │ ──────────────────────── → │ buildComposableExecution     │ → executeComposable
                 │ Builder  │                           │   Payload (orchestrator)      │
                 └──────────┘                           └───────────────────────────────┘
```

---

## 2. Supported forward programs

All four are live in the on-chain `ALLOWED_FORWARD_PROGRAMS`
(`programs/tributary/src/constants.rs`):

| Program | Program ID | Swap ix | Pinned accounts | Named recipe |
| ------- | ---------- | ------- | --------------- | ------------ |
| Meteora DLMM | `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` | `swap2` | pool @ index 0 | `createSwapWhenBalanceLow` |
| Raydium CPMM | `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` | `swap_base_input` | pool @ idx 3, ammConfig @ idx 2 | `createRaydiumCpmmSwapWhenBalanceLow` |
| Raydium CLMM | `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` | `swap_v2` | pool @ idx 2, ammConfig @ idx 1 | `createRaydiumClmmSwapWhenBalanceLow` |
| Orca Whirlpool | `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` | `swap_v2` | pool @ idx 4 | _(none — compose manually, §8)_ |

> AGENTS.md and ADR-0032 only document Meteora + Raydium CPMM — they predate
> CLMM (bean `tributary-gfi8`) and Whirlpool. **Code is authority on state**;
> all four are allowlisted on-chain.

---

## 3. The `ForwardBuilder` contract

The SDK owns the interface; concrete impls live in `forward-builders` so the
SDK's dependency surface stays at zero swap-DEX crates (ADR-0030 §2).

```typescript
// packages/sdk/src/composable.ts
interface ForwardBuilder {
  build(ctx: {
    connection: Connection;
    policy: ComposablePolicy;
    composablePolicyPda: PublicKey;
    face: BN;                       // amount the forward consumes
  }): Promise<{
    instructionData: Buffer;        // raw swap selector + args
    forwardAccounts: { pubkey: PublicKey; isWritable: boolean }[];  // NO isSigner
  }>;
}
```

**Security shape (ADR-0008, ADR-0030 §3):** `forwardAccounts` has **no
`isSigner` field** — a builder cannot leak signer authority because the type
does not carry it. The SDK assembler
(`assembleComposableRemainingAccounts`) stamps `isSigner: false` on every
account, centralizing the CPI signer-sanitization chokepoint. Per-account
`isWritable` is preserved from the DEX's own account list (tighter + more
honest than a blanket `true`).

---

## 4. Tier 1 — paired config + builder (per DEX)

Each DEX file co-locates the **setup-time constraint** (`*ForwardConfig`) and
the **fire-time builder** (`create*Forward`) so they cannot drift — the
`programId`, pinned pool, and swap selector the builder emits are exactly the
fields the constraint pins on-chain (ADR-0030).

### Meteora DLMM

```typescript
import { createMeteoraDlmmForward, meteoraDlmmForwardConfig } from "@tributary-so/forward-builders";

// setup: pins programId, pool @ pinnedAccounts[0], swap2 discriminator
const forwardConfig = meteoraDlmmForwardConfig({
  inputMint: USDC, outputMint: WSOL, pool: DLMM_POOL,
  unwrapNativeSol: false,        // bit 0 of forward_flags → WSOL→SOL unwrap at settle
});

// fire: resolves the swap quote at execution time
const forwardBuilder = createMeteoraDlmmForward({
  pool: DLMM_POOL,
  slippageBps: 100,               // 1%
  applyHostFeeInFix: true,        // rewrite host-fee SystemProgram → DLMM program (legacy quirk)
});
```

### Raydium CPMM / CLMM

Both need a second pinned account (`ammConfig` = the fee tier):

```typescript
import { createRaydiumCpmmForward, raydiumCpmmForwardConfig } from "@tributary-so/forward-builders";

const forwardConfig = raydiumCpmmForwardConfig({
  inputMint: USDC, outputMint: WSOL, pool: CPMM_POOL, ammConfig: AMM_CONFIG,
});
const forwardBuilder = createRaydiumCpmmForward({
  pool: CPMM_POOL, ammConfig: AMM_CONFIG, slippageBps: 100,
  minimumAmountOut: undefined,    // explicit min-out override (optional)
});
```

CLMM is the same shape with `createRaydiumClmmForward` / `raydiumClmmForwardConfig`.

### Orca Whirlpool

```typescript
import { createWhirlpoolForward, whirlpoolForwardConfig } from "@tributary-so/forward-builders";

// async: fetches the pool account to derive aToB + validate complementary mint
const forwardConfig = await whirlpoolForwardConfig(connection, {
  inputMint: USDC, outputMint: WSOL, pool: WHIRLPOOL,
});
const forwardBuilder = createWhirlpoolForward({ pool: WHIRLPOOL, slippageBps: 100 });
```

The Whirlpool config pins **three** data checks (discriminator +
`amountSpecifiedIsInput = true` + `aToB` direction) — the tightest constraint
of the four.

---

## 5. Tier 2 — validation recipes (`@tributary-so/sdk`)

Pure functions returning `{ spec: ValidationSpec, init: ValidationInit }` —
exactly what `createComposablePolicy`'s pre/post slots consume. No I/O.

```typescript
import {
  balanceCheck,                        // generic: assert any token account's amount
  recipientOutputBalanceCheck,         // site: derives recipient's output ATA
  intermediateOutputBalanceCheck,      // site: intermediate-output ATA (PDA-owned)
  intermediateInputBalanceCheck,       // site: intermediate-input ATA (PDA-owned)
  lighthouseValidation,                // bridge any built LighthouseAssertion (escape hatch)
} from "@tributary-so/sdk";
```

- `balanceCheck({ target, threshold, op })` wraps
  `lighthouse.tokenAccount(target).amount(threshold, op).build()`.
- Site variants fold in the right ATA derivation
  (`getAssociatedTokenAddressSync`), baking in `allowOwnerOffCurve: true` for
  the PDA-owned intermediate ATAs — removes the most common bug class
  (wrong ATA owner flag). Every site variant delegates to `balanceCheck`, so
  assertion semantics live in one place.
- `lighthouseValidation(guard)` is the **escape hatch** for assertions not yet
  recipe'd (pool price, Pyth oracle, account delta): build via the `lighthouse`
  facade, pass it in.

`op` accepts the `IntegerOperator` enum or a string (`"<"`, `">="`, `"!="`, …).

---

## 6. Tier 3 — policy recipe + fire helper

### Setup: `composablePolicyRecipe`

Takes a forward config + optional tier-2 recipe outputs and produces the
complete `createComposablePolicy` argument bundle, applying the **enforcement
posture** (§11). Missing pre/post slots are filled with a disabled spec +
empty init.

```typescript
import { composablePolicyRecipe } from "@tributary-so/sdk";

const recipe = composablePolicyRecipe({
  forwardConfig,
  pre: recipientOutputBalanceCheck({ recipient, outputMint: WSOL, threshold: 50_000_000, op: "<" }),
  post: undefined,                 // optional floor on swapped output
  allowUnsafeActMode: false,      // escape hatch for act-mode-no-post (§11)
});
// → { forwardConfig, preValidation, preValidationInit, postValidation, postValidationInit }
```

### Fire: `buildComposableExecutionPayload`

The straight-line orchestrator (ADR-0030 §1, amended). Composes
`isForwardEnabled` → `ForwardBuilder.build` → `resolveValidationTargets`
(pre/post, parallel) → `assembleComposableRemainingAccounts` into
`{ instructionData, remainingAccounts }`. **Does not** derive `face` (caller
resolves) and **does not** append the scheduler fee ATA (the SDK
`executeComposable` facade owns that).

```typescript
import { buildComposableExecutionPayload } from "@tributary-so/sdk";

const { instructionData, remainingAccounts } = await buildComposableExecutionPayload({
  connection, policy, composablePolicyPda, programId, forwardBuilder, face,
});
```

Throws if forward is enabled but no `forwardBuilder` is supplied — the
orchestrator cannot synthesize a swap instruction.

---

## 7. Named recipes — `createSwapWhenBalanceLow`

The canonical auto-topup, one call per DEX. Pulls `inputMint` from the user,
swaps for `outputMint` via the pinned pool, delivers to `recipient` — **but
only when the recipient's output ATA balance satisfies `threshold op`** (the
"balance low" trigger). Returns `{ create, forwardBuilder }`.

```typescript
import { createSwapWhenBalanceLow } from "@tributary-so/forward-builders";           // Meteora DLMM
import { createRaydiumCpmmSwapWhenBalanceLow } from "@tributary-so/forward-builders"; // Raydium CPMM
import { createRaydiumClmmSwapWhenBalanceLow } from "@tributary-so/forward-builders"; // Raydium CLMM

const { create, forwardBuilder } = createSwapWhenBalanceLow({
  // ── policy identity ──
  policyType: { payAsYouGo: { maxAmountPerPeriod, maxChunkAmount, periodLengthSeconds,
                              currentPeriodStart, currentPeriodTotal, expiryDate: null, padding: [...] } },
  memo: "hot wallet WSOL topup",
  recipient: hotWallet,
  // ── forward (tier 1) ──
  inputMint: USDC, outputMint: WSOL,
  pool: DLMM_POOL,                 // + ammConfig for CPMM/CLMM
  slippageBps: 100,
  applyHostFeeInFix: true,         // Meteora-only
  // ── validation (tier 2) ──
  threshold: 50_000_000,           // fire only when recipient WSOL balance < this
  op: "<",
  post: undefined,                 // optional floor recipe
  allowUnsafeActMode: false,
});
```

`create` is the full `getCreateComposablePolicyInstruction` argument bundle
(`policyType`, `memo`, `recipient`, `forwardConfig`, pre/post spec+init).
`forwardBuilder` is the fire-time swap builder.

---

## 8. End-to-end — Meteora DLMM auto-topup (named recipe)

From `tests/topup-balance-swap-meteora.test.ts` (USDC → WSOL). The named recipe
collapses setup to one call.

```typescript
import { getComposablePolicyPda, getPreValidationPda, getPostValidationPda,
         buildComposableExecutionPayload, encodeMemo,
         type ComposablePolicy, type ForwardBuilder } from "@tributary-so/sdk";
import { createSwapWhenBalanceLow } from "@tributary-so/forward-builders";
import { METEORA_DLMM_PUBKEY, METEORA_DLMM_SOL_USDC_POOL, LIGHTHOUSE_PUBKEY } from "./constants";

// ── setup ──
const composablePolicyPDA = getComposablePolicyPda(userPaymentPDA, composablePolicyId, programId).address;
const preValidationPDA  = getPreValidationPda(composablePolicyPDA, programId).address;
const postValidationPDA = getPostValidationPda(composablePolicyPDA, programId).address;

const policyType = { payAsYouGo: {
  maxAmountPerPeriod: new BN(SWAP_INPUT_AMOUNT), maxChunkAmount: new BN(SWAP_INPUT_AMOUNT),
  periodLengthSeconds: new BN(30 * 24 * 3600), currentPeriodStart: new BN(now),
  currentPeriodTotal: new BN(0), expiryDate: null, padding: new Array(79).fill(0),
}};

const recipe = createSwapWhenBalanceLow({
  policyType, memo: "Topup WSOL swap",
  recipient: hotWallet, inputMint: USDC, outputMint: NATIVE_MINT,
  pool: METEORA_DLMM_SOL_USDC_POOL, slippageBps: 100, applyHostFeeInFix: true,
  threshold: 1_000_000_000, op: "<",
});
const { forwardBuilder } = recipe;

const ix = await program.methods
  .createComposablePolicy(
    recipe.create.policyType, encodeMemo(recipe.create.memo, 32),
    recipe.create.forwardConfig,
    recipe.create.preValidation, recipe.create.preValidationInit,
    recipe.create.postValidation, recipe.create.postValidationInit,
  )
  .accountsStrict({
    feePayer: hotWallet, recipient: hotWallet, user: coldWallet,
    composablePolicy: composablePolicyPDA, userPayment: userPaymentPDA,
    gateway: gatewayPDA, config: configPDA,
    preValidationPda: preValidationPDA, postValidationPda: postValidationPDA,
    preValidationProgram: LIGHTHOUSE_PUBKEY, postValidationProgram: SystemProgram.programId,
    inputMint: USDC, outputMint: NATIVE_MINT, systemProgram: SystemProgram.programId,
  })
  .instruction();

// ── fire ──
const intermediateInputTokenAccount  = getAssociatedTokenAddressSync(USDC, composablePolicyPDA, true, TOKEN_PROGRAM_ID);
const intermediateOutputTokenAccount = getAssociatedTokenAddressSync(NATIVE_MINT, composablePolicyPDA, true, TOKEN_PROGRAM_ID);

const face = new BN(SWAP_INPUT_AMOUNT);
const policy = (await program.account.composablePolicy.fetch(composablePolicyPDA)) as unknown as ComposablePolicy;

const { instructionData, remainingAccounts } = await buildComposableExecutionPayload({
  connection, policy, composablePolicyPda: composablePolicyPDA,
  programId: program.programId, forwardBuilder, face,
});

const execIx = await program.methods
  .executeComposable(instructionData, face)
  .accountsStrict({
    feePayer: coldWallet, paymentsDelegate: paymentsDelegatePDA,
    composablePolicy: composablePolicyPDA, userPayment: userPaymentPDA,
    gateway: gatewayPDA, config: configPDA,
    preValidationProgram: LIGHTHOUSE_PUBKEY, postValidationProgram: SystemProgram.programId,
    forwardProgram: METEORA_DLMM_PUBKEY,                        // ← the allowlisted program id
    preValidationPda: preValidationPDA, postValidationPda: postValidationPDA,
    userTokenAccount: coldWalletUsdcAta,
    mint: USDC, outputMint: NATIVE_MINT,
    intermediateInputTokenAccount, intermediateOutputTokenAccount,
    recipientTokenAccount: hotWalletWsolAta,
    gatewayFeeAccount: feeRecipientUsdcAta, protocolFeeAccount: adminUsdcAta,
    tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .remainingAccounts(remainingAccounts)
  .instruction();
```

**Settlement:** `policy.totalInput` increments by `face`; `totalOutput` by the
swapped amount (>0); `paymentCount` by 1; PayAsYouGo `currentPeriodTotal` by
`face`. A second execute within the same period fails (`PayAsYouGo period cap
exhausted`) — see `topup-balance-swap-meteora.test.ts` test 3.

---

## 9. End-to-end — Orca Whirlpool (manual composition)

Whirlpool ships **no named recipe** — compose the three tiers by hand. This is
the template for any DEX or custom validation not yet recipe'd. From
`tests/topup-balance-swap-whirlpool.test.ts`:

```typescript
import { composablePolicyRecipe, recipientOutputBalanceCheck,
         buildComposableExecutionPayload, type ForwardBuilder } from "@tributary-so/sdk";
import { createWhirlpoolForward, whirlpoolForwardConfig } from "@tributary-so/forward-builders";
import { WHIRLPOOL_PUBKEY, WHIRLPOOL_USDC_WSOL_POOL, LIGHTHOUSE_PUBKEY } from "./constants";

// tier 1 — async config (fetches pool to derive aToB)
const forwardConfig = await whirlpoolForwardConfig(connection, {
  inputMint: USDC, outputMint: NATIVE_MINT, pool: WHIRLPOOL_USDC_WSOL_POOL,
});

// tier 2 — balance-low trigger
const pre = recipientOutputBalanceCheck({
  recipient: hotWallet, outputMint: NATIVE_MINT, threshold: 1_000_000_000, op: "<",
});

// tier 3 — bundle + enforcement
const recipe = composablePolicyRecipe({ forwardConfig, pre });

// tier 1 — fire builder
const forwardBuilder: ForwardBuilder = createWhirlpoolForward({
  pool: WHIRLPOOL_USDC_WSOL_POOL, slippageBps: 100,
});

// create + fire as in §8, with forwardProgram: WHIRLPOOL_PUBKEY in accountsStrict.
```

The Raydium CLMM/CPMM swap tests (`topup-balance-swap-raydium.test.ts`) follow
the **named recipe** path instead (`createRaydiumClmmSwapWhenBalanceLow`) —
identical to §8 with `RAYDIUM_CLMM_PUBKEY` and the extra `ammConfig` pin.

---

## 10. Same-mint topup (no forward) — the simplest case

When `inputMint == outputMint` and forward is disabled
(`instructionConstraint.programId == PublicKey.default`), there is **no swap**:
the pull funds the intermediate input ATA and it is swept directly to the
recipient. No forward program, no forward accounts, empty `instructionData`.

```typescript
const forwardConfig = {
  inputMint: USDC, outputMint: USDC, forwardFlags: 0,
  instructionConstraint: { programId: PublicKey.default, /* zeroed checks/pins */ },
};
// intermediateInputTokenAccount == intermediateOutputTokenAccount (same mint, same PDA owner)
// buildComposableExecutionPayload with forwardBuilder omitted → instructionData = Buffer.alloc(0), forwardAccounts = []
```

Source: `tests/topup-balance.test.ts`. Allowing `tokenProgram` as the forward
target instead of the sentinel would be a **drain vector** (the forward
AccountMeta list's `to` account is not validated), which is why the sentinel
exists — see the test's header comment.

---

## 11. Enforcement posture (`composablePolicyRecipe`)

The recipe derives the settlement shape from the forward config and applies
ADR-0026 / ADR-0031 posture at **SDK setup time** (the program cannot enforce
act-mode delivery — the target is external/unobservable):

| Combo | Behavior |
| ----- | -------- |
| act mode (`outputMint = default`) + forward + no post | **THROW** (`allowUnsafeActMode: true` to override) |
| deliver-transform (`outputMint ≠ inputMint`) + no post | warn (redundant — program guards `>0`) |
| deliver-no-transform + no post | silent (program sweeps `face`) |
| any forward + no pre | warn (economic gap, not security) |

**Why throw on act-mode-no-post:** zero on-chain backstop. The recipe is the
one place a footgun with no program protection can be caught; the escape hatch
preserves legitimate knowingly-unobservable-delivery use cases. Integrators
calling `createComposablePolicy` primitives directly (bypassing the recipe)
fall under ADR-0031's own-your-own-safety guidance.

---

## 12. `face` resolution

`face` is the amount the forward consumes. The orchestrator does **not** derive
it — the caller resolves it:

- **PayAsYouGo:** `resolveDefaultForwardAmount(policy, gateway)` returns
  `grossCapToFace(maxChunkAmount, feeBps)` capped by the remaining per-period
  allowance. NET-on-pull (ADR-0026): the program pulls `gross = face + fee`,
  then skims the fee in the input mint, so `face = floor(grossCap × 10000 / (10000 + feeBps))`.
- **Subscription / Milestone / OneTime:** the program derives the amount from
  the policy — pass it through.
- **UpTo:** caller supplies the actual amount at execute time.
- **Tests:** pass a fixed `new BN(SWAP_INPUT_AMOUNT)` directly for determinism.

```typescript
import { resolveDefaultForwardAmount } from "@tributary-so/sdk";
const face = resolveDefaultForwardAmount(policy, gateway) ?? new BN(amount);
```

---

## 13. Dispatch helper — `getForwardBuilderFor`

Reads `policy.forwardConfig.instructionConstraint.programId` and returns the
matching builder. The pool is always `pinnedAccounts[0]`; CPMM/CLMM also read
`ammConfig` from `pinnedAccounts[1]`.

```typescript
import { getForwardBuilderFor } from "@tributary-so/forward-builders";

const forwardBuilder = getForwardBuilderFor(policy, {
  slippageBps: 100,
  applyHostFeeInFix: true,   // Meteora-only; ignored by other builders
});
// throws if programId is not one of the four allowlisted programs
```

Use this when the DEX is chosen at runtime (e.g. a scheduler serving many
policies) rather than hardcoded at integration time.

---

## 14. Install / peer dependencies

`@tributary-so/forward-builders` declares each swap-DEX SDK as an **optional
peer dependency** — install only the one(s) you import:

```bash
pnpm add @tributary-so/forward-builders @meteora-ag/dlmm          # Meteora DLMM
pnpm add @tributary-so/forward-builders @raydium-io/raydium-sdk-v2 # CPMM + CLMM (same SDK)
pnpm add @tributary-so/forward-builders @orca-so/whirlpools        # Whirlpool (+ @solana/kit)
```

The tsup bundle externalizes all four — your app bundles only what you import.
(CHANGELOG "Unreleased": dlmm + raydium-sdk-v2 moved from deps to optional
peers.)

---

## 15. Pointers

- **ADRs:** [0030](../../../apps/docs/adr/0030-composable-execution-primitives.md)
  (ForwardBuilder interface + primitives), [0033](../../../apps/docs/adr/0033-validation-recipe-layer.md)
  (three-tier recipe layer), [0008](../../../apps/docs/adr/0008-composable-cpi-privilege-boundary.md)
  (signer sanitization), [0026](../../../apps/docs/adr/0026-composable-input-side-fees-act-deliver-shapes.md)
  (settlement shapes), [0031](../../../apps/docs/adr/0031-settlement-output-post-validation-posture.md)
  (post-validation posture).
- **Source:** `packages/forward-builders/src/{meteora-dlmm,raydium-cpmm,raydium-clmm,whirlpool,dispatch,constants}.ts`;
  `packages/sdk/src/{composable,composable-recipes,validation-recipes}.ts`.
- **Tests (working examples):** `tests/topup-balance.test.ts` (same-mint),
  `tests/topup-balance-swap-meteora.test.ts` (DLMM named recipe),
  `tests/topup-balance-swap-raydium.test.ts` (CLMM named recipe),
  `tests/topup-balance-swap-whirlpool.test.ts` (manual composition),
  `tests/topup-balance-sol.test.ts` (native SOL unwrap).
