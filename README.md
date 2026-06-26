# Tributary

Automated recurring payments on Solana using token delegation. Web2 subscription UX with Web3 transparency — non-custodial, permissionless, and composable.

[![CI](https://github.com/tributary-so/tributary/actions/workflows/main.yaml/badge.svg)](https://github.com/tributary-so/tributary/actions/workflows/main.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)](https://solana.com)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
  - [Monorepo Layout](#monorepo-layout)
  - [The Two Policy Families](#the-two-policy-families)
  - [PDAs (Program Derived Addresses)](#pdas-program-derived-addresses)
  - [Payment Types](#payment-types)
  - [Fee Model](#fee-model)
  - [Referral Program](#referral-program)
  - [Composable Policies (Validation + Forward)](#composable-policies-validation--forward)
  - [Gateway Feature Flags](#gateway-feature-flags)
- [Workspaces Reference](#workspaces-reference)
- [SDK Usage](#sdk-usage)
- [CLI Manager](#cli-manager)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Community & Support](#community--support)

---

## Overview

Tributary is a single Solana program that enables automated, pull-based
recurring payments using SPL token delegation. Users approve a delegate once;
authorized gateways then pull payments on schedule without further user
intervention — and without ever taking custody of the funds.

The protocol exposes two families of pull-payment policies that share the same
scheduling model but differ in execution semantics:

1. **PaymentPolicy** — direct pull payments (subscriptions, milestones,
   pay-as-you-go).
2. **ComposablePolicy** — programmable pull payments with optional validation
   (Lighthouse on-chain assertions) and token forwarding (Meteora DLMM swaps)
   inserted between the pull and the settlement.

Both reuse the same `PolicyType` enum, the same `UserPayment` account, the same
`PaymentGateway`, and the same fee-distribution logic.

**Program ID:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

## Key Features

- **Non-custodial** — funds stay in the user's wallet; the program only pulls via SPL delegation.
- **Permissionless execution** — any authorized gateway signer can trigger a due payment.
- **Three policy models** — Subscription, Milestone (escrow + release conditions), and Pay-as-you-go (usage-based with period caps).
- **Composable policies** — opt-in validation (Lighthouse assertions) and token-transform forwards (Meteora DLMM) during execution.
- **Fee architecture** — configurable protocol + gateway fees, net/gross modes, per-gateway custom fees, and a 3-tier referral reward pool.
- **Referral program** — 6-character codes scoped per gateway with a 3-level chain split.
- **Emergency pause** — global kill switch on the `ProgramConfig` singleton.
- **x402 / HTTP 402** middleware for deferred micropayments.
- **Action Codes** — one-time wallet-less payment codes.
- **Multi-app monorepo** — SDK, React SDK, payments client, oclif CLI, Express API, scheduler, checkout, and marketing site.

## Tech Stack

| Layer           | Technology                                                                          |
| --------------- | ----------------------------------------------------------------------------------- |
| Smart Contract  | Rust, Anchor `0.31.1`, `anchor-spl` (Token / Associated Token)                      |
| Blockchain      | Solana (cluster `2.2.11`), program ID `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ` |
| SDKs            | TypeScript, `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token`             |
| Frontend        | React 19, Vite 7, Tailwind 4, HeroUI, Wallet Adapter, TanStack Query, Jotai         |
| API Server      | Express 4, Drizzle ORM, PostgreSQL (`postgres`), Redis, Socket.io, KafkaJS          |
| Scheduler       | Node.js, `node-cron`, `commander`                                                   |
| CLI             | oclif 4                                                                             |
| Validation CPI  | Lighthouse (`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`)                          |
| Forward CPI     | Meteora DLMM (`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`)                        |
| Docs            | MkDocs Material (`uv` / Python)                                                     |
| Package Manager | pnpm workspaces (root `10.28.2`)                                                    |
| CI/CD           | GitHub Actions, semantic-release (per-package), ghcr.io Docker                      |
| Testing         | Jest, Anchor tests, Surfpool localnet                                               |

## Prerequisites

- **Node.js** 20.19+ or 22.12+
- **pnpm** 9.6.0+ (root uses `10.28.2` via `corepack`)
- **Rust** stable toolchain
- **Anchor** `0.31.0` (install via `avm`)
- **Solana CLI** `2.2.11`
- **Docker** (optional, for API / scheduler images and local DBs)
- **[Surfpool](https://surfpool.dev)** (required for integration tests)

> [!TIP] > `make prep` runs `avm use 0.31.0` to pin the Anchor version. Run it once before
> building or testing the program.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/tributary-so/tributary
cd tributary
```

### 2. Install Dependencies

The repo is a pnpm workspace (`apps/*`, `packages/*`, `tests`, `programs/tributary`).

```bash
corepack enable
pnpm install
```

### 3. Build the Workspace

Build the smart contract and all publishable packages:

```bash
# Build everything (contract + all packages + all apps + docs)
make build

# Or build individually:
anchor build                                    # Rust program -> target/deploy/tributary.so
pnpm --filter @tributary-so/sdk build           # Core SDK (tsup)
pnpm --filter @tributary-so/sdk-react build     # React SDK
pnpm --filter @tributary-so/sdk-x402 build      # x402 middleware
pnpm --filter @tributary-so/payments build      # Payments client
pnpm --filter @tributary-so/cli build           # oclif CLI
```

### 4. Environment Setup

There is no root `.env`. Each app has its own configuration:

| App              | Env file                     | Notes                         |
| ---------------- | ---------------------------- | ----------------------------- |
| `apps/api`       | `apps/api/.env.example`      | DB, Redis, RPC, Kafka         |
| `apps/scheduler` | (env vars / CLI flags)       | RPC, gateway keypair          |
| `apps/cli`       | `~/.config/solana/id.json`   | Uses Solana CLI config        |
| `apps/app`       | `apps/app/.env.example`      | Vite frontend vars (`VITE_*`) |
| `apps/checkout`  | `apps/checkout/.env.example` | Checkout page frontend vars   |

Copy the relevant example and fill it in:

```bash
cp apps/api/.env.example apps/api/.env
```

### 5. Run Tests

Integration tests run against Surfpool (a local Solana fork). Start it in one
terminal:

```bash
make run_surfpool
# → surfpool start --legacy-anchor-compatibility --watch
```

Then run the test suites:

```bash
anchor test          # runs cargo tests + integration + composable jest suites
# or individually:
make test_surfpool   # surfpool + topup suites
```

See [Testing](#testing) for the full matrix.

### 6. Start a Frontend Dev Server

```bash
# Main app (React + Vite) — http://localhost:5173
pnpm --filter @tributary-so/app dev

# Landing page — http://localhost:5174
pnpm --filter ./apps/landing dev

# Checkout page
pnpm --filter ./apps/checkout dev

# API server (Express) — http://localhost:3000
pnpm --filter @tributary-so/api dev

# Scheduler (cron worker)
pnpm --filter @tributary-so/scheduler dev
```

### 7. Run the Docs Locally

```bash
cd apps/docs
make serve   # or: uv run mkdocs serve
```

Open [http://localhost:8000](http://localhost:8000).

---

## Architecture

### Monorepo Layout

```
├── programs/tributary/        # Solana program (Rust / Anchor 0.31.1)
│   └── src/
│       ├── lib.rs             # 21 instruction entrypoints + security.txt
│       ├── constants.rs       # PDA seeds, allowlisted CPI programs
│       ├── error.rs           # TributaryError enum
│       ├── state/             # Account structs (ProgramConfig, PaymentGateway,
│       │                      #   UserPayment, PaymentPolicy, ComposablePolicy,
│       │                      #   ValidationPda, ReferralAccount, ...)
│       ├── instructions/      # composable/, gateway/, payment/, referral/, user/
│       ├── policies/          # Strategy trait + Subscription/Milestone/PayAsYouGo
│       ├── shared/            # fees, delegation, mint, validation, referral, schedule
│       └── utils.rs
├── packages/
│   ├── sdk/                   # @tributary-so/sdk — core TS SDK (tsup)
│   │   └── src/
│   │       ├── sdk.ts         # Tributary class — all instruction builders
│   │       ├── lighthouse.ts  # Fluent assertion facade (Lighthouse wrapper)
│   │       ├── pda.ts         # PDA derivation helpers
│   │       ├── token.ts       # SPL token utilities
│   │       ├── constants.ts   # PROTOCOL_FEE_BPS, SEEDS, GATEWAY_FEATURES
│   │       ├── types.ts       # Shared TS types
│   │       └── utils.ts
│   ├── sdk-react/             # @tributary-so/sdk-react — hooks + UI components
│   ├── sdk-x402/              # @tributary-so/sdk-x402 — HTTP 402 Express middleware
│   ├── payments/              # @tributary-so/payments — high-level payments client (JWT)
│   └── lighthouse/            # lighthouse-sdk-legacy (vendored, private) — assertion client
├── apps/
│   ├── app/                   # @tributary-so/app — React 19 dashboard
│   ├── checkout/              # Checkout page (pay-page.tsx)
│   ├── landing/               # Marketing site (React + Vite)
│   ├── lando/                 # Lando page
│   ├── api/                   # @tributary-so/api — Express + Drizzle + Postgres
│   │   └── src/{routes,services,middleware,db,types}
│   ├── scheduler/             # @tributary-so/scheduler — node-cron executor
│   ├── cli/                   # @tributary-so/cli — oclif CLI (wallet/gateway/subscription/...)
│   ├── example-payments/      # Integration examples
│   └── docs/                  # MkDocs Material site (uv / Python)
│       └── adr/               # Architecture Decision Records (0001-0013)
├── tests/                     # Jest integration suite (Surfpool-backed)
├── specs/                     # Feature specifications
├── branding/                  # Brand assets
├── reports/                   # Audit / security finding write-ups
├── CONTEXT.md                 # Domain glossary / ubiquitous language
└── .github/workflows/         # CI pipelines
```

> **Orientation for new contributors:** [`CONTEXT.md`](./CONTEXT.md) defines
> the ubiquitous language (read it first). [`apps/docs/adr/`](./apps/docs/adr/)
> captures the _why_ behind every locked-in architectural decision — 0001-0006
> are v1 PaymentPolicy era, 0007-0013 are v2 ComposablePolicy era. Code is the
> authority on current state; ADRs are the authority on rationale.

### The Two Policy Families

Tributary exposes two policy namespaces that share the scheduling engine:

```
                       ┌──────────────────────────────────────┐
                       │           UserPayment                │
                       │   ["user_payment", owner, mint]      │
                       │   created_policies_count ──┐         │
                       │   created_composable_count ┤         │
                       └────────────────────────────┼─────────┘
                                                    │
                ┌───────────────────────────────────┴───────────────────────────────────┐
                │                                                                             │
        PaymentPolicy PDA                                              ComposablePolicy PDA
   ["payment_policy", user_payment, id]                         ["composable_policy", user_payment, id]
   id = created_policies_count                                   id = created_composable_count
                │                                                             │
        execute_payment                                               execute_composable
        (single CPI: user → recipient)                  ┌─────────────────────┴─────────────────────┐
                                                       │                                             │
                                              Phase 1: PULL                              Phase 2/3 (optional)
                                              user_token ──► intermediate_input_ata       VALIDATE  +  FORWARD
                                                                                             (Lighthouse) (Meteora DLMM)
                                                                                                   │
                                                                                          settle: recipient + fees
```

> [!IMPORTANT] > `PaymentPolicy` IDs and `ComposablePolicy` IDs come from **independent**
> counters on `UserPayment` (`created_policies_count` vs
> `created_composable_count`). A regular policy #1 and a composable policy #1
> can coexist on the same `UserPayment`.

### PDAs (Program Derived Addresses)

| PDA                | Seeds                                            | Purpose                                                                 |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `ProgramConfig`    | `["config"]`                                     | Singleton — protocol admin, protocol fee, emergency pause               |
| `PaymentGateway`   | `["gateway", authority]`                         | Per-authority gateway settings (fees, signer, flags, referral config)   |
| `UserPayment`      | `["user_payment", owner, mint]`                  | Per user+mint; the **delegate** for token pulls; holds both counters    |
| `PaymentPolicy`    | `["payment_policy", user_payment, policy_id]`    | Regular pull-payment policy (Subscription / Milestone / PayAsYouGo)     |
| `ComposablePolicy` | `["composable_policy", user_payment, policy_id]` | Programmable pull-payment policy (validation + forward hooks)           |
| `ValidationPda`    | `["composable_validation", composable_policy]`   | Stores Lighthouse assertion data (≤ 1024 bytes)                         |
| `ReferralAccount`  | `["referral", gateway, referral_code]`           | 6-char referral code + chain relationships (gateway-scoped)             |
| `PaymentsDelegate` | `["payments"]`                                   | Legacy global delegate (deprecated — `UserPayment` PDA is the delegate) |

### Payment Types

All three variants are part of a single `PolicyType` enum and are **exactly 128
bytes each** (fixed-size for account stability). Both `PaymentPolicy` and
`ComposablePolicy` reuse this enum.

#### Subscription

Fixed recurring payments at regular intervals.

```rust
PolicyType::Subscription {
    amount: u64,                         // payment per cycle
    auto_renew: bool,                    // continue past max_renewals?
    max_renewals: Option<u32>,           // ceiling (None = indefinite)
    payment_frequency: PaymentFrequency, // Daily/Weekly/Monthly/Quarterly/.../Custom(secs)
    next_payment_due: i64,               // gates execution
    padding: [u8; 97],
}
```

`PaymentFrequency` supports `Daily`, `Weekly`, `Monthly`, `Quarterly`,
`SemiAnnually`, `Annually`, and `Custom(u64)` (arbitrary seconds).

#### Milestone

Project-based compensation with up to 4 escrowed milestones released via a
release-condition bitmap.

```rust
PolicyType::Milestone {
    milestone_amounts: [u64; 4],
    milestone_timestamps: [i64; 4],
    current_milestone: u8,
    release_condition: u8,   // bit0=due-date, bit1=gateway, bit2=owner, bit3=recipient
    total_milestones: u8,    // 1..=4
    escrow_amount: u64,
    padding: [u8; 53],
}
```

Release bits (bits 1–3 are mutually exclusive):

| Bit | Mask     | Condition                   |
| --- | -------- | --------------------------- |
| 0   | `0b0001` | Milestone due-date reached  |
| 1   | `0b0010` | Gateway authority must sign |
| 2   | `0b0100` | Policy owner must sign      |
| 3   | `0b1000` | Recipient must sign         |

#### Pay-as-you-go

Usage-based billing with per-period caps and per-call chunk limits.

```rust
PolicyType::PayAsYouGo {
    max_amount_per_period: u64,
    max_chunk_amount: u64,
    period_length_seconds: u64,
    current_period_start: i64,
    current_period_total: u64,   // auto-resets when period elapses
    padding: [u8; 88],
}
```

### Fee Model

Fees are computed in `programs/tributary/src/shared/fees.rs`:

- **Protocol fee** — default `100 bps` (1%), stored on `ProgramConfig.protocol_fee_bps`.
- **Gateway fee** — configurable `gateway_fee_bps` (0..10000), stored per-gateway.
- **Custom protocol fee** — per-gateway override (bit 2 of `feature_flags`).
- **Combined guard** — `gateway_fee_bps + protocol_fee_bps < 10000` is enforced (recipient must receive > 0).

Two amount modes (`PaymentGateway.feature_flags` bit 1):

- **Gross (default)** — recipient = `payment_amount − gateway_fee − protocol_fee`.
- **Net** — recipient receives exactly `payment_amount`; fees are added on top and pulled from the user.

Math: `(amount * bps) / 10000` (rounds down; dust goes to protocol).

### Referral Program

Gateways opt into a 3-tier referral reward pool (bit 0 of `feature_flags`):

- `referral_allocation_bps` — fraction of the **gateway fee** carved into the pool (0..=2500, i.e. up to 25%).
- `referral_tiers_bps` — 3-element split of the pool across `[direct, level2, level3]`, must sum to 10000.

Referral codes are 6-byte arrays, scoped per gateway via the `ReferralAccount`
PDA (`["referral", gateway, referral_code]`). The chain is traversed at payment
time to distribute rewards.

### Composable Policies (Validation + Forward)

A `ComposablePolicy` runs two **optional** hooks during execution, between the
pull and settlement. Both are opt-in via sentinels.

#### Execution flow (3 phases)

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

#### ForwardConfig

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
- When enabled, ≥1 `ByteRangeCheck` must pin the discriminator at offset 0.
- `min_output_amount` is checked against the **net** amount (after fees).

#### ValidationConfig

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

#### Allowlists (hard-coded in `constants.rs`)

| List                          | Programs                                                   |
| ----------------------------- | ---------------------------------------------------------- |
| `ALLOWED_FORWARD_PROGRAMS`    | Meteora DLMM `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` |
| `ALLOWED_VALIDATION_PROGRAMS` | Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`   |

#### Building Lighthouse assertions (SDK facade)

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

> [!NOTE]
> The facade owns **only** the Lighthouse target accounts. The caller assembles
> Tributary's full `remaining_accounts` list (`[ValidationPda, ...guard.accounts]`).

### Gateway Feature Flags

`PaymentGateway.feature_flags` is a bit-vector (see `constants.rs`):

| Bit | Mask | Flag                          | Effect                                                         |
| --- | ---- | ----------------------------- | -------------------------------------------------------------- |
| 0   | 0x01 | `FEATURE_REFERRAL`            | Enables the referral reward pool                               |
| 1   | 0x02 | `FEATURE_NET_AMOUNT`          | Recipient receives exactly `payment_amount`; fees added on top |
| 2   | 0x04 | `FEATURE_CUSTOM_PROTOCOL_FEE` | Overrides default protocol fee with `custom_protocol_fee_bps`  |

---

## Workspaces Reference

| Package                   | Path                  | Version | Purpose                                          |
| ------------------------- | --------------------- | ------- | ------------------------------------------------ |
| `@tributary-so/contract`  | `programs/tributary`  | 1.6.1   | Rust Anchor program (publishes IDL)              |
| `@tributary-so/sdk`       | `packages/sdk`        | 1.11.1  | Core TypeScript SDK — instruction builders, PDAs |
| `@tributary-so/sdk-react` | `packages/sdk-react`  | 1.6.0   | React hooks + UI components (SubscriptionButton) |
| `@tributary-so/sdk-x402`  | `packages/sdk-x402`   | 1.5.0   | Express 5 HTTP 402 middleware + metering         |
| `@tributary-so/payments`  | `packages/payments`   | 1.9.1   | High-level payments client with JWT verification |
| `lighthouse-sdk-legacy`   | `packages/lighthouse` | 2.0.1   | Vendored Lighthouse assertion client (private)   |
| `@tributary-so/cli`       | `apps/cli`            | 1.8.0   | oclif CLI (`tributary` binary)                   |
| `@tributary-so/api`       | `apps/api`            | 1.9.0   | Express + Drizzle + Postgres + Redis API server  |
| `@tributary-so/scheduler` | `apps/scheduler`      | 1.5.2   | node-cron payment executor                       |
| `@tributary-so/app`       | `apps/app`            | 1.14.0  | React 19 dashboard                               |
| _(unpublished)_           | `apps/checkout`       | —       | Checkout pay-page                                |
| _(unpublished)_           | `apps/landing`        | —       | Marketing site                                   |
| _(unpublished)_           | `apps/lando`          | —       | Lando page                                       |
| _(unpublished)_           | `apps/docs`           | —       | MkDocs documentation                             |

---

## SDK Usage

### Install

```bash
pnpm add @tributary-so/sdk
# optional companions:
pnpm add @tributary-so/sdk-react   # React hooks + buttons
pnpm add @tributary-so/sdk-x402    # HTTP 402 middleware
pnpm add @tributary-so/payments    # high-level payments client
```

### Create a subscription

```typescript
import { Tributary, getPaymentFrequency, encodeMemo } from "@tributary-so/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const PROGRAM_ID = new PublicKey("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");

const sdk = new Tributary(PROGRAM_ID, connection);

// Full setup: ATA + user payment + policy + delegate approval
const ixs = await sdk.createSubscription(
  tokenMint, // e.g. USDC mint
  recipient, // recipient wallet
  gateway, // gateway PDA authority
  new BN("1000000"), // amount (6 decimals = 1 USDC)
  true, // auto-renew
  12, // max renewals
  getPaymentFrequency("monthly"),
  encodeMemo("Pro plan")
);
```

### Execute a payment (permissionless — called by gateway signer)

```typescript
const execIx = await sdk.executePayment(paymentPolicyPda);
```

### Create a composable policy with a Lighthouse guard

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
  policyType, // same PolicyType enum
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

### React — SubscriptionButton

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

### x402 HTTP 402 middleware

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

---

## CLI Manager

The oclif CLI (`apps/cli`, binary `tributary`) exposes topics for every program
operation:

```bash
pnpm --filter @tributary-so/cli build

# Topics:
tributary wallet       # keypair create / import / balance
tributary program      # protocol init + config queries
tributary user         # UserPayment create / list / inspect
tributary gateway      # gateway create / configure / inspect
tributary subscription # policy create / list / pause / resume / delete
tributary payments     # trigger execution
tributary referral     # referral accounts + chain queries
tributary pda          # derive any PDA
```

> [!TIP]
> The SDK also ships a low-level manager: `pnpm --filter @tributary-so/sdk manager`.

---

## Environment Variables

### Required (program interaction)

| Variable         | Description          | Example                                       |
| ---------------- | -------------------- | --------------------------------------------- |
| `SOLANA_RPC_URL` | Solana RPC endpoint  | `https://api.mainnet-beta.solana.com`         |
| `PROGRAM_ID`     | Tributary program ID | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ` |

### Optional (Anchor / deployment)

| Variable              | Description                            | Default                               |
| --------------------- | -------------------------------------- | ------------------------------------- |
| `ANCHOR_WALLET`       | Path to Solana wallet keypair          | `~/.config/solana/id.json`            |
| `ANCHOR_PROVIDER_URL` | Anchor provider URL                    | localnet                              |
| `SOLANA_API`          | Override Makefile RPC (deploy scripts) | `https://api.mainnet-beta.solana.com` |
| `BUFFER`              | Buffer path for buffer-based deploys   | —                                     |

### App-specific

Each app documents its own variables in its `.env.example`. See
[Getting Started §4](#4-environment-setup).

> [!IMPORTANT]
> Never commit `.env` files. The repo only ships `.env.example` templates.

---

## Available Scripts

### Root (`package.json` + `Makefile`)

| Command              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `pnpm install`       | Install all workspace dependencies                        |
| `pnpm run lint`      | Lint all workspaces                                       |
| `pnpm run lint:fix`  | Auto-fix lint issues                                      |
| `make prep`          | Pin Anchor (`avm use 0.31.0`)                             |
| `make build`         | Build contract + all packages + all apps + docs           |
| `make test`          | `anchor test`                                             |
| `make run_surfpool`  | Start Surfpool localnet (`--legacy-anchor-compatibility`) |
| `make test_surfpool` | Run Surfpool + topup test suites                          |
| `make all_tests`     | Run `make test && make test_surfpool`                     |

### Program (`programs/tributary`)

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `anchor build` | Build `.so` + IDL → `target/deploy/` |
| `anchor test`  | cargo tests + jest integration       |
| `cargo test`   | Rust unit tests only                 |

### Deployment (`Makefile`)

| Command                       | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `make devnet_build`           | Build for devnet                                       |
| `make devnet_deploy`          | Deploy to devnet (`--program-keypair`)                 |
| `make devnet_deploy_buffer`   | Buffer-based devnet deploy (`BUFFER=...`)              |
| `make mainnet_build`          | Build with `--features mainnet`                        |
| `make mainnet_deploy`         | Direct mainnet deploy (`--upgradeable`)                |
| `make mainnet_deploy_buffer`  | Buffer-based mainnet deploy (recommended for upgrades) |
| `make mainnet_expand`         | Extend program account size by 20480 bytes             |
| `make publish_idl`            | Upgrade on-chain IDL                                   |
| `make verifiable_build`       | `solana-verify build` + hash + deploy + verify         |
| `make submit-verifable_build` | Remote verifiable build via `solana-verify`            |

### Packages

| Command                                       | Description            |
| --------------------------------------------- | ---------------------- |
| `pnpm --filter @tributary-so/sdk build`       | Build core SDK (tsup)  |
| `pnpm --filter @tributary-so/sdk-react build` | Build React SDK (tsup) |
| `pnpm --filter @tributary-so/sdk-x402 build`  | Build x402 middleware  |
| `pnpm --filter @tributary-so/payments build`  | Build payments client  |
| `pnpm --filter @tributary-so/cli build`       | Build oclif CLI        |
| `pnpm --filter @tributary-so/sdk manager`     | Run SDK manager REPL   |

### Apps

| Command                                     | Description                    |
| ------------------------------------------- | ------------------------------ |
| `pnpm --filter @tributary-so/app dev`       | Vite dev server (dashboard)    |
| `pnpm --filter ./apps/landing dev`          | Vite dev server (marketing)    |
| `pnpm --filter ./apps/checkout dev`         | Vite dev server (checkout)     |
| `pnpm --filter @tributary-so/api dev`       | Express dev server (tsx watch) |
| `pnpm --filter @tributary-so/scheduler dev` | Scheduler worker               |

---

## Testing

### Test matrix

| Suite                          | Command                       | Runner     | Requires            |
| ------------------------------ | ----------------------------- | ---------- | ------------------- |
| Rust unit tests                | `cargo test`                  | cargo      | Rust toolchain      |
| Integration (regular policies) | `anchor run test-integration` | jest       | Surfpool / localnet |
| Composable policies            | `anchor run test-composable`  | jest       | Surfpool            |
| Surfpool topup (no swap)       | `anchor run test-topup`       | jest       | Surfpool            |
| Surfpool topup (with swap)     | `anchor run test-topup-swap`  | jest       | Surfpool            |
| Surfpool full                  | `anchor run test-surfpool`    | jest       | Surfpool            |
| Everything                     | `anchor test`                 | cargo+jest | Surfpool            |

### Running the full suite

```bash
# Terminal 1 — start a local validator
make run_surfpool

# Terminal 2 — run tests
anchor test
```

`anchor test` is wired in `Anchor.toml` to run:

```
test-cargo      → cargo test
test-integration→ jest ./tests/tributary.test.ts
test-composable → jest ./tests/composable.test.ts
```

### Test files

```
tests/
├── tributary.test.ts          # Full PaymentPolicy flow (init → execute)
├── composable.test.ts         # ComposablePolicy: validation + forward
├── topup-balance.test.ts      # Same-mint topup (no forward)
├── topup-balance-swap.test.ts # Topup with Meteora DLMM swap
├── surfpool.test.ts           # Surfpool harness
├── constants.ts               # Shared test pubkeys (METEORA_DLMM, LIGHTHOUSE)
├── surfpool-helpers.ts
└── helpers/
```

### Writing tests

Mirror the source structure with a `.test.ts` suffix. Integration tests use the
Surfpool-backed Anchor provider. Prefer `accountsStrict()` over `accounts()`
for type safety.

---

## Deployment

### Smart Contract

The program deploys **upgradeable** (`Anchor.toml` → `upgradeable = true`).
Use the `Makefile` targets which bake in the correct keypairs and RPC.

#### Devnet

```bash
make prep
make devnet_build
make devnet_deploy                       # direct
# or buffer-based (recommended for upgrades):
BUFFER=<path> make devnet_deploy_buffer
```

#### Mainnet

```bash
make prep
make mainnet_build                       # builds with --features mainnet
make mainnet_deploy_buffer               # buffer + program-id deploy (recommended)
# or direct:
make mainnet_deploy
```

#### Verifiable builds (recommended)

Deterministic Docker builds verified on-chain via `solana-verify`:

```bash
make verifiable_build                    # build + hash + deploy + verify
# or submit a remote verification job:
make submit-verifable_build
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the manual verifiable-build runbook.

#### Extending program size

```bash
make mainnet_expand                      # +20480 bytes
# devnet:
make devnet_expand
```

#### Publishing the IDL

```bash
make publish_idl
```

### Docker (API + Scheduler)

Both `apps/api` and `apps/scheduler` ship multi-stage `Dockerfile`s built in CI
and pushed to `ghcr.io/tributary-so/...`.

```bash
# API
docker build -t tributary-api -f apps/api/Dockerfile .

# Scheduler
docker build -t tributary-scheduler -f apps/scheduler/Dockerfile .
```

Run locally:

```bash
docker run --rm \
  -e DATABASE_URL=postgresql://... \
  -e SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  -p 3000:3000 \
  tributary-api

docker run --rm \
  -e SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  -e ANCHOR_WALLET=/keys/gateway.json \
  -v ~/.config/solana:/keys:ro \
  tributary-scheduler
```

### SDK Packages

All publishable packages use `semantic-release` (gitmoji-flavored) per-package
via `semantic-release-monorepo`. Releases trigger automatically on pushes to
`main` (see `.github/workflows/semantic-release.yml`).

```bash
# Manual dry-run for a single package
pnpm --filter @tributary-so/sdk release --dry-run
```

### Frontend Apps

The app, landing, checkout, and lando pages deploy automatically via GitHub
Actions (`.github/workflows/app-prod.yaml`, `landing-page.yaml`,
`checkout-page.yaml`, `lando-page.yaml`).

### CI/CD

The main pipeline (`.github/workflows/main.yaml`) is change-detected:

1. **Detect changed packages** — diff against the previous tag.
2. **Test SDKs** — runs per changed package path.
3. **Release** — semantic-release per package.
4. **Deploy** — app, landing, checkout, lando, docs, typedocs (conditional).
5. **Docker** — build & push API + scheduler images to `ghcr.io` (conditional).

Trigger a full post-release rebuild without cutting a release:

```
gh workflow run main.yaml -f post_release=true
```

---

## Troubleshooting

### Surfpool / integration tests fail

> [!WARNING]
> Integration tests **require** Surfpool. Plain `anchor test` without it will
> fail to connect.

```bash
# Start Surfpool first (separate terminal)
make run_surfpool

# Then run tests
anchor test

# If Surfpool is stuck, restart it:
surfpool start --legacy-anchor-compatibility --no-tui
```

### `execute_payment` / `execute_composable` fails

| Symptom                                   | Likely cause                                            | Fix                                                               |
| ----------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| `MissingDelegate` / insufficient delegate | User has not approved the `UserPayment` PDA as delegate | Approve delegate on the user token account with sufficient amount |
| `PaymentNotDue`                           | `next_payment_due` is in the future (Subscription)      | Wait for the due timestamp, or warp time in tests                 |
| `EmergencyPauseActive`                    | `ProgramConfig.emergency_pause == true`                 | Admin must clear the flag                                         |
| `PolicyPaused`                            | Policy `status != Active`                               | `change_payment_policy_status` → `Active`                         |
| `CombinedFeeBpsExceedsMax`                | `gateway_fee_bps + protocol_fee_bps >= 10000`           | Lower the gateway fee                                             |

### Anchor build fails

```bash
# Pin the toolchain
make prep

# Clear caches
rm -rf ~/.anchor target
anchor build
```

### SDK build fails

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm --filter @tributary-so/sdk build
```

### Program deployment fails

```bash
solana balance                          # ensure SOL for rent + fees
solana config get                       # verify cluster + keypair

# If "account already in use" on program-id:
BUFFER=/tmp/buffer.json make mainnet_deploy_buffer
```

### Composable: forward CPI rejected

- `target_program` must be in `ALLOWED_FORWARD_PROGRAMS` (Meteora DLMM) or `Pubkey::default()` to disable.
- ≥1 `ByteRangeCheck` must pin the instruction discriminator at offset 0.
- `min_output_amount` is checked against the **net** (post-fee) output.
- Intermediate ATAs are owned by the **ComposablePolicy PDA**, not the UserPayment PDA.

### Composable: validation CPI

> [!CAUTION]
> The validation CPI dispatcher (`shared/validation.rs`) is currently a no-op
> stub (`Ok(())`). It is wired but does not invoke Lighthouse at runtime yet.
> The Lighthouse SDK facade, `ValidationPda` storage, and account splitting are
> all implemented and tested; the on-chain dispatch is tracked as a follow-up.
> Treat validation as "configured, not enforced" until the dispatch lands.

### TypeScript type errors

```bash
pnpm run lint
pnpm run lint:fix
```

---

## Security

- **Non-custodial** — funds remain in user wallets; only SPL delegation is used.
- **Emergency pause** — `ProgramConfig.emergency_pause` blocks all execution.
- **Access control** — authority verification on every mutating instruction.
- **CPI allowlists** — forward (Meteora DLMM) and validation (Lighthouse) target programs are hard-coded.
- **CPI signer sanitization** — validation & forward builders do **not** forward `is_signer` from `remaining_accounts` (closes a privilege pass-through vector).
- **Intermediate ATA ownership** — owned by the ComposablePolicy PDA, isolating transient balances from user source funds.
- **`security.txt`** — embedded on-chain via `solana-security-txt`.
- **Audits** — see [`AUDITS.md`](AUDITS.md) and [`SECURITY.md`](SECURITY.md). Findings are documented in [`reports/`](reports/).

Report vulnerabilities to **security@tributary.so** per the policy in
[`SECURITY.md`](SECURITY.md).

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. **Write tests first** (TDD) — mirror source structure with `.test.ts`.
4. Run the suite: `make run_surfpool` then `anchor test`.
5. Lint: `pnpm run lint` (must be clean).
6. Commit with **conventional commits** (gitmoji — releases are automated).
7. Open a pull request.

> [!IMPORTANT]
> This repo uses [beans](https://github.com/skybrian/beans) for issue tracking.
> Reference relevant bean IDs in commit messages.

### Conventions

- **Rust**: snake_case files, `Result<()>` error handling, `#[account]` fixed sizes with padding.
- **TypeScript**: strict types, `PublicKey` for addresses, `anchor.BN` for big numbers, `accountsStrict()`.
- **Imports**: Solana first, then Anchor, then local modules.
- **PDAs**: always derive via `packages/sdk/src/pda.ts` helpers.

---

## License

MIT — see [`LICENSE`](LICENSE).

## Community & Support

- **Website**: [tributary.so](https://tributary.so)
- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **GitHub Issues**: [github.com/tributary-so/tributary/issues](https://github.com/tributary-so/tributary/issues)
- **Twitter**: [@tributaryso](https://twitter.com/tributaryso)
