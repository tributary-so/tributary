---
# tributary-ztg6
title: SDK — composable policy read methods
status: todo
type: feature
priority: high
created_at: 2026-07-06T16:33:04Z
updated_at: 2026-07-06T16:40:57Z
parent: tributary-t2mh
---

Add read convenience methods for ComposablePolicy. Field order differs from PaymentPolicy:

```
disc(8) + bump(1) + user_payment(32) + gateway(32) + status + rent_payer(32) + policy_type(128) + forward_config + pre_val + post_val + memo(32) + recipient(32) + ...
```

Methods to implement:
- `getComposablePoliciesByUserPayment(up)` → memcmp **offset 9**
- `getComposablePoliciesByGateway(gw)` → memcmp **offset 41**
- `getAllComposablePolicies()` → no filter
- `getComposablePolicy(addr)` → fetchNullable
- ~~getComposablePoliciesByRecipient~~ → DEFERRED (recipient is deep, offset may be variable)

Do NOT copy PaymentPolicy offsets — bump:u8 shifts everything by 1.
