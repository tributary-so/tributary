# Agent Development Guidelines

## Build/Test Commands

- `pnpm run lint` - Lint all workspaces
- `pnpm run lint:fix` - Auto-fix linting issues
- `anchor test` - Run all Solana program tests
- `cd tests && npx jest` - Run TypeScript tests
- `cd sdk && pnpm run build` - Build SDK package
- `cd app && pnpm run dev` - Start development server
- `make prep` - Setup Solana toolchain (v1.18.20, Anchor 0.31.0)

## Code Style

- Use TypeScript with strict types, avoid `any` except for Anchor wallet compatibility
- Import statements: Solana imports first, then Anchor, then local modules
- Use camelCase for variables/functions, PascalCase for types/classes
- Error handling: Use Anchor's `Result<()>` in Rust, proper try/catch in TypeScript
- Format with Prettier (configured), use `pnpm run lint:fix` before commits
- File naming: snake_case for Rust, camelCase for TypeScript
- Use `PublicKey` for Solana addresses, `anchor.BN` for big numbers
- Prefer `accountsStrict()` over `accounts()` for type safety
- Use PDAs consistently with helper functions from pda.ts
- Test files should mirror source structure with `.test.ts` suffix

## Project Overview

**Tributary** - Automated recurring payments on Solana using token delegation. Web2 subscription UX with Web3 transparency.

### Core Architecture

- **Program** (`programs/tributary/`): Rust smart contract with 5 instructions: initialize, create_user_payment, create_payment_gateway, create_payment_policy, execute_payment
- **SDK** (`sdk/`): TypeScript SDK with manager CLI (`manager.ts`) for all program operations
- **Tests** (`tests/`): Full integration test suite covering entire payment flow
- **Landing** (`landing/`): React/Tailwind marketing site with developer examples
- **Docs** (`docs/`): MkDocs documentation (what/how/why)

### Key Components

- **PDAs**: config, gateway, user_payment, payment_policy, payments_delegate
- **State Accounts**: ProgramConfig, PaymentGateway, UserPayment, PaymentPolicy with PolicyType enum
- **Payment Flow**: User approves delegate → Policy created → Gateway executes tributary payments
- **Fees**: Protocol fees (100 bps) + Gateway fees (configurable) split between recipients
- **CLI Manager**: Full-featured CLI in `sdk/manager.ts` for all operations and PDA utilities

### Test Structure

Tests in `tests/tributary.test.ts` cover: program initialization, user payment creation, gateway setup, policy creation, delegate approval, and payment execution with fee distribution verification.

## Program Details

**Program ID:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

## Critical Gotchas

### 1. Delegate Approval Required

User must approve token delegation before payments can execute. `execute_payment` fails if delegate permissions are missing or insufficient.

### 2. Payment Execution Timing

`execute_payment` checks `next_payment_due` timestamp. Payments only execute if current time >= due time. Early calls are ignored.

### 3. Fee Distribution

- Protocol fee: 100 bps (1%) deducted from each payment
- Gateway fee: Configurable bps (up to 10,000) split between gateway and protocol
- Math: `(amount * bps) / 10000` rounds down; dust goes to protocol

### 4. Account Size Padding

All state accounts use fixed sizes with padding (e.g., PolicyType variants are 128 bytes). Changing padding breaks deserialization.

### 5. Authority Changes

Gateway authority changes require signer verification. Fee recipient and signer can be updated separately.

### 6. Emergency Pause

ProgramConfig has `emergency_pause` flag. When true, all `execute_payment` calls fail.

## Architecture

```
User → Create UserPayment (owner/mint)
    → Create PaymentGateway (authority/signer)
    → Create PaymentPolicy (user_payment/recipient/gateway)
    → Approve Delegate (token account delegation)
    → Execute Payment (permissionless, by gateway signer)
       → Transfer to recipient + fees
```

**PDAs:**

- ProgramConfig: `["program_config"]` - singleton, manages protocol fees/admin
- PaymentGateway: `["payment_gateway", authority]` - gateway settings/fees
- UserPayment: `["user_payment", owner, mint]` - user stats across policies
- PaymentPolicy: `["payment_policy", user_payment, policy_id]` - individual subscription
- PaymentsDelegate: `["payments_delegate", user_payment, recipient, gateway]` - delegate authority

## SDK

TypeScript SDK in `sdk/` with dual compatibility:

```typescript
import { Tributary } from "@tributary-so/sdk"; // Main SDK class
```

## Testing

```bash
anchor test
```

## Beans

**IMPORTANT**: before you do anything else, run the `beans prime` command and heed its output.
When making a commit, include the relevant bean IDs in the commit message
