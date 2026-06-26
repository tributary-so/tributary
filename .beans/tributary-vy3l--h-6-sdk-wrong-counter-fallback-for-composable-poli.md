---
# tributary-vy3l
title: 'H-6: SDK wrong-counter fallback for composable policyId'
status: completed
type: bug
priority: high
created_at: 2026-06-25T13:28:14Z
updated_at: 2026-06-26T07:29:14Z
parent: tributary-etbw
---

sdk.ts:2028 computes composable policyId with a fallback to createdPoliciesCount+1 when createdComposableCount is undefined. ComposablePolicy and PaymentPolicy have INDEPENDENT counters (per AGENTS.md). The fallback derives a composable PDA from the regular-policy counter, colliding with an existing PaymentPolicy PDA on the same UserPayment and producing a wrong-account error at best, wrong-policy-at-worst.

Impact: composable policy creation fails or targets the wrong PDA when the SDK/IDL hasn't typed createdComposableCount yet.

Fix: drop the fallback. createdComposableCount is on-chain since the composable feature shipped; require it. If a legacy UserPayment somehow lacks it, treat as 0 (first composable) — never alias to createdPoliciesCount.

Location: packages/sdk/src/sdk.ts:2028-2030
Verify: unit test that policyId for composable #N on a UserPayment that also holds M regular policies equals N (not M).

## Summary of Changes

H-6 fixed: composable policyId no longer aliases to createdPoliciesCount when createdComposableCount is absent.

**Root cause:** `sdk.ts:2032-2038` derived the composable policyId with a fallback to `createdPoliciesCount + 1` when `createdComposableCount` was undefined. ComposablePolicy and PaymentPolicy maintain INDEPENDENT counters on the same UserPayment PDA, so the fallback produced a composable PDA that collided with an existing PaymentPolicy PDA.

**Fix:**
- Extracted the policyId derivation to a pure helper `nextComposablePolicyId` in `packages/sdk/src/utils.ts` (exported via the package index).
- Helper: `(userPayment?.createdComposableCount ?? 0) + 1`. Null account or missing field → id 1 (first composable). Never aliases to createdPoliciesCount.
- Replaced the buggy 6-line block in `sdk.ts` with a one-line call to the helper; removed the `as any` cast (the IDL-derived type now has the field).

**Tests added** (`tests/sdk-h6.test.ts`, 4 cases):
- null UserPayment → id 1
- legacy shape (only createdPoliciesCount present) → id 1, not createdPoliciesCount+1
- both counters present → uses composable counter, ignores regular counter
- the dangerous case (composable=3, regular=99) → 4, not 100

**Harness:** added `test-sdk` script to `Anchor.toml` and chained it into the default `test` runner so the SDK unit test runs as part of `anchor test`.

**Verification:** `anchor test` → 70 cargo + 4 SDK + 76 tributary + 18 composable = 168 tests, 0 failures.
