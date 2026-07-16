---
# tributary-d8lf
title: Implement getPaymentPolicies(filters) + getComposablePolicies(filters)
status: completed
type: task
priority: normal
created_at: 2026-07-16T10:22:56Z
updated_at: 2026-07-16T11:30:49Z
parent: tributary-oos2
---

In `packages/sdk/src/sdk.ts`, add two methods that accept a combined filter object `{userPayment?, gateway?, recipient?, trackingId?}` and build GetProgramAccountsFilter[] arrays with correct memcmp offsets for each family. PaymentPolicy offsets: user_payment=8, recipient=40, gateway=72, memo=222 (8+32+32+32+118). ComposablePolicy offsets: user_payment=9 (after bump), gateway=41, recipient=TBD (end of struct), memo=TBD. For ComposablePolicy, if recipient/memo offsets are hard to compute (fields after variable-size ForwardConfig+ValidationSpec), post-filter in JS. Use existing getComposablePoliciesByGateway/getComposablePoliciesByUserPayment as reference for proven offsets.

## Summary of Changes

Added `getPaymentPolicies(filters?)` and `getComposablePolicies(filters?)` combined-filter methods to `packages/sdk/src/sdk.ts`, plus private `buildPaymentPolicyFilters` / `buildComposablePolicyFilters` helpers.

**Offsets used (calculated from authoritative Rust struct definitions):**
- PaymentPolicy: user_payment=8, recipient=40, gateway=72, memo=234 (8+32+32+32+129+1)
- ComposablePolicy: user_payment=9, gateway=41, memo=506, recipient=538

**Note on memo offset discrepancy:** The bean brief stated PaymentPolicy memo=222 (8+32+32+32+118), but the correct offset is **234** because `PolicyType::TOTAL_SIZE = 129` (1-byte enum discriminant + 128-byte variant), not 117. The existing `packages/payments/src/core/tracking.ts:129` also uses the incorrect 222 offset — this is a pre-existing bug that will be resolved when the tracker is refactored to delegate to these SDK methods in a later milestone task.

All ComposablePolicy fields (including recipient and memo) are at fixed offsets — ForwardConfig (205 bytes) and ValidationSpec (33 bytes) are fixed-size, so no post-filter fallback is needed.

**Verification:**
- `pnpm --filter @tributary-so/sdk exec tsc --noEmit` — clean
- `pnpm --filter @tributary-so/sdk run build` — success
- `pnpm --filter @tributary-so/payments test` — 265/265 pass
- `pnpm --filter @tributary-so/sdk run lint` — clean
