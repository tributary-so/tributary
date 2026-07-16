---
# tributary-gd1l
title: Export IdlEvents types from types.ts
status: todo
type: task
created_at: 2026-07-16T10:22:56Z
updated_at: 2026-07-16T10:22:56Z
parent: tributary-ijzd
---

In `packages/sdk/src/types.ts`, import `IdlEvents` from @coral-xyz/anchor. Export typed aliases for ALL events: `export type PaymentRecordEvent = IdlEvents<Tributary>["PaymentRecord"]`, plus ComposableExecuted, ComposablePolicyCreated, ComposablePolicyDeleted, ComposablePolicyStatusChanged, PaymentPolicyCreated, PaymentPolicyDeleted, PaymentPolicyStatusChanged, PaymentGatewayCreated, PaymentGatewayDeleted, GatewaySignerChanged, GatewayFeeRecipientChanged, GatewayFeeBpsChanged, ProgramConfigCreated, UserPaymentCreated, UserPaymentDeleted, ProgramAuthorityChanged, EmergencyPauseChanged, ReferralRewardDistributedRecord. Export from index.ts.
