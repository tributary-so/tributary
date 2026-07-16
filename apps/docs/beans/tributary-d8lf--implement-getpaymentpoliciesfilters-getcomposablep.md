---
# tributary-d8lf
title: Implement getPaymentPolicies(filters) + getComposablePolicies(filters)
status: todo
type: task
created_at: 2026-07-16T10:22:56Z
updated_at: 2026-07-16T10:22:56Z
parent: tributary-oos2
---

In `packages/sdk/src/sdk.ts`, add two methods that accept a combined filter object `{userPayment?, gateway?, recipient?, trackingId?}` and build GetProgramAccountsFilter[] arrays with correct memcmp offsets for each family. PaymentPolicy offsets: user_payment=8, recipient=40, gateway=72, memo=222 (8+32+32+32+118). ComposablePolicy offsets: user_payment=9 (after bump), gateway=41, recipient=TBD (end of struct), memo=TBD. For ComposablePolicy, if recipient/memo offsets are hard to compute (fields after variable-size ForwardConfig+ValidationSpec), post-filter in JS. Use existing getComposablePoliciesByGateway/getComposablePoliciesByUserPayment as reference for proven offsets.
