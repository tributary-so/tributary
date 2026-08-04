---
# tributary-8xka
title: Fetch composable policies alongside regular policies in account-page.tsx
status: completed
type: task
priority: normal
created_at: 2026-07-07T12:02:56Z
updated_at: 2026-07-07T12:15:12Z
parent: tributary-4vfp
blocked_by:
    - tributary-bq8r
---

Extend the fetch logic in AccountPage to also load composable policies per UserPayment.

**File:** apps/app/src/components/account/account-page.tsx

**Changes:**

1. Extend `UserPaymentWithPolicies` interface:
```typescript
interface UserPaymentWithPolicies {
  userPaymentAddress: PublicKey
  userPayment: UserPayment
  policies: Array<{ publicKey: PublicKey; account: PaymentPolicy }>
  composablePolicies: Array<{ publicKey: PublicKey; account: ComposablePolicy }>  // NEW
}
```

2. In `fetchPolicies` (line ~1429), after fetching regular policies per UserPayment, also fetch composables:
```typescript
const composables = await sdk.getComposablePoliciesByUserPayment(userPayment.publicKey)
```
Group them under the same UserPayment entry.

3. Add `ComposablePolicy` to imports from `@tributary-so/sdk`.

4. `totalPolicies` count (line 1741) includes composables: `sum + up.policies.length + up.composablePolicies.length`.

**Acceptance:**
- [ ] UserPaymentWithPolicies carries composablePolicies array
- [ ] fetchPolicies loads composables per UserPayment
- [ ] composablePolicies initialized to [] when none found
- [ ] TypeScript clean

## Summary of Changes
- Extended UserPaymentWithPolicies with composablePolicies array
- Added SelectedPolicy discriminated union (regular | composable)
- fetchPolicies now loads composables via sdk.getComposablePoliciesByUserPayment
- totalPolicies count includes composables
- TypeScript clean, no new lint errors
