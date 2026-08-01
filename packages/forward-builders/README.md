# @tributary-so/forward-builders

[![npm version](https://badge.fury.io/js/%40tributary-so%2Fforward-builders.svg)](https://badge.fury.io/js/%40tributary-so%2Fforward-builders)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)](https://solana.com)

Concrete `ForwardBuilder` implementations for the Tributary composable
execution pipeline (ADR-0030). Each supported forward-program (Meteora DLMM,
Raydium CPMM, Raydium CLMM, Orca Whirlpool) ships a fire-time swap builder
plus a co-located setup-time `ForwardConfig` constraint so the two cannot
drift. The SDK owns the `ForwardBuilder` interface; the implementations live
here so the SDK's dependency surface stays at **zero** forward-program deps.

> [!IMPORTANT]
> This package exists to keep `@tributary-so/sdk` dependency-light. Every SDK
> consumer (browser apps, the marketing landing page, the showcase) would
> otherwise bundle `@meteora-ag/dlmm`, `@raydium-io/raydium-sdk-v2`,
> `@orca-so/whirlpools` and `@solana/kit` whether they touch composable
> forwards or not. The abstraction lives in the SDK where consumers depend on
> it; the implementations live here, **opt-in**.

## Key Features

- **Four forward programs**: Meteora DLMM, Raydium CPMM, Raydium CLMM, Orca Whirlpool
- **Co-located setup/fire pair**: each program exposes a `*Forward` builder **and** a `*ForwardConfig` constraint in the same file — on-chain pin and fire-time instruction cannot drift
- **ADR-0008 enforced at the type level**: `ForwardAccountMeta` has no `isSigner` field, so a builder cannot leak signer authority through the CPI boundary
- **Dispatcher**: `getForwardBuilderFor(policy, opts)` reads the on-chain `instructionConstraint.programId` and returns the matching builder
- **Named recipes**: `createSwapWhenBalanceLow` (per program) wires the three validation-recipe tiers into one create bundle
- **Opt-in peer deps**: install only the forward-program SDK you actually import

## Tech Stack

- **Language**: TypeScript 5.7+ (ESM, target `es2020`)
- **Blockchain**: Solana (Tributary Program ID: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`)
- **Build**: `tsup` (esbuild, ESM, externalized forward-program deps)
- **Test**: `jest` + `ts-jest` (CJS, mocks the DLMM/CPMM/CLMM/Whirlpool clients)
- **Package Manager**: pnpm 9.6.0+
- **Node.js**: >=16.0.0

## Supported Forward Programs

| Program            | Pubkey (mainnet-beta)                          | Swap ix           | Pin layout                                             |
| ------------------ | ---------------------------------------------- | ----------------- | ------------------------------------------------------ |
| **Meteora DLMM**   | `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`  | `swap2`           | `pinnedAccounts[0]` = pool                             |
| **Raydium CPMM**   | `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` | `swap_base_input` | `[0]` = pool_state (idx 3), `[1]` = amm_config (idx 2) |
| **Raydium CLMM**   | `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` | `swap_v2`         | `[0]` = pool, `[1]` = amm_config                       |
| **Orca Whirlpool** | `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`  | `swap_v2`         | `pinnedAccounts[0]` = pool                             |

These four program ids are Tributary's on-chain `ALLOWED_FORWARD_PROGRAMS`
(`programs/tributary/src/constants.rs`). A forward builder for a program not
in that set will never be reached — the program rejects it at execute time.

## Prerequisites

- Node.js 16.0.0 or higher
- pnpm (recommended) or npm
- `@tributary-so/sdk` (peer — provides the `ForwardBuilder` interface, types, and recipe helpers)
- A Solana RPC endpoint

## Installation

```bash
# Using pnpm (recommended)
pnpm add @tributary-so/forward-builders @tributary-so/sdk

# Then add the forward-program SDK(s) you actually use (opt-in peers):
pnpm add @meteora-ag/dlmm           # for createMeteoraDlmmForward
pnpm add @raydium-io/raydium-sdk-v2 # for createRaydiumCpmmForward / createRaydiumClmmForward
pnpm add @orca-so/whirlpools        # for createWhirlpoolForward
pnpm add @solana/kit                # required by @orca-so/whirlpools
```

> [!NOTE]
> The forward-program SDKs are declared **optional peer dependencies**. You
> only install the ones you import. The tsup bundle externalizes them, so they
> never ship inside this package's `dist/`. If you skip a peer, the
> corresponding builder import simply won't resolve — no silent fallback.

## Getting Started

### The two-layer model

Every forward program is exposed as **two functions in the same file**:

1. **Fire-time builder** — `createXForward(opts): ForwardBuilder`. Its
   `build()` resolves the swap quote, constructs the forward-program swap
   instruction, and returns `{ instructionData, forwardAccounts }` for
   `execute_composable` to consume.
2. **Setup-time constraint** — `xForwardConfig(opts): ForwardConfig`. Pins
   `programId`, `pinnedAccounts`, and the swap-ix discriminator
   (`dataChecks[0]`) on-chain so the reviewed pool + selector are the only
   ones the scheduler may route through at fire time.

Co-locating them is deliberate (ADR-0030): the fields the constraint pins are
exactly the fields the builder emits, so a builder/constraint pair for one
program cannot silently desynchronize.

### Minimal example — dispatch from an existing policy

```typescript
import { getForwardBuilderFor } from "@tributary-so/forward-builders";
import { Tributary, buildComposableExecutionPayload } from "@tributary-so/sdk";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const sdk = new Tributary(connection, Keypair.generate());

// Fetch an existing composable policy on-chain.
const policy = await sdk.getComposablePolicy(composablePolicyPda);

// Dispatch the right builder from the on-chain instructionConstraint.programId.
const builder = getForwardBuilderFor(policy, { slippageBps: 100 });

const { instructionData, remainingAccounts } =
  await buildComposableExecutionPayload({
    connection,
    sdk,
    composablePolicyPda,
    policy,
    face, // BN — resolved via resolveDefaultForwardAmount(policy, gateway)
    forwardBuilder: builder,
  });

const execIxs = await sdk.executeComposable(
  composablePolicyPda,
  instructionData,
  face,
  remainingAccounts
);
```

`getForwardBuilderFor` throws an explicit error naming the program id if no
builder matches — that happens when the on-chain program is not in
`ALLOWED_FORWARD_PROGRAMS`, or a new forward program was added to the
allowlist without a corresponding builder here.

### Direct builder — Meteora DLMM

```typescript
import { createMeteoraDlmmForward } from "@tributary-so/forward-builders";

const builder = createMeteoraDlmmForward({
  pool: new PublicKey("BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y"),
  slippageBps: 100, // 1%
  applyHostFeeInFix: true, // rewrite SystemProgram host-fee-in → DLMM program id
});
```

### Direct builder — Raydium CPMM

```typescript
import { createRaydiumCpmmForward } from "@tributary-so/forward-builders";

const builder = createRaydiumCpmmForward({
  pool, // CPMM pool_state (pinned at pinnedAccounts[0])
  ammConfig, // CPMM amm_config (pinned at pinnedAccounts[1])
  slippageBps: 100,
});
```

### Named recipe — swap-when-balance-low auto-topup

The canonical auto-topup pattern (pull `inputMint`, swap to `outputMint`,
deliver to `recipient` — but only when the recipient's output ATA balance is
below `threshold`) is pre-wired per program. Each variant returns
`{ create, forwardBuilder }`: `create` is the argument bundle for the SDK's
`getCreateComposablePolicyInstruction`, and `forwardBuilder` is the fire-time
builder for `buildComposableExecutionPayload`.

```typescript
import { createSwapWhenBalanceLow as createCpmmSwapWhenBalanceLow } from "@tributary-so/forward-builders";
import BN from "bn.js";

const { create, forwardBuilder } = createCpmmSwapWhenBalanceLow({
  policyType: {
    subscription: {
      amount: new BN(50_000_000), // 50 USDC of WSOL
      /* ...other subscription fields... */
    },
  },
  memo: "hot wallet WSOL topup",
  recipient: hotWallet,
  inputMint: USDC,
  outputMint: WSOL,
  pool,
  ammConfig,
  slippageBps: 100,
  threshold: 50_000_000, // fires when recipient output balance < 50 USDC
  op: "<",
});

// create.* → getCreateComposablePolicyInstruction(...)
// forwardBuilder → buildComposableExecutionPayload(...)
```

Each program exports its own `createSwapWhenBalanceLow`:

| Import alias                              | Program      |
| ----------------------------------------- | ------------ |
| `createSwapWhenBalanceLow`                | Meteora DLMM |
| `createSwapWhenBalanceLow` (raydium-cpmm) | Raydium CPMM |
| `createRaydiumClmmSwapWhenBalanceLow`     | Raydium CLMM |

(`packages/forward-builders/src/index.ts` re-aliases CPMM/CLMM variants to
avoid name collisions when importing several programs together.)

## Architecture

### Directory Structure

```
src/
├── index.ts                # Public re-exports (program + aliases)
├── constants.ts            # The four forward-program pubkeys
├── dispatch.ts             # getForwardBuilderFor — programId → builder
├── meteora-dlmm.ts         # createMeteoraDlmmForward + meteoraDlmmForwardConfig + recipe
├── raydium-cpmm.ts         # createRaydiumCpmmForward + raydiumCpmmForwardConfig + recipe
├── raydium-clmm.ts         # createRaydiumClmmForward + raydiumClmmForwardConfig + recipe
├── whirlpool.ts            # createWhirlpoolForward + whirlpoolForwardConfig
├── meteora-dlmm.test.ts    # unit (mocked DLMM client, no RPC)
├── raydium-cpmm.test.ts    # unit
├── raydium-clmm.test.ts    # unit
└── whirlpool.test.ts       # unit
```

### Per-program file shape

Each `<program>.ts` follows the same three-section layout:

```
1. createXForward(opts)         — fire-time ForwardBuilder.build()
2. xForwardConfig(opts)         — setup-time ForwardConfig constraint
3. createSwapWhenBalanceLow()   — (optional) named recipe wiring tiers 1-3
```

The discriminator constant (`XXX_SWAP_DISCRIMINATOR`) sits between section 1
and 2 — the first 8 bytes of `sha256("global:<ix-name>")`, sourced from the
forward program's published IDL.

### Why co-location

```text
          ┌── setup-time ──────────────────────────────┐
          │ xForwardConfig pins:                        │
          │   programId    = XXX_PUBKEY                 │
          │   pinnedAccounts[0] = pool                  │
          │   dataChecks[0] = SWAP_DISCRIMINATOR  ◀──┐  │
          └──────────────────────────────────────────│──┘
                                                   same file
          ┌── fire-time ─────────────────────────────│──┐
          │ createXForward emits:                     │  │
          │   instructionData = swapIx.data           │  │
          │   forwardAccounts = swapIx.keys[]         │  │
          │     (the ix the on-chain check validates) ┘  │
          └──────────────────────────────────────────────┘
```

If a forward program changes its swap selector, the constant and the builder
update in the same edit. Splitting them across packages makes setup/fire
drift a class of bug; co-locating makes it impossible.

### ADR-0008 enforcement (CPI signer sanitization)

Every `forwardAccounts` entry is `{ pubkey, isWritable }` — there is **no
`isSigner` field** on the type. The SDK's assembler
(`assembleComposableRemainingAccounts`) stamps `isSigner: false` on every
account it emits (pre-targets, forward-accounts, post-targets). A forgetful
builder cannot reintroduce the ADR-0008 privilege-pass-through vector because
the type cannot express the dangerous state.

Per-account `isWritable` is preserved verbatim from the forward program's own
swap instruction (`swapIx.keys[].isWritable`). The Solana CPI runtime
enforces writability at the boundary — a CPI to a readonly account the callee
tries to write fails — so per-account writability is both tighter and more
honest than a blanket `true`.

### Meteora host-fee quirk

`applyHostFeeInFix` (Meteora only, off by default) rewrites the host-fee-in
account from `SystemProgram.programId` back to the DLMM program id. Meteora
declares the host-fee input as SystemProgram, which silently disables the
host-fee path. Enable this when the gateway is a DLMM fee-host. The other
three programs have no such quirk.

## Environment Variables

This package is a pure library; it reads no environment variables directly.
The caller supplies a `Connection` (with its own RPC endpoint) to every
`build()` call. Typical upstream configuration:

| Variable         | Description         | Example                               |
| ---------------- | ------------------- | ------------------------------------- |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |

## Available Scripts

| Command            | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `pnpm run build`   | Build ESM to `dist/` via tsup (externalizes forward-program peers)  |
| `pnpm run test`    | Run jest unit suite (forward-program clients mocked, no RPC)        |
| `pnpm run clean`   | Remove `dist/`                                                      |
| `pnpm run lint`    | Lint (currently a no-op passthrough)                                |
| `pnpm run release` | `semantic-release` (monorepo) — see `release` block in package.json |

## API Reference

### Builders (fire-time)

```typescript
createMeteoraDlmmForward(opts: {
  pool: PublicKey;
  slippageBps: number;
  applyHostFeeInFix?: boolean;
}): ForwardBuilder

createRaydiumCpmmForward(opts: {
  pool: PublicKey;
  ammConfig: PublicKey;
  slippageBps: number;
  minimumAmountOut?: BN;           // default: floor(face * (10000 - bps) / 10000)
}): ForwardBuilder

createRaydiumClmmForward(opts: {
  pool: PublicKey;
  ammConfig: PublicKey;
  slippageBps: number;
}): ForwardBuilder

createWhirlpoolForward(opts: {
  pool: PublicKey;
  slippageBps: number;
}): ForwardBuilder
```

Each returns a `ForwardBuilder` whose `build(ctx)` resolves:

```typescript
{
  instructionData: Buffer;              // raw swap selector + args
  forwardAccounts: ForwardAccountMeta[]; // { pubkey, isWritable } — no isSigner
}
```

### Constraints (setup-time)

```typescript
meteoraDlmmForwardConfig(opts: {
  inputMint, outputMint, pool, unwrapNativeSol?
}): ForwardConfig

raydiumCpmmForwardConfig(opts: {
  inputMint, outputMint, pool, ammConfig, unwrapNativeSol?
}): ForwardConfig

raydiumClmmForwardConfig(opts: {
  inputMint, outputMint, pool, ammConfig, unwrapNativeSol?
}): ForwardConfig

whirlpoolForwardConfig(opts: {
  inputMint, outputMint, pool, unwrapNativeSol?
}): ForwardConfig
```

`unwrapNativeSol` sets bit 0 of `forward_flags`
(`FORWARD_FLAG_NATIVE_OUTPUT`), making Tributary unwrap WSOL → native SOL
via a `closeAccount` sweep at settle. Requires `outputMint == NATIVE_MINT`.

### Dispatcher

```typescript
getForwardBuilderFor(
  policy: ComposablePolicy,
  opts: { slippageBps: number; applyHostFeeInFix?: boolean }
): ForwardBuilder
```

Reads `policy.forwardConfig.instructionConstraint.programId` and returns the
matching builder. Throws `No ForwardBuilder for program <id>...` if none
matches.

### Constants

```typescript
METEORA_DLMM_PUBKEY, RAYDIUM_CPMM_PUBKEY, RAYDIUM_CLMM_PUBKEY, WHIRLPOOL_PUBKEY;

METEORA_DLMM_SWAP_DISCRIMINATOR,
  RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR,
  RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR,
  WHIRLPOOL_SWAP_V2_DISCRIMINATOR;
```

## Testing

### Running Tests

```bash
# From this package
pnpm run test

# From the repo root (all workspaces)
pnpm -r run test
```

The unit suites **mock the forward-program SDK clients** (DLMM, Raydium,
Orca) and run without an RPC. The assertions target the key-transformation
logic previously inlined in the scheduler:

- per-account `isWritable` preserved from `swapIx.keys` (NOT blanket `true`)
- `applyHostFeeInFix` rewrites SystemProgram → DLMM program id
- returned accounts never carry `isSigner` (ADR-0008, type-level)
- `instructionData` is the raw swap instruction data
- setup-time config pins the correct discriminator + accounts

### Test Structure

```
src/
├── meteora-dlmm.test.ts    # isWritable preservation, host-fee fix, no-isSigner
├── raydium-cpmm.test.ts    # 13-account layout, bps-floor default
├── raydium-clmm.test.ts    # swap_v2 + tick-array resolution (mocked RPC)
└── whirlpool.test.ts       # kit v2 interop, noop-signer, instruction extraction
```

For live/integration tests against a validator (Surfpool), use the repo-root
`tests/` suite (`make test_surfpool`).

## Building

```bash
# Build this package (ESM → dist/)
pnpm run build

# Clean + rebuild
pnpm run clean && pnpm run build
```

tsup config (`tsup.config.ts`) externalizes `@meteora-ag/dlmm` and
`@raydium-io/raydium-sdk-v2` so they are never bundled into `dist/`. The
build output lands at `dist/packages/forward-builders/src/index.{js,d.ts}`
(matching the `exports` map in `package.json`).

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes with tests (mock the forward-program client — no RPC in unit tests)
4. Run the test suite: `pnpm run test`
5. Commit with conventional commits / gitmoji (the `release` config drives semver)
6. Push and create a pull request

### Development Setup

```bash
git clone https://github.com/tributary-so/tributary
cd tributary
pnpm install

# Build the SDK first (this package depends on it as a workspace package)
cd packages/sdk && pnpm run build

# Build this package
cd ../forward-builders && pnpm run build
```

## Troubleshooting

### `Cannot find module '@meteora-ag/dlmm'` (or Raydium / Orca / kit)

The forward-program SDKs are **optional peers** — install only the ones you
import:

```bash
pnpm add @meteora-ag/dlmm @raydium-io/raydium-sdk-v2 @orca-so/whirlpools @solana/kit
```

### `No ForwardBuilder for program <id>`

`getForwardBuilderFor` could not match the policy's
`instructionConstraint.programId` against the four known pubkeys. Either the
on-chain program is not in `ALLOWED_FORWARD_PROGRAMS` (rejected at execute
time regardless), or a new forward program was added to the allowlist
without a corresponding builder in this package. Add the builder, then
update `getForwardBuilderFor`.

### `DLMM swap instruction not found in pool.swap() output`

The Meteora SDK's `pool.swap()` returned a transaction whose instruction list
contained no instruction whose `programId` equals `METEORA_DLMM_PUBKEY`.
Usually a Meteora SDK version mismatch — re-pin `@meteora-ag/dlmm` to the
version this package was built against.

### `import` syntax error under jest

`@tributary-so/sdk` ships ESM-only. The jest config already maps it to
TypeScript source via `moduleNameMapper`; if you copy this config elsewhere,
keep the mapping:

```js
moduleNameMapper: { "^@tributary-so/sdk$": "<rootDir>/../sdk/src/index.ts" }
```

## Security

- **ADR-0008 type-level enforcement**: `ForwardAccountMeta` has no `isSigner`
  field — builder output cannot leak signer authority through the CPI boundary
- **Per-account `isWritable`** mirrors the forward program's own account list
  (no blanket over-permissioning)
- **On-chain constraint pinning**: `programId` + `pinnedAccounts` + swap
  discriminator are locked at policy-create time; the scheduler cannot route
  through an unreviewed pool or substitute a different instruction
- **Opt-in deps**: the heavy forward-program SDKs never enter the SDK's
  dependency graph — consumers who don't use composable forwards pay nothing

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Links

- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **ADR-0030** (this package's rationale): [composable execution primitives](https://github.com/tributary-so/tributary/blob/main/apps/docs/adr/0030-composable-execution-primitives.md)
- **ADR-0008** (CPI privilege boundary): [composable CPI privilege boundary](https://github.com/tributary-so/tributary/blob/main/apps/docs/adr/0008-composable-cpi-privilege-boundary.md)
- **Protocol Repository**: [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **NPM Package**: [npmjs.com/package/@tributary-so/forward-builders](https://www.npmjs.com/package/@tributary-so/forward-builders)

## Bumps

2026-07-29: minor bump to up and sync packages
