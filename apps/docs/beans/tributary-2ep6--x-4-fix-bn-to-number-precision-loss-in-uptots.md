---
# tributary-2ep6
title: 'X-4: Fix BN to number precision loss in upto.ts'
status: todo
type: task
priority: normal
created_at: 2026-07-06T15:42:03Z
updated_at: 2026-07-06T15:42:03Z
parent: tributary-jnx8
---

upto.ts:92 — policy.policyType.upTo?.maxAmount.toNumber() may lose precision for large amounts. Use BN comparison.
