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

Includes manager CLI in `sdk/manager.ts` for all program operations and PDA utilities.

## Verified Deployment

**Critical:** Use verifiable builds for on-chain verification.

[Read more about deployments.](./DEPLOYMENT.md)

## Testing

| Layer       | Location | Framework     | Command       |
| ----------- | -------- | ------------- | ------------- |
| Integration | `tests/` | Jest + Anchor | `anchor test` |

```bash
anchor test
```

<!-- bv-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for issue tracking. Issues are stored in `.beads/` and tracked in git.

**NEVER** create TODO.md, TASKS.md, PLAN.md, or any markdown task tracking files.
**ALWAYS** use `bd` commands for issue tracking.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Essential Commands

```bash
# View issues (launches TUI - avoid in automated sessions)
bv

# CLI commands for agents (use these instead)
bd ready              # Show issues ready to work (no blockers)
bd list --status=open # All open issues
bd show <id>          # Full issue details with dependencies
bd create --title="..." --type=task --priority=2
bd update <id> --status=in_progress
bd close <id> --reason="Completed"
bd close <id1> <id2>  # Close multiple issues at once
bd sync               # Commit and push changes
```

### Workflow Pattern

1. **Start**: Run `bd ready` to find actionable work
2. **Claim**: Use `bd update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `bd close <id>`
5. **Sync**: Always run `bd sync` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `bd ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
bd sync                 # Commit beads changes
git commit -m "..."     # Commit code
bd sync                 # Commit any new beads changes
git push                # Push to remote
```

### Best Practices

- Check `bd ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always `bd sync` before ending session

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ✅ Store AI planning docs in `history/` directory
- ✅ Run `bd <cmd> --help` to discover available flags
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems
- ❌ Do NOT clutter repo root with planning documents

<!-- end-bv-agent-instructions -->
