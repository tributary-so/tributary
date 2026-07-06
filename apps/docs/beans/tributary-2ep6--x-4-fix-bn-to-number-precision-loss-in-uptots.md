---
# tributary-2ep6
title: 'X-4: Fix BN to number precision loss in upto.ts'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:03Z
updated_at: 2026-07-06T16:46:40Z
parent: tributary-jnx8
---

upto.ts:92 — policy.policyType.upTo?.maxAmount.toNumber() may lose precision for large amounts. Use BN comparison.

## Summary of Changes
Fixed BN precision loss in packages/sdk-x402/src/upto.ts:92. The previous form policy.policyType.upTo?.maxAmount.toNumber() ?? 0 silently truncates amounts > 2^53. Now compares via policyMaxBn.eq(new BN(expectedMaxAmount)) and rejects expected values outside Number.isSafeInteger range so callers are forced to migrate to a BN-bearing API for large token amounts.
