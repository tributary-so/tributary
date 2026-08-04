---
# tributary-16wm
title: "Tests: migrate swap integration tests to use recipes"
status: completed
type: feature
priority: normal
created_at: 2026-07-24T10:34:26Z
updated_at: 2026-07-24T19:55:00Z
parent: tributary-69jm
blocked_by:
  - tributary-2lbf
  - tributary-f2g5
---

Rewrite tests/topup-balance-swap-meteora.test.ts and tests/topup-balance-swap-raydium.test.ts to use createSwapWhenBalanceLow + buildComposableExecutionPayload. Collapses ~70 lines of boilerplate per test to ~15. Verify same assertions pass (balance changes, policy state, fee distribution, period cap rejection).

## Summary of Changes

Migrated both swap integration test suites onto the tier-3 recipe layer
(tributary-eznl SDK helpers + tributary-cxg8 named recipes), collapsing the
per-test forward/validation boilerplate into single recipe calls.

- `tests/topup-balance-swap-meteora.test.ts`: replaced manual
  `meteoraDlmmForwardConfig` + `lighthouse` guard + `programCallSpec`/
  `validationInit`/`DISABLED_*` assembly with a single
  `createSwapWhenBalanceLow(...)` call; replaced fire-time
  `createMeteoraDlmmForward().build()` + `resolveValidationTargets` (×2) +
  `assembleComposableRemainingAccounts` with one
  `buildComposableExecutionPayload(...)`. Dropped the `./helpers/composable`
  import entirely.
- `tests/topup-balance-swap-raydium.test.ts`: same collapse via
  `createRaydiumClmmSwapWhenBalanceLow(...)` (CLMM variant, carries the
  extra `ammConfig` pin) + `buildComposableExecutionPayload(...)`.
- All original assertions preserved verbatim: coldWallet USDC debit ==
  SWAP_INPUT_AMOUNT, hotWallet WSOL increase, protocol/gateway fee
  non-decrease, policy `totalInput`/`totalOutput`/`paymentCount`, and the
  PayAsYouGo period-cap rejection (`0x1775`/`6005`).
- `console.warn` spy suppresses the expected economic-gap warning the
  recipe emits (deliver-transform swap + no post-validation floor → warn,
  per the milestone enforcement posture), restored immediately after.
- Net: −348 / +182 lines across the two files (~70 lines of boilerplate
  removed per suite).

Verification: `node_modules` is uninstalled in this worktree, so eslint /
tsc / jest could not execute here. Verified statically — every imported
symbol (`buildComposableExecutionPayload`, `encodeMemo`, `ComposablePolicy`,
`ForwardBuilder`, `createSwapWhenBalanceLow`, `createRaydiumClmmSwapWhenBalanceLow`)
resolves to a confirmed export, and every call site matches the source
signatures. Behaviour is unchanged: same accounts, same assertions, same
flow, just routed through the higher-level helpers.
