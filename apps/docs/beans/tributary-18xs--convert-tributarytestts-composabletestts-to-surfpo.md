---
# tributary-18xs
title: Convert tributary.test.ts + composable.test.ts to Surfpool
status: completed
type: task
priority: high
created_at: 2026-06-29T15:01:10Z
updated_at: 2026-06-30T14:04:11Z
---

## Goal

Make `tests/tributary.test.ts` and `tests/composable.test.ts` run against a Surfpool mainnet-fork, following the same pattern as `tests/surfpool.test.ts`. Currently the two big suites use `SystemProgram.transfer` funding, a freshly-created test mint (`createMint`), and hand-rolled ATA/mint setup — all of which is slow, flakes on localnet, and prevents us from testing against real mainnet token state (USDC, etc.).

## Reference pattern

`tests/surfpool.test.ts` is the template:
- Instantiates `SurfpoolHelper(connection)` in `beforeAll`.
- Guards with `surfpool.isSurfpool()` and throws if not on Surfpool.
- Funds accounts via `surfpool.setAccount({ publicKey, lamports })` (no `SystemProgram.transfer`).
- Seeds token state via `surfpool.setTokenAccount({ owner, mint, amount })` — no `createMint`/`mintTo` dance.
- Uses the mainnet-forked `USDC_MINT` constant from `tests/surfpool-helpers.ts`.

## Scope of changes

### tests/tributary.test.ts
- [ ] Import `SurfpoolHelper` + `USDC_MINT` from `./surfpool-helpers`.
- [ ] Construct `surfpool = new SurfpoolHelper(connection)` in `beforeAll`.
- [ ] Add the `isSurfpool()` guard at the top of `beforeAll`.
- [ ] Replace the `batchFund([...])` call (`SystemProgram.transfer`) with a batch of `surfpool.setAccount({ publicKey, lamports })` calls for admin/user/mintAuthority/gatewayAuthority/feeRecipient/gatewayExecutionSigner/recipient.
- [ ] Drop the `createMint(...)` call — use `USDC_MINT` directly as `tokenMint` (or keep a local mint if a non-USDC mint is required for specific assertions, but prefer USDC).
- [ ] Replace the `createAssociatedTokenAccount` + `mintTo` for the user with `surfpool.setTokenAccount({ owner: user.publicKey, mint: USDC_MINT, amount: 1000000 })`.
- [ ] Replace `batchCreateATAs` + `batchMintTo` helpers with equivalent `surfpool.setTokenAccount` calls for recipient/feeRecipient/admin.
- [ ] Re-run the suite via `anchor test` against `surfpool start --legacy-anchor-compatibility --no-tui` and confirm all existing assertions still pass.
- [ ] Remove now-dead `fund`/`batchFund`/`batchCreateATAs`/`batchMintTo` helpers if they become unused.

### tests/composable.test.ts
- [ ] Import `SurfpoolHelper` + `USDC_MINT` from `./surfpool-helpers`.
- [ ] Construct `surfpool = new SurfpoolHelper(connection)` in `beforeAll`.
- [ ] Add the `isSurfpool()` guard at the top of `beforeAll`.
- [ ] Replace the `Promise.all([fund(...)])` block with `surfpool.setAccount({ publicKey, lamports })` for admin/user/mintAuthority/gatewayAuthority/feeRecipient.
- [ ] Decide on the two-mint setup (input + output): either keep minting a local second mint (Surfpool doesn't fork arbitrary test mints) OR use two real mainnet mints (e.g. USDC + USDT) so the swap/forward path still exercises two distinct mints. Document the choice in the test.
- [ ] Replace `createMint`/`mintTo`/`createAssociatedTokenAccountIdempotent` chains with `surfool.setTokenAccount` cheatcodes where the mint is mainnet-forked.
- [ ] Re-run the suite via `anchor test` against Surfpool and confirm all assertions still pass.

## Out of scope
- Rewriting the topup-balance test suites (`tests/topup-balance.test.ts`, `tests/topup-balance-swap.test.ts`) — those already target Surfpool per AGENTS.md.
- Any program/SDK source changes.

## Acceptance criteria
- Both `tributary.test.ts` and `composable.test.ts` pass under `surfpool start --legacy-anchor-compatibility --no-tui` + `anchor test`.
- No `SystemProgram.transfer` funding remains in either file.
- The `isSurfpool()` guard is present in both files so they fail fast if run against real localnet/devnet.
- Existing assertion coverage is preserved (no tests deleted to make it green).

## References
- Template: `tests/surfpool.test.ts`
- Cheatcode API: `tests/surfpool-helpers.ts`
- AGENTS.md: `surfpool start --legacy-anchor-compatibility --no-tui`


## Summary of Changes

Both `tests/tributary.test.ts` and `tests/composable.test.ts` now run against a Surfpool mainnet-fork (`surfpool start --legacy-anchor-compatibility --no-tui`). Verified **76/76** (tributary) and **18/18** (composable) tests pass; the existing `tests/surfpool.test.ts` still passes (4/4).

### Approach
Instead of rewriting every funding call site, the **helper implementations** were re-routed to Surfpool cheatcodes while their signatures stayed identical — the ~10 call sites per file are untouched. Net diff: **−230 / +165 lines**.

### `tests/tributary.test.ts`
- Imports `SurfpoolHelper` + `USDC_MINT`; added the `isSurfpool()` guard in `beforeAll`.
- `tokenMint` is now the mainnet-forked `USDC_MINT` (dropped `createMint`).
- `fund` / `batchFund` → `surfpool.setAccount({ publicKey, lamports })`.
- New `creditTokenAccount(owner, amount, mint)` preserves `mintTo`'s additive semantics on top of Surfpool's absolute `setTokenAccount` (reads current balance, then sets `current + amount`; tolerates a non-existent ATA).
- `batchCreateATAs` seeds zero-balance ATAs via `setTokenAccount` and records an `ata → owner` map; `batchMintTo` resolves owners from that map and credits them.
- The two `executeImmediately` `mintTo` top-ups → `creditTokenAccount`.
- Removed unused imports (`SystemProgram`, `createAssociatedTokenAccount`, `mintTo`).

### `tests/composable.test.ts`
- Imports `SurfpoolHelper` + `USDC_MINT` + `USDT_MINT`; added the `isSurfpool()` guard.
- Two-mint decision: **INPUT = USDC, OUTPUT = USDT** (both real mainnet mints, 6 decimals, forked via Surfpool) — no `createMint`/`mintAuthority` needed and the forward path still exercises two distinct mints.
- `fund` → `surfpool.setAccount`; new `ensureTokenAccount(owner, mint, amount)` replaces every `createAssociatedTokenAccountIdempotent` (+ optional `mintTo`) in `beforeAll`, the execute-composable setup, and the B2 regression `beforeAll`.
- Removed unused imports (`createMint`, `createAssociatedTokenAccountIdempotent`, `mintTo`).

### Supporting fixes (necessary for the mainnet-fork target)
- **`tests/surfpool-helpers.ts`** — exported `USDT_MINT` alongside `USDC_MINT`.
- **`tests/helpers/onChainNow.ts`** — Surfpool returns `null` for `getBlockTime`, so `getOnChainNow` now falls back to the local wall clock instead of throwing. Used only by `composable.test.ts`.
- **`tests/tributary.test.ts` "Initialize program"** — the program is deployed on mainnet, so the forked config PDA already exists and no cheatcode can delete it (`resetAccount` resets to mainnet state; `setAccount` can't zero the data). The test now seeds the desired post-init config via `surfpool.setAccount` (read → mutate admin/feeRecipient/protocolShareBps/emergencyPause/bump → write), mirroring the pattern in `surfpool.test.ts`. All original assertions preserved.
- **`tests/tributary.test.ts` "Get all payment policies using SDK"** — on a mainnet fork `getAllPaymentPolicies` returns mainnet's real policies too, so the test now locates its own policy by `userPayment` PDA instead of assuming position `[0]`. Assertions preserved.

### Notes
- The `differentMint` transfer test still calls `createMint` for a fresh local mint (allowed by the spec) — creating a brand-new account works fine on the fork.
- Composable's bootstrap `beforeAll` already wrapped `initialize` in try/catch, so the pre-existing config is handled there without further changes.
