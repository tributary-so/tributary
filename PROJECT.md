# Tributary — Project Summary

## Overview

Tributary is a single rule-based money-moving primitive on Solana. A user
delegates spending authority once; money then moves itself within rules the
user defined — a trigger condition, a value to pull, a destination to route
to. Non-custodial, permissionless, composable.

Tributary is **one thing**, not a portfolio of products. Everything below is
an aspect of the same primitive, captured by the motif:

> **If This Then Money.**

- **v1 (live on mainnet)** — the PULL axis is live. WHEN is schedule-only,
  ROUTE is wallet-only. This is what the market calls "recurring payments" —
  the minimal live configuration of the primitive, already proven in
  production (4,000+ pulls across six teams).
- **v2 (in development)** — WHEN and ROUTE open up. A pull may be gated by
  any allowlisted on-chain condition (Lighthouse assertions) and routed
  through any allowlisted program (Meteora DLMM swaps today, more tomorrow).
  Internal docs call this "composable"; it is the same primitive with two
  more knobs turned on.

**Program ID:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

## The Three Knobs

A fully-specified movement of money is one **WHEN × PULL × ROUTE**.

| Knob      | Meaning               | v1 (live)                      | v2 (composable)                                        |
| --------- | --------------------- | ------------------------------ | ------------------------------------------------------ |
| **WHEN**  | The trigger condition | Schedule only                  | Schedule, oracle, balance, governance...               |
| **PULL**  | The value transfer    | Fixed / variable / usage-based | Same, any token                                        |
| **ROUTE** | The destination       | Wallet                         | Wallet, DEX swap, LP, staking, any allowlisted program |

Recurring payments is not a separate product — it is the simplest live
configuration (WHEN=schedule, PULL=fixed, ROUTE=wallet). Open WHEN and ROUTE
and the _same_ primitive becomes the v2 composable layer.

## Core Technology

- **Primitive**: Rule-based pull payments using SPL token delegation
- **Network**: Native Solana — sub-cent fees, 400ms finality
- **Security**: Non-custodial — funds remain in user wallets until execution
- **UX**: One delegation; authorized gateways pull on schedule without further signatures
- **Composable**: Optional validation CPI (Lighthouse) + forward CPI (Meteora DLMM) between pull and settle
- **Program ID**: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`
- **Validation CPI**: Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`
- **Forward CPI**: Meteora DLMM `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`
- **Action Codes**: One-time wallet-less payment codes
- **x402**: HTTP 402 middleware for deferred micropayments

## Key Features

- **One primitive, three knobs** — WHEN / PULL / ROUTE compose into any rule-based payment
- **Two policy families** — `PaymentPolicy` (direct pull, v1) and `ComposablePolicy` (programmable pull, v2) sharing the same schedule engine, fee math, and `UserPayment` scope
- **Three schedule models** — Subscription, Milestone (escrow + release conditions), Pay-as-you-go (usage-based with period caps)
- **Composable hooks** — opt-in validation (Lighthouse on-chain assertions) and token-transform forwards (Meteora DLMM) inserted between pull and settle
- **Non-custodial** — funds stay in the user's wallet; only SPL delegation is used
- **Permissionless execution** — any authorized gateway signer can trigger a due payment
- **Fee architecture** — configurable protocol + gateway fees, net/gross modes, per-gateway custom fees, 3-tier referral reward pool
- **Emergency pause** — global kill switch on the `ProgramConfig` singleton
- **x402 / HTTP 402** middleware for deferred micropayments
- **Action Codes** — one-time wallet-less payment codes

## The Two Policy Families

Tributary exposes two policy namespaces that share the scheduling engine, the
`UserPayment` account, the `PaymentGateway`, and the fee-distribution logic.

```
                       ┌──────────────────────────────────────┐
                       │           UserPayment                │
                       │   ["user_payment", owner, mint]      │
                       │   created_policies_count ──┐         │
                       │   created_composable_count ┤         │
                       └────────────────────────────┼─────────┘
                                                   │
           ┌───────────────────────────────────────┴───────────────────────────┐
           │                                                                     │
   PaymentPolicy PDA                                          ComposablePolicy PDA
  ["payment_policy", user_payment, id]                   ["composable_policy", user_payment, id]
  id = created_policies_count                             id = created_composable_count
           │                                                               │
   execute_payment                                             execute_composable
   (single CPI: user → recipient)              ┌─────────────────────┴─────────────────────┐
                                                │                                             │
                                       Phase 1: PULL                                Phase 2/3 (optional)
                                       user_token ──► intermediate_input_ata       VALIDATE  +  FORWARD
                                                                                        (Lighthouse) (Meteora DLMM)
                                                                                              │
                                                                                     settle: recipient + fees
```

- **PaymentPolicy** — direct pull: program pulls tokens from the user's ATA
  straight to the recipient in a single CPI, with fees routed inline. This is
  the v1 minimal config (WHEN=schedule, ROUTE=wallet).
- **ComposablePolicy** — programmable pull: program pulls into a transient
  intermediate ATA owned by the ComposablePolicy PDA, optionally runs a
  read-only validation CPI, optionally runs a forward CPI (swap), then settles
  to the recipient. This is the v2 config (WHEN + ROUTE open).

> Policy IDs come from **independent** counters on `UserPayment`
> (`created_policies_count` vs `created_composable_count`). A regular policy
> #1 and a composable policy #1 can coexist on the same `UserPayment`.

## Smart Contract

Single Anchor program in `programs/tributary/` (Rust / Anchor `0.31.1`), exposing
21 instruction entrypoints across the two policy families plus gateway, user,
referral, and config management.

### Core accounts

| Account            | Seeds                                            | Purpose                                                                 |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `ProgramConfig`    | `["config"]`                                     | Singleton — protocol admin, protocol fee, emergency pause               |
| `PaymentGateway`   | `["gateway", authority]`                         | Per-authority gateway settings (fees, signer, flags, referral)          |
| `UserPayment`      | `["user_payment", owner, mint]`                  | Per user+mint; the **delegate** for token pulls; holds both counters    |
| `PaymentPolicy`    | `["payment_policy", user_payment, policy_id]`    | Direct pull-payment policy (Subscription / Milestone / PayAsYouGo)      |
| `ComposablePolicy` | `["composable_policy", user_payment, policy_id]` | Programmable pull-payment policy (validation + forward hooks)           |
| `ValidationPda`    | `["composable_validation", composable_policy]`   | Stores Lighthouse assertion data (≤ 1024 bytes)                         |
| `ReferralAccount`  | `["referral", gateway, referral_code]`           | 6-char referral code + chain relationships (gateway-scoped)             |
| `PaymentsDelegate` | `["payments"]`                                   | Legacy global delegate (deprecated — `UserPayment` PDA is the delegate) |

### Instructions

**PaymentPolicy (v1):** `initialize`, `create_user_payment`, `create_payment_gateway`,
`create_payment_policy`, `execute_payment`, `change_payment_policy_status`,
`delete_payment_policy`, `delete_user_payment`, `delete_payment_gateway`,
`change_gateway_signer`, `change_gateway_fee_recipient`, `change_gateway_fee_bps`,
`update_gateway_referral_settings`, `update_gateway_protocol_fee`,
`update_gateway_feature_flags`, `create_referral_account`, `transfer`.

**ComposablePolicy (v2):** `create_composable_policy`, `execute_composable`,
`delete_composable_policy`, `change_composable_status`.

## Schedule Models (PolicyType)

Both policy families reuse the same `PolicyType` enum — three variants, each
exactly **128 bytes** (fixed-size for account stability).

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PolicyType {
    Subscription {
        amount: u64,                         // payment per cycle
        auto_renew: bool,                    // continue past max_renewals?
        max_renewals: Option<u32>,           // ceiling (None = indefinite)
        payment_frequency: PaymentFrequency, // Daily/Weekly/Monthly/Quarterly/.../Custom(secs)
        next_payment_due: i64,               // gates execution
        padding: [u8; 97],
    },
    Milestone {
        milestone_amounts: [u64; 4],         // Amount for each milestone
        milestone_timestamps: [i64; 4],      // Absolute timestamps for each milestone
        current_milestone: u8,               // Which milestone is next (0-3)
        release_condition: u8,               // bitmap: bit0=due-date, bits1-3=signer
        total_milestones: u8,                // 1..=4
        escrow_amount: u64,                  // Total amount held in escrow
        padding: [u8; 53],
    },
    PayAsYouGo {
        max_amount_per_period: u64,          // Total amount allowed per period
        max_chunk_amount: u64,               // Max amount provider can claim in one go
        period_length_seconds: u64,          // Length of each period in seconds
        current_period_start: i64,           // When current period started (unix timestamp)
        current_period_total: u64,           // Amount claimed in current period so far (auto-resets)
        padding: [u8; 88],
    },
}
```

### 1. Subscription

Fixed recurring payments at regular intervals (Daily, Weekly, Monthly,
Quarterly, SemiAnnually, Annually, or `Custom(u64)` seconds), with optional
auto-renewal and maximum renewal limits. Execution is gated by
`next_payment_due`.

**Best for:** SaaS platforms, content memberships, recurring donations, API
access with fixed monthly fees, software licenses.

### 2. Milestone

Project-based compensation with up to 4 escrowed milestones. Each milestone
has an amount and a payable timestamp. Release is governed by a
`release_condition` bitmap:

| Bit | Mask     | Condition                   |
| --- | -------- | --------------------------- |
| 0   | `0b0001` | Milestone due-date reached  |
| 1   | `0b0010` | Gateway authority must sign |
| 2   | `0b0100` | Policy owner must sign      |
| 3   | `0b1000` | Recipient must sign         |

Bits 1–3 are mutually exclusive (only one signer-release mode at a time).

**Best for:** Freelance projects, software development contracts, consulting
engagements, content series, construction / engineering, R&D initiatives.

### 3. Pay-as-you-go

Usage-based billing: each execution claims up to `max_chunk_amount`, capped at
`max_amount_per_period` per `period_length_seconds`. The period resets
automatically. This is the **only** variant that accepts a caller-supplied
amount at execute time (`forward_amount` on the composable path).

**Best for:** AI agents / LLM providers, API services with variable
consumption, cloud resources, utility services (compute, storage, bandwidth),
pay-per-use applications.

## Payment Type Comparison

| Feature              | Subscription           | Milestone               | Pay-as-you-go    |
| -------------------- | ---------------------- | ----------------------- | ---------------- |
| **Payment Timing**   | Fixed schedule         | Event-based             | On-demand        |
| **Amount Structure** | Fixed recurring        | Variable per milestone  | Variable chunks  |
| **User Control**     | Setup once, automated  | Manual approval options | Period limits    |
| **Provider Control** | Limited (pause/resume) | Milestone execution     | Claim initiation |
| **Predictability**   | High                   | Medium                  | Low              |
| **Flexibility**      | Low                    | Medium                  | High             |
| **Setup Complexity** | Simple                 | Medium                  | Medium           |
| **Best For**         | Regular services       | Project work            | Variable usage   |

## Composable Policies (Validation + Forward)

A `ComposablePolicy` runs two **optional** hooks during execution, between the
pull and settlement. Both are opt-in via sentinels.

### Execution flow (3 phases)

```
execute_composable:
  ┌─ Phase 1: PULL ─────────────────────────────────────────────────┐
  │ UserPayment PDA signs:                                          │
  │   user_token_account ──► intermediate_input_ata                 │
  │ (intermediate ATAs owned by ComposablePolicy PDA — NOT the      │
  │  UserPayment PDA, decoupling intermediate authority from the    │
  │  user-source delegate)                                          │
  └─────────────────────────────────────────────────────────────────┘
  ┌─ Phase 2: VALIDATE (optional) ──────────────────────────────────┐
  │ CPI into validation_program (Lighthouse) with stored            │
  │ validation_data + declared read-accounts. Veto on assertion     │
  │ failure. Read-only — cannot move funds.                         │
  └─────────────────────────────────────────────────────────────────┘
  ┌─ Phase 3: FORWARD (optional) + SETTLE ──────────────────────────┐
  │ If forward enabled: CPI into target_program (Meteora DLMM) to   │
  │   swap intermediate_input ──► intermediate_output.              │
  │ ByteRangeCheck pins the forward instruction selector.           │
  │ Sweep intermediate_output ──► recipient + protocol + gateway.   │
  │ min_output_amount enforced on NET (post-fee) amount.            │
  │ If forward disabled (sentinel): sweep input directly to         │
  │   recipient + fees (same-mint topup pattern).                   │
  └─────────────────────────────────────────────────────────────────┘
```

### ForwardConfig

```rust
struct ForwardConfig {
    target_program: Pubkey,             // Pubkey::default() = disabled (sentinel)
    input_mint: Pubkey,                 // == user_payment.token_mint
    output_mint: Pubkey,                // recipient delivery mint
    min_output_amount: Option<u64>,     // NET (post-fee) minimum (DeFi convention)
    forward_flags: u8,
    num_data_checks: u8,
    data_checks: [ByteRangeCheck; 4],   // pin forward instruction discriminator
}
```

- `target_program` must be in `ALLOWED_FORWARD_PROGRAMS` (Meteora DLMM). `Pubkey::default()` disables the forward.
- When enabled, ≥1 `ByteRangeCheck` must pin the discriminator at offset 0 — prevents a gateway swapping in an arbitrary instruction.
- `min_output_amount` is checked against the **net** amount (after fees).

### ValidationConfig

```rust
struct ValidationConfig {
    validation_program: Pubkey,   // SystemProgram = disabled (sentinel)
    num_validation_accounts: u8,  // ≤ 10 read-accounts for the assertion
}
```

Assertion data (≤ 1024 bytes) lives in a separate `ValidationPda`
(`["composable_validation", composable_policy]`). At execute, the program CPIs
into the validation program passing this data + declared read-accounts as
`remaining_accounts`.

- `validation_program` must be in `ALLOWED_VALIDATION_PROGRAMS` (Lighthouse). `SystemProgram` disables validation.

### Building Lighthouse assertions (SDK facade)

The SDK ships a fluent `lighthouse` facade over the vendored
`packages/lighthouse` client. Never hand-roll the serialization.

```typescript
import { lighthouse, LIGHTHOUSE_PROGRAM_ID } from "@tributary-so/sdk";

// Assert hotWallet USDC balance < 50 USDC before topping up
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .build();

// guard.data        → Buffer  (stored in ValidationPda)
// guard.numAccounts → 1       (numValidationAccounts)
// guard.accounts    → [hotWalletUsdcAta]  (Lighthouse read-accounts)
```

Covers `tokenAccount`, `mintAccount`, `accountInfo`, `accountData`,
`accountDelta`, `sysvarClock`, `stakeAccount`, `merkleTree`, plus operator
sugar (`"<"`, `">="`, `"!="`, `"in"`, …).

### Allowlists (hard-coded in `constants.rs`)

| List                          | Programs                                                   |
| ----------------------------- | ---------------------------------------------------------- |
| `ALLOWED_FORWARD_PROGRAMS`    | Meteora DLMM `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` |
| `ALLOWED_VALIDATION_PROGRAMS` | Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`   |

Sentinels (`Pubkey::default()` / `SystemProgram`) disable the respective hook.

## Technical Architecture

```
User → createUserPayment(owner, mint)
     → createPaymentGateway(authority, feeBps, feeRecipient)
     → createPaymentPolicy / createComposablePolicy(user_payment, recipient, gateway, PolicyType)
     → approve UserPayment PDA as delegate on the user token account
     → executePayment / executeComposable (permissionless — any gateway signer)
        → PaymentPolicy:   single CPI user_token → recipient + fees
        → ComposablePolicy: pull → validate? → forward? → settle recipient + fees
```

## Fee Model

Fees are computed in `programs/tributary/src/shared/fees.rs`:

- **Protocol fee** — default `100 bps` (1%), stored on `ProgramConfig.protocol_fee_bps`.
- **Gateway fee** — configurable `gateway_fee_bps` (0..10000), stored per-gateway.
- **Custom protocol fee** — per-gateway override (bit 2 of `feature_flags`).
- **Combined guard** — `gateway_fee_bps + protocol_fee_bps < 10000` (recipient must receive > 0).

Two amount modes (`PaymentGateway.feature_flags` bit 1):

- **Gross (default)** — recipient = `payment_amount − gateway_fee − protocol_fee`.
- **Net** — recipient receives exactly `payment_amount`; fees are added on top and pulled from the user.

Math: `(amount * bps) / 10000` (rounds down; dust goes to protocol). On the
composable path, `min_output_amount` is checked against the **net** (post-fee) output.

## SDK & Integration

### Install

```bash
pnpm add @tributary-so/sdk
# optional companions:
pnpm add @tributary-so/sdk-react   # React hooks + buttons
pnpm add @tributary-so/sdk-x402    # HTTP 402 middleware
pnpm add @tributary-so/payments    # high-level payments client
```

### TypeScript SDK (`packages/sdk`)

Core protocol interaction library with Anchor integration — instruction
builders, PDA helpers, token utilities, and the Lighthouse assertion facade.

```typescript
import { Tributary, getPaymentFrequency, encodeMemo } from "@tributary-so/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const PROGRAM_ID = new PublicKey("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");
const sdk = new Tributary(PROGRAM_ID, connection);

// Full subscription setup: ATA + user payment + policy + delegate approval
const ixs = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN("1000000"), // 1 USDC (6 decimals)
  true, // auto-renew
  12, // max renewals
  getPaymentFrequency("monthly"),
  encodeMemo("Pro plan")
);

// Permissionless execution (called by gateway signer)
const execIx = await sdk.executePayment(paymentPolicyPda);
```

### Composable policy with a Lighthouse guard

```typescript
import { lighthouse, LIGHTHOUSE_PROGRAM_ID } from "@tributary-so/sdk";

const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .build();

const ix = await sdk.getCreateComposablePolicyInstruction(
  tokenMint,
  recipient,
  gateway,
  policyType,
  "Auto topup guard",
  forwardConfig, // targetProgram = PublicKey.default for no-swap topup
  LIGHTHOUSE_PROGRAM_ID, // SystemProgram = no validation
  guard.numAccounts,
  guard.data
);

const execIx = await sdk.executeComposable(
  composablePolicyPda,
  instructionData, // forward ix data (empty if disabled)
  forwardAmount ?? null,
  remainingAccounts // [ValidationPda, ...lighthouseTargets, ...forwardAccts]
);
```

### React SDK (`packages/sdk-react`)

Pre-built payment components:

```tsx
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";

<SubscriptionButton
  amount={new BN("10000000")} // 10 USDC
  token={USDC_MINT}
  recipient={recipientWallet}
  gateway={gatewayAddress}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Monthly donation"
  label="Subscribe for $10/month"
/>;
```

### CLI (`apps/cli`, binary `tributary`)

oclif CLI exposing topics for every program operation: `wallet`, `program`,
`user`, `gateway`, `subscription`, `payments`, `referral`, `pda`.

## x402 Integration

Tributary powers x402 (HTTP 402 Payment Required) implementation for web
micropayments. The x402 protocol represents a proposed HTTP status code for
"Payment Required" that enables seamless payment flows over HTTP without
breaking the request-response cycle. Unlike traditional payment walls that
return opaque errors, x402 servers provide structured payment quotes that
clients can fulfill with signed blockchain transactions.

**Core capabilities:**

- **x402 Protocol**: Standards-compliant HTTP 402 implementation with v2 header format
- **Deferred Payments**: Subscription-based model with one-time token delegation
- **Pay-as-you-go**: Per-request metering with period-based limits
- **JWT Access Tokens**: Seamless authenticated access after payment
- **Non-Custodial**: Full Web3 sovereignty maintained throughout

### Middleware

The `createX402Middleware()` function provides a complete Express.js
integration layer that handles the entire payment flow automatically. This
middleware intercepts incoming requests and determines whether payment is
required, processes valid payments, and grants access via JWT tokens for
returning users.

```typescript
import { createX402Middleware } from "@tributary-so/sdk-x402";

const middleware = createX402Middleware({
  scheme: "deferred",
  network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  amount: 100,
  recipient: process.env.RECIPIENT_WALLET!,
  gateway: process.env.GATEWAY!,
  tokenMint: process.env.TOKEN_MINT!,
  paymentFrequency: "monthly",
  jwtSecret: process.env.JWT_SECRET!,
  sdk,
  connection,
});

app.use("/api/premium", middleware);
```

**Payment handling flow:** For each incoming request the middleware (1) checks
for an existing JWT in the Authorization header and verifies the policy
on-chain; (2) checks for a `Payment` header containing a base64-encoded
transaction, simulates, submits, confirms, and issues a JWT; (3) if neither is
present, returns HTTP 402 with a `Payment-Required` header containing the
payment quote.

### Metering Utilities

The x402 SDK includes three specialized metering utilities for tracking
resource consumption in pay-as-you-go payment models:

- **`TokenMeter`** — token-count estimation for LLM workflows (`estimateFromText`, `fromOpenAI`, `estimateFromJSON`).
- **`ComputeMeter`** — compute-unit consumption per model (`calculateForLLM`, `calculateForEmbedding`, `calculateForFineTune`).
- **`UsageTracker`** — period-based aggregation with configurable limits (`trackUsage`, `getCurrentPeriod`, `checkQuota`).

The `createUsageTrackingMiddleware()` factory generates Express middleware that
automatically tracks request metrics (processing time, request count, data
transfer), with custom extractors for application-specific metrics like token
counts.

**Resource types supported:** API requests, input/output/total tokens, compute
units, processing time, bytes transferred, storage, GPU time, embedding
dimensions.

### v2 Header Specification

The x402 v2 implementation uses modern IETF-style headers instead of the
deprecated `X-*` prefix. `Payment-Required` communicates payment requirements
when access is denied, formatted as comma-separated key-value pairs. `Payment`
carries the client's payment payload (base64-encoded JSON with the transaction
data). `Payment-Response` confirms successful payment. All payloads require
explicit `x402Version` field (`2` for v2). The scheme field supports three
models: `deferred` (subscription), `x402://payg` (metered), `x402://prepaid`
(credit-based).

## Business Applications

Tributary's primitive supports diverse use cases across the WHEN/PULL/ROUTE
axes. The schedule models (Subscription / Milestone / Pay-as-you-go) cover the
PULL axis; the composable hooks open up WHEN (condition-gated) and ROUTE
(swap-routed) delivery.

### SaaS & Software

- **Subscription**: Monthly/annual software licenses
- **Pay-as-you-go**: API usage billing, compute costs
- **Milestone**: Custom development projects
- **Composable**: Auto-rebalance fees into a treasury token via forward swap

### Creator Economy

- **Subscription**: Content memberships, fan support
- **Milestone**: Series-based content creation
- **Pay-as-you-go**: Premium content access

### Professional Services

- **Subscription**: Retainer agreements, ongoing support
- **Milestone**: Project-based consulting, legal services
- **Pay-as-you-go**: Hourly billing, usage-based services

### DeFi & Web3

- **Subscription**: Protocol fees, strategy access
- **Milestone**: Grant disbursements, development milestones
- **Pay-as-you-go**: Transaction fees, gas optimization
- **Composable**: "If hot-wallet balance < threshold Then pull USDC and route WSOL to treasury" — same primitive, WHEN + ROUTE turned on

### AI & Machine Learning

- **Subscription**: Model access, API subscriptions
- **Milestone**: Training milestones, model development
- **Pay-as-you-go**: Token usage billing, compute time

## Business Model

- **Revenue**: 1% protocol fee on all payments (configurable per-gateway; volume-based discounts available)
- **Gateway fees**: Configurable bps set by each gateway authority (typical 2–3%), sent to the gateway fee recipient
- **Referral program**: Gateways opt into a 3-tier referral reward pool (up to 25% of the gateway fee carved into the pool, split across direct / level2 / level3)
- **Grants Program**: Ecosystem development fund

## Roadmap

Tributary matures along the three knobs, not along a feature checklist. Each
era turns on another axis of the same primitive.

### v1 — PULL axis (live on mainnet)

- Three schedule models (Subscription, Milestone, Pay-as-you-go) fully implemented and tested
- `PaymentPolicy` direct-pull execution in production (4,000+ pulls across six teams)
- Full SDK suite (TypeScript SDK, React SDK, x402 middleware, payments client, oclif CLI)
- API server + scheduler for gateway operators
- Devnet + mainnet deployment, verifiable builds

### v2 — WHEN + ROUTE axes (in development)

- `ComposablePolicy` programmable pull with validation + forward hooks
- Lighthouse validation CPI (condition-gated execution: balances, oracles, governance, custom assertions)
- Meteora DLMM forward CPI (swap-routed settlement: pull one token, deliver another)
- Permissionless composable execution via parameter-constrained relayers
- Per-policy scheduler trigger model (off-chain state-poll)

### Next — deeper ROUTE & WHEN (future)

- Additional allowlisted forward programs beyond Meteora DLMM
- Additional allowlisted validation programs beyond Lighthouse
- Revenue splitting (pull once, route to N recipients)
- Chained validation CPIs (multiple validators before forward)
- Cross-protocol integration (encrypted trigger prices, multi-hop routes)

> Architecture Decision Records (ADRs 0001–0016) in `apps/docs/adr/` capture
> the _why_ behind every locked-in decision. 0001–0006 are v1 PaymentPolicy
> era; 0007–0016 are v2 ComposablePolicy era. Code is the authority on current
> state; ADRs are the authority on rationale.

## Competitive Landscape

### Pull-payment protocols

| Solution   | Custody       | Schedule Models        | Composable (WHEN+ROUTE) | Solana Native | Status          |
| ---------- | ------------- | ---------------------- | ----------------------- | ------------- | --------------- |
| Tributary  | Non-custodial | 3 (Sub/Milestone/PAYG) | Yes (Lighthouse + DLMM) | Yes           | v1 live, v2 dev |
| Helio      | Custodial     | 1 (subscription only)  | No                      | Yes           | Custody risk    |
| Superfluid | Non-custodial | 1 (streaming)          | No                      | No            | Wrong chain     |
| Manual     | Manual        | Limited                | No                      | No            | Status quo      |

### Smart-wallet infrastructure (adjacent layer)

| Solution | Custody       | Key Strength                                            | Relation to Tributary                             |
| -------- | ------------- | ------------------------------------------------------- | ------------------------------------------------- |
| Squads   | Non-custodial | M-of-N multisig, $10B+ TVL, formally verified           | Complementary — team/DAO treasury mgmt            |
| LazorKit | Non-custodial | Passkey-native, gasless UX via Kora paymaster           | Complementary — consumer auth layer               |
| Swig     | Non-custodial | 65K roles, cross-chain identity, on-chain policy engine | Complementary — AI agent/developer access control |

These smart wallets solve _who can authorize_; Tributary solves _what gets
paid, when, and where it routes_. They compose naturally: Squads vault +
Tributary scheduling = DAO recurring payments; LazorKit passkey + Tributary =
gasless consumer subscriptions; Swig roles + Tributary pay-as-you-go = scoped
AI agent billing.

**Tributary advantage**: the only primitive that composes all three knobs
(WHEN / PULL / ROUTE) natively on Solana, non-custodially. Smart wallets lack
payment scheduling, milestone tracking, usage metering, validation/forward
hooks, and HTTP 402; Tributary lacks access control, gas abstraction, and
multi-party auth. The winning play is integration, not competition.

## Key Differentiators

1. **One primitive, three knobs** — WHEN / PULL / ROUTE compose into any rule-based payment, from "If Monday Then $10 to wallet" to "If oracle drifts 5% Then route to rebalance"
2. **Two policy families** — `PaymentPolicy` (direct pull, v1 live) and `ComposablePolicy` (validation + forward, v2) sharing one schedule engine
3. **Composable hooks** — opt-in Lighthouse validation + Meteora DLMM forward, hard-allowlisted, sentinel-disabled, with CPI signer sanitization
4. **Non-custodial** — funds remain in user wallets; only SPL delegation is used
5. **Permissionless execution** — any authorized gateway signer can trigger a due payment
6. **Multi-model scheduling** — Subscription, Milestone (4 escrowed milestones), Pay-as-you-go (period caps)
7. **Developer-first** — TypeScript SDK, React SDK, x402 middleware, payments client, oclif CLI, full docs + ADRs
8. **Security hardening** — CPI allowlists, signer sanitization, intermediate-ATA isolation, mint-compatibility blocklist (Token-2022), emergency pause, `security.txt`
9. **Speed + cost** — Solana's 400ms finality, sub-cent transactions
10. **Production-proven** — v1 live on mainnet with real pull volume

## Testing & Quality

- **Rust unit tests** — `cargo test`
- **Integration (PaymentPolicy)** — `anchor run test-integration` (Surfpool-backed)
- **Composable policies** — `anchor run test-composable` (Surfpool)
- **Surfpool topup (no swap)** — `anchor run test-topup`
- **Surfpool topup (with swap)** — `anchor run test-topup-swap`
- **Full suite** — `anchor test` (cargo + jest)
- **CI/CD** — GitHub Actions, change-detected, per-package semantic-release

See [`README.md`](./README.md) § Testing for the full matrix.

## Getting Started

- **Website**: [tributary.so](https://tributary.so)
- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **GitHub**: [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **SDK**: `pnpm add @tributary-so/sdk`
- **Action Codes**: [actioncode.app](https://actioncode.app) for wallet-less payments
- **Quickstart**: clone, `pnpm install`, `make prep`, `make build`, then `make run_surfpool` + `anchor test`

## Contact & Resources

- **Email**: <team@tributary.so>
- **Twitter**: [@tributary_so](https://twitter.com/tributary_so)
- **Security**: <security@tributary.so> (see [`SECURITY.md`](./SECURITY.md))
- **Audit findings**: [`reports/`](./reports/)
- **Contribute**: open source; see [`README.md`](./README.md) § Contributing
