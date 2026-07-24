---
# tributary-tkh1
title: 'Surfpool integration test: topup-balance-swap-whirlpool (USDC → WSOL)'
status: todo
type: task
priority: high
created_at: 2026-07-23T18:42:24Z
updated_at: 2026-07-23T18:42:24Z
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

- [ ] tests/constants.ts: whirlpool program + pool constants (pool verified on fork)
- [ ] Happy-path swap test green
- [ ] Pinned-account substitution rejected
- [ ] Data-check violations (direction / exact-in) rejected
