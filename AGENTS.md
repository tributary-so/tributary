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

- **Program** (`programs/recurring_payments/`): Rust smart contract with 5 instructions: initialize, create_user_payment, create_payment_gateway, create_payment_policy, execute_payment
- **SDK** (`sdk/`): TypeScript SDK with manager CLI (`manager.ts`) for all program operations
- **Tests** (`tests/`): Full integration test suite covering entire payment flow
- **Landing** (`landing/`): React/Tailwind marketing site with developer examples
- **Docs** (`docs/`): MkDocs documentation (what/how/why)

### Key Components

- **PDAs**: config, gateway, user_payment, payment_policy, payments_delegate
- **State Accounts**: ProgramConfig, PaymentGateway, UserPayment, PaymentPolicy with PolicyType enum
- **Payment Flow**: User approves delegate → Policy created → Gateway executes recurring payments
- **Fees**: Protocol fees (100 bps) + Gateway fees (configurable) split between recipients
- **CLI Manager**: Full-featured CLI in `sdk/manager.ts` for all operations and PDA utilities

### Test Structure

Tests in `tests/recurring_payments.test.ts` cover: program initialization, user payment creation, gateway setup, policy creation, delegate approval, and payment execution with fee distribution verification.
