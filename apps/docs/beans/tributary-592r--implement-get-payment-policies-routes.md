---
# tributary-592r
title: Implement GET /payment-policies routes
status: todo
type: task
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T10:23:50Z
parent: tributary-vysi
---

Create apps/api/src/routes/payment-policies.ts with three routes: (1) GET / uses PaymentPolicyTracker.getPaymentPoliciesForOptions with same filter validation as subscription.ts (1-3 filters, wallet+mint paired). (2) GET /:address uses program.account.paymentPolicy.fetchNullable. (3) GET /:address/executions uses getPaymentExecutionsByPolicyAddress. Register in routes/index.ts. Add OpenAPI annotations.
