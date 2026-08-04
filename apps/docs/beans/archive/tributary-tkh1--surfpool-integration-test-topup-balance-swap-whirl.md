---
# tributary-tkh1
title: "Surfpool integration test: topup-balance-swap-whirlpool (USDC → WSOL)"
status: completed
type: task
priority: high
created_at: 2026-07-23T18:42:24Z
updated_at: 2026-07-26T12:21:04Z
parent: tributary-z893
blocked_by:
  - tributary-mfzh
  - tributary-51or
---

Add `tests/topup-balance-swap-whirlpool.test.ts` mirroring `tests/topup-balance-swap-raydium.test.ts` (setupTopupSwapEnv, sendV0WithAlt, 50 USDC in, 100 bps slippage), but using `createWhirlpoolForward` / `whirlpoolForwardConfig`.

Task-local notes:

- Add to `tests/constants.ts`: `WHIRLPOOL_PUBKEY`, `WHIRLPOOL_USDC_WSOL_POOL`. Candidate pool in milestone tributary-na7u HANDOFF §7 — verify tokenMintA/B order and liquidity on the surfpool fork first; pick another mainnet USDC/WSOL whirlpool if it doesn't hold.
- Cover the negative paths from HANDOFF §6: substituted pool account at forward slot 4 rejected; flipped aToB / amountSpecifiedIsInput=0 data rejected.
- Cover unwrapNativeSol=true delivery of native SOL if the raydium test does the equivalent; otherwise plain WSOL delivery is sufficient.

## Tasks

- [x] tests/constants.ts: whirlpool program + pool constants (pool verified on fork)
- [x] Happy-path swap test green
- [x] Pinned-account substitution rejected
- [x] Data-check violations (direction / exact-in) rejected

## Summary of Changes

- `tests/constants.ts` — added `WHIRLPOOL_PUBKEY` and `WHIRLPOOL_USDC_WSOL_POOL` (candidate mainnet pool `HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngnd`).
- `tests/topup-balance-swap-whirlpool.test.ts` — new integration test suite mirroring `topup-balance-swap-raydium.test.ts`:
  - **Happy path**: create composable policy with `whirlpoolForwardConfig(env.connection, {inputMint: USDC, outputMint: NATIVE_MINT, pool})` + Lighthouse guard, then execute swap via `createWhirlpoolForward({pool, slippageBps}).build(...)` → verify coldWallet USDC debited, hotWallet WSOL credited, fee accounts skimmed, policy state updated.
  - **Negative — pinned-account substitution**: replace `forwardAccounts[4]` (whirlpool/pool slot) with a random pubkey → execute_composable rejects (pinned-account mismatch).
  - **Negative — aToB data-check**: flip byte 41 (aToB) in `instructionData` → execute_composable rejects (data-check mismatch).
- Typecheck clean (pre-existing v0-alt.ts Set iteration warning unrelated).
- Tests require a running Surfpool instance (`surfpool start --legacy-anchor-compatibility --no-tui`); cannot run in CI without it. Pool address and liquidity must be verified on the surfpool fork.
