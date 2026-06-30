# Tributary Payment Scheduler

Cron-based off-chain service that executes due recurring payments for Tributary gateways on Solana. Iterates all payment policies for configured gateway keypairs, determines which are due, and submits `executePayment` transactions on-chain.

Part of the [Tributary](../../README.md) recurring payment protocol.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  PaymentScheduler                   │
│                                                     │
│  ┌───────────┐   ┌────────────┐   ┌──────────────┐ │
│  │  node-cron │──▶│  Check Due  │──▶│  Execute Tx  │ │
│  │  (UTC)     │   │  Policies   │   │  via SDK     │ │
│  └───────────┘   └────────────┘   └──────────────┘ │
│        │                │                  │         │
│        │          ┌─────┴──────┐    ┌──────┴──────┐  │
│        │          │ Skip if:   │    │ confirmed   │  │
│        │          │ - paused   │    │ commitment  │  │
│        │          │ - not due  │    └─────────────┘  │
│        │          │ - maxed out│                      │
│        │          └────────────┘                      │
│        │                                              │
│  Runs immediately on start, then on cron schedule    │
└─────────────────────────────────────────────────────┘
```

### Policy Execution Logic

The scheduler evaluates each policy against the current time:

| Policy Type  | Execution Condition                                                               | Notes                                       |
| ------------ | --------------------------------------------------------------------------------- | ------------------------------------------- |
| Subscription | `nextPaymentDue <= now` AND `paymentCount < maxRenewals`                          | Respects auto-renew limits                  |
| Milestone    | `releaseCondition === 0` (time-based only) AND current milestone timestamp passed | Multi-sig milestones (bits 1-3) are skipped |
| PayAsYouGo   | Not processed by scheduler                                                        | PAYG payments are user-initiated            |

Paused or inactive policies are always skipped.

### Multi-Gateway Support

Pass multiple gateway keypairs via semicolon-separated `PRIVATE_KEY` env var. The scheduler iterates each gateway sequentially, updating the SDK wallet per gateway.

## Prerequisites

- Node.js >= 16
- pnpm (workspace uses pnpm@9.6.0)
- Built SDK package (`@tributary-so/sdk`)
- Solana RPC endpoint (mainnet, devnet, or local validator)
- Gateway keypair(s) with signer authority for target PaymentGateway accounts

## Getting Started

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Build SDK (required)

```bash
cd packages/sdk && pnpm run build
```

### 3. Build Scheduler

```bash
cd apps/scheduler && pnpm run build
```

### 4. Run

```bash
SOLANA_API=https://api.mainnet-beta.solana.com \
ANCHOR_WALLET=/path/to/gateway-keypair.json \
pnpm start
```

Or use an inline private key:

```bash
SOLANA_API=https://api.mainnet-beta.solana.com \
PRIVATE_KEY="[1,2,3,...,64]" \
pnpm start
```

Multiple gateways:

```bash
SOLANA_API=https://api.mainnet-beta.solana.com \
PRIVATE_KEY="[1,...,64];[65,...,128]" \
pnpm start
```

## Environment Variables

### Required (one of)

| Variable        | Description                                 | Example                               |
| --------------- | ------------------------------------------- | ------------------------------------- |
| `SOLANA_API`    | Solana RPC endpoint URL                     | `https://api.mainnet-beta.solana.com` |
| `ANCHOR_WALLET` | Path to gateway keypair JSON file           | `/home/user/.config/solana/id.json`   |
| `PRIVATE_KEY`   | Gateway private key(s), semicolon-separated | `"[1,2,...,64]";"[65,...,128]"`       |

> [!NOTE]
> Either `ANCHOR_WALLET` or `PRIVATE_KEY` must be set. If both are provided, `ANCHOR_WALLET` is loaded first, then all keys from `PRIVATE_KEY` are appended.

### Optional

| Variable            | Description                                       | Default                  |
| ------------------- | ------------------------------------------------- | ------------------------ |
| `CRON_SCHEDULE`     | Cron expression for PaymentPolicy execution (UTC) | `0 * * * *` (every hour) |
| `ENABLE_COMPOSABLE` | Start the ComposablePolicy poll loop (`true`/`1`) | `false`                  |

### Cron Schedule Examples

| Schedule      | Meaning                |
| ------------- | ---------------------- |
| `*/5 * * * *` | Every 5 minutes        |
| `0 * * * *`   | Every hour (default)   |
| `0 */6 * * *` | Every 6 hours          |
| `0 0 * * *`   | Once daily at midnight |

## Available Scripts

| Command      | Description                  |
| ------------ | ---------------------------- |
| `pnpm start` | Run the scheduler (via tsx)  |
| `pnpm dev`   | Alias for `pnpm start`       |
| `pnpm build` | Compile TypeScript to `lib/` |
| `pnpm lint`  | Lint source with ESLint      |
| `pnpm clean` | Remove `lib/` build output   |

## Docker

Build from the monorepo root context:

```bash
docker build -f apps/scheduler/Dockerfile -t tributary-scheduler .
```

Run:

```bash
docker run -d \
  -e SOLANA_API=https://api.mainnet-beta.solana.com \
  -e PRIVATE_KEY="[1,2,...,64]" \
  -e CRON_SCHEDULE="0 * * * *" \
  tributary-scheduler
```

The Dockerfile uses a multi-stage build: stage 1 installs deps and builds SDK + scheduler, stage 2 copies artifacts into a clean image and runs `pnpm start`.

## Graceful Shutdown

The scheduler handles `SIGINT` and `SIGTERM` for clean shutdown. In-flight payment executions will complete before the process exits.

## Program Reference

| Account        | PDA Seeds                                     |
| -------------- | --------------------------------------------- |
| PaymentGateway | `["gateway", authority]`                      |
| PaymentPolicy  | `["payment_policy", user_payment, policy_id]` |
| UserPayment    | `["user_payment", owner, mint]`               |

Program ID: `TRibg8W8zmPHQqWtyAD1rEBRXEdy13Mu6qX1Sg42tJ`

## License

See [root LICENSE](../../LICENSE).
