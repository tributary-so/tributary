---
# tributary-na7u
title: Add Orca Whirlpool (swapV2) forward support — swap only
status: completed
type: milestone
priority: high
created_at: 2026-07-23T14:19:57Z
updated_at: 2026-07-26T18:30:02Z
---

Add Orca Whirlpool as the fourth ALLOWED_FORWARD_PROGRAM so composable policies can route pulls through Whirlpool concentrated-liquidity pools (e.g. pull USDC, deliver WSOL). Scope is **swapping only** — no position/LP forwards (increaseLiquidity is a separate, Act-shaped follow-up).

Follows the exact pattern of the existing Meteora DLMM and Raydium CPMM/CLMM forwards: a fire-time `ForwardBuilder` + a setup-time `ForwardConfig` constraint, co-located in one module (ADR-0030), plus the on-chain allowlist entry and a surfpool integration test.

## HANDOFF

### 1. Happy Path

1. Owner creates a composable policy with `whirlpoolForwardConfig({ inputMint, outputMint, pool, ... })` → `create_composable_policy` stores the InstructionConstraint (program pinned, pool pinned, swapV2 selector pinned).
2. At fire time, scheduler/CLI calls `createWhirlpoolForward({ pool, slippageBps }).build({ connection, policy, composablePolicyPda, face })`.
3. Builder fetches the pool + tick arrays + oracle, quotes `face` exact-in, builds the Whirlpool `swapV2` instruction with `tokenAuthority = composablePolicyPda` and the PDA's ATAs as `tokenOwnerAccountA/B`, returns `{ instructionData, forwardAccounts }` (no isSigner — assembler stamps false; `execute_composable` re-signs the CPI with the ComposablePolicy PDA seeds via `invoke_signed`, see `build_forward_account_metas`, execute_composable.rs).
4. Tributary sweeps the output intermediate to the recipient; `unwrapNativeSol` (forward_flags bit 0) unwraps WSOL → SOL when configured.

### 2. Data Contract

- Whirlpool program id: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` → new const `WHIRLPOOL_PUBKEY` in `packages/forward-builders/src/constants.ts` and new entry in `ALLOWED_FORWARD_PROGRAMS` (programs/tributary/src/constants.rs).
- Instruction: **swapV2** (Token-2022-aware). Discriminator `[43, 4, 237, 11, 26, 201, 30, 98]` = sha256("global:swapV2")[0..8] → export `WHIRLPOOL_SWAP_V2_DISCRIMINATOR`.
- swapV2 account order (fixed): 0 tokenProgramA, 1 tokenProgramB, 2 memoProgram, 3 tokenAuthority (signer = composablePolicyPda), **4 whirlpool (pool — pin here)**, 5 tokenMintA, 6 tokenMintB, 7 tokenOwnerAccountA, 8 tokenVaultA, 9 tokenOwnerAccountB, 10 tokenVaultB, 11–13 tickArray0-2, 14 oracle, 15–16 supplemental tick arrays (remaining accounts). 17 forward accounts total.
- swapV2 data layout: disc[0..8] | amount u64[8..16] | otherAmountThreshold u64[16..24] | sqrtPriceLimit u128[24..40] | amountSpecifiedIsInput bool[40] | aToB bool[41] | remainingAccountsInfo (option).
- Constraint (`whirlpoolForwardConfig`): dataChecks = [ {offset 0, len 8, swapV2 discriminator}, {offset 40, len 1, 0x01 — exact-in only}, {offset 41, len 1, aToB — direction locked} ]; pinnedAccounts = [{ index: 4, pubkey: pool }]. Stronger than the Meteora config (which pins only selector + pool); direction pinning matters for Act-shaped policies with no output-sweep floor.
- `aToB = inputMint.equals(pool.tokenMintA)` — the config function must fetch the pool once at setup time (async, takes Connection) and validate inputMint/outputMint match the pool's two mints.
- Public surface: `createWhirlpoolForward(opts: WhirlpoolForwardOptions): ForwardBuilder`, `whirlpoolForwardConfig(connection, opts): Promise<ForwardConfig>`, `WHIRLPOOL_SWAP_V2_DISCRIMINATOR`, `WHIRLPOOL_PUBKEY` — all exported from `packages/forward-builders/src/index.ts`.
- Modules touched: `programs/tributary/src/constants.rs`, `packages/forward-builders/src/{whirlpool.ts,whirlpool.test.ts,constants.ts,index.ts}`, `packages/forward-builders/package.json` (new deps), `tests/{constants.ts,topup-balance-swap-whirlpool.test.ts}`, `apps/scheduler/src/composable.ts` (builder dispatch).

### 3. Edge Cases & Constraints

- **Dependency interop**: `@orca-so/whirlpools` (maintained SDK) is @solana/kit v2; forward-builders is web3.js v1. Use the kit SDK **internally only**: `createSolanaRpc(connection.rpcEndpoint)` from the v1 Connection, `createNoopSigner(address(composablePolicyPda))` as signer, then convert the kit Instruction → `{ pubkey: new PublicKey(a.address), isWritable: role WRITABLE|WRITABLE_SIGNER }`. Kit types must NOT leak into the package's public API. Fallback if interop is painful: legacy `@orca-so/whirlpools-sdk` (web3.js v1) with `WhirlpoolIx.swapV2Ix` — note it in the bean if taken.
- Extract ONLY the instruction with `programAddress === WHIRLPOOL_PROGRAM_ADDRESS` from `swapInstructions()` output; drop ATA-create/wrap/cleanup ixs — Tributary owns the intermediate lifecycle (same as Meteora/Raydium builders).
- Call `setNativeMintWrappingStrategy("ata")` inside every `build()` — it is module-global state in the Orca SDK; do not trust ambient config. The PDA's WSOL must live in its ATA for the sweep + unwrapNativeSol path.
- Tick arrays (3 primary + 2 supplemental) and oracle shift with price — fire-time-variable, NOT pinned. Only selector, direction, exact-in byte, and pool are pinned.
- Slippage rides in `otherAmountThreshold` inside the pinned-selector ix (`sqrtPriceLimit = 0`), same trust model as DLMM `minOutAmount`.
- Never emit `isSigner` from the builder (ForwardAccountMeta has no such field — ADR-0008).

### 4. Business Logic (pseudo-code)

```ts
// fire half
const rpc = createSolanaRpc(connection.rpcEndpoint);
setNativeMintWrappingStrategy("ata");
const signer = createNoopSigner(address(composablePolicyPda.toBase58()));
const { instructions } = await swapInstructions(rpc,
  { inputAmount: BigInt(face.toString()), mint: address(inputMint.toBase58()) },
  address(pool.toBase58()), { slippageToleranceBps: slippageBps, signer });
const swapIx = instructions.find(i => i.programAddress === WHIRLPOOL_PROGRAM_ADDRESS);
return { instructionData: Buffer.from(swapIx.data),
         forwardAccounts: swapIx.accounts.map(kitMetaToForwardMeta) };
```

### 5. Definition of Done

- [ ] `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` in ALLOWED_FORWARD_PROGRAMS, `anchor build` green
- [ ] `whirlpool.ts` builder + config implemented and exported; typecheck green
- [ ] Unit tests: discriminator = sha256("global:swapV2")[0..8]; config pins pool at index 4, exact-in byte, aToB byte; config rejects mints not matching the pool
- [ ] Surfpool integration test `topup-balance-swap-whirlpool.test.ts` (USDC → WSOL) green
- [ ] Scheduler dispatches builder by `instructionConstraint.programId` (all four programs)

### 6. Test Matrix (Given / When / Then)

- Given a composable policy with whirlpoolForwardConfig(USDC→WSOL, pool P), When the scheduler fires with face=50 USDC, Then execute_composable swaps through P and the recipient receives ≥ minOut WSOL.
- Given the same policy, When a caller substitutes a different whirlpool account at forward slot 4, Then execute_composable rejects (pinned-account mismatch).
- Given the same policy, When the forward ix data carries aToB flipped or amountSpecifiedIsInput=0, Then execute_composable rejects (data-check mismatch).
- Given unwrapNativeSol=true and outputMint=NATIVE_MINT, When settlement runs, Then the recipient receives native SOL (closeAccount sweep).

### 7. Open Questions

- Integration-test pool: candidate mainnet SOL/USDC whirlpool `HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ` — verify tokenMintA/B order and liquidity on surfpool fork before hardcoding in tests/constants.ts (TBD).
- Whether to also expose an ExactOut variant — assumed NO for this milestone (exact-in byte is pinned).
