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

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
bd create "Subtask" --parent <epic-id> --json  # Hierarchical subtask (gets ID like epic-id.1)
```

**Claim and update:**

```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

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

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`
6. **Commit together**: Always commit the `.beads/issues.jsonl` file together with the code changes so issue state stays in sync with code state

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### GitHub Copilot Integration

If using GitHub Copilot, also create `.github/copilot-instructions.md` for automatic instruction loading.
Run `bd onboard` to get the content, or see step 2 of the onboard instructions.

### MCP Server (Recommended)

If using Claude or MCP-compatible clients, install the beads MCP server:

```bash
pip install beads-mcp
```

Add to MCP config (e.g., `~/.config/claude/config.json`):

```json
{
  "beads": {
    "command": "beads-mcp",
    "args": []
  }
}
```

Then use `mcp__beads__*` functions instead of CLI commands.

### Managing AI-Generated Planning Documents

AI assistants often create planning and design documents during development:

- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

**Best Practice: Use a dedicated directory for these ephemeral files**

**Recommended approach:**

- Create a `history/` directory in the project root
- Store ALL AI-generated planning/design docs in `history/`
- Keep the repository root clean and focused on permanent project files
- Only access `history/` when explicitly asked to review past planning

**Example .gitignore entry (optional):**

```
# AI planning documents (ephemeral)
history/
```

**Benefits:**

- ✅ Clean repository root
- ✅ Clear separation between ephemeral and permanent documentation
- ✅ Easy to exclude from version control if desired
- ✅ Preserves planning history for archeological research
- ✅ Reduces noise when browsing the project

### CLI Help

Run `bd <command> --help` to see all available flags for any command.
For example: `bd create --help` shows `--parent`, `--deps`, `--assignee`, etc.

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

For more details, see README.md and QUICKSTART.md.
