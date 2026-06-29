---
# tributary-18xs
title: Convert tributary.test.ts + composable.test.ts to Surfpool
status: todo
type: task
priority: high
created_at: 2026-06-29T15:01:10Z
updated_at: 2026-06-29T15:01:10Z
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
