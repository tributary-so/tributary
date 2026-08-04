---
# tributary-jlxy
title: Fix stale BN mock in sdk-x402 upto tests (.eq/.toString missing)
status: completed
type: bug
priority: high
created_at: 2026-07-07T07:11:52Z
updated_at: 2026-07-07T07:13:24Z
---

CI fails: 2 tests in packages/sdk-x402/test/upto.test.ts. Source upto.ts was hardened (2026-07-06) to compare BNs via .eq() instead of .toNumber() (avoids >2^53 truncation). Test mock bn.js + data helper bn() never got .eq()/.toString(), so policyMaxBn.eq(expectedBn) throws 'policyMaxBn.eq is not a function'.

Root cause: stale test mock, not a source bug. Source is correct.

## Acceptance
- [ ] Add .eq() + .toString() to jest.mock('bn.js') factory
- [ ] Add .eq() + .toString() to test data helper bn()
- [ ] pnpm --filter @tributary-so/sdk-x402 test → all 68 pass

## Summary of Changes

Two-line fix in packages/sdk-x402/test/upto.test.ts:
- jest.mock('bn.js') factory: added .eq() and .toString() to the mock BN instance.
- bn() data helper: same — added .eq() and .toString().

Root cause: source upto.ts:99-115 was correctly hardened (X-4, 2026-07-06) to compare BNs via .eq() instead of .toNumber() (avoids >2^53 truncation). The test mock predated that change and never grew .eq()/.toString(), so policyMaxBn.eq(expectedBn) threw.

Verification: 68/68 tests pass, 3/3 suites green. upto.ts coverage 74→77%.
