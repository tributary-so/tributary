---
# tributary-bq8r
title: Add getComposablePolicy + getComposablePoliciesByUserPayment + getComposablePoliciesByGateway to SDK
status: completed
type: task
priority: normal
created_at: 2026-07-07T12:02:37Z
updated_at: 2026-07-07T12:06:46Z
parent: tributary-ztg6
---

Mirror the existing PaymentPolicy read pattern for ComposablePolicy.

**Files:** packages/sdk/src/sdk.ts

**Methods to add (after the existing getPaymentPolicy block, ~line 3231):**

```typescript
async getComposablePolicy(address: PublicKey): Promise<ComposablePolicy | null>
async getComposablePoliciesByUserPayment(userPayment: PublicKey): Promise<Array<{ publicKey: PublicKey; account: ComposablePolicy }>>
async getComposablePoliciesByGateway(gateway: PublicKey): Promise<Array<{ publicKey: PublicKey; account: ComposablePolicy }>>
async getAllComposablePolicies(): Promise<Array<{ publicKey: PublicKey; account: ComposablePolicy }>>
```

**memcmp offsets** (Borsh, no alignment padding in Anchor):
- ComposablePolicy layout: [8 disc][1 bump][32 user_payment][32 gateway]...
- `user_payment` → **offset 9** (disc 8 + bump 1)
- `gateway` → **offset 41** (9 + 32)

**Acceptance:**
- [x] 4 methods added, each with JSDoc
- [x] memcmp offsets match ComposablePolicy layout (9, 41)
- [x] getComposablePolicy uses fetchNullable
- [x] ComposablePolicy type already exported from types.ts (line 71)
- [x] SDK typecheck clean
