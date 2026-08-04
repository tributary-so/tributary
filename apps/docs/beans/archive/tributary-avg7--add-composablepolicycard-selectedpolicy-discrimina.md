---
# tributary-avg7
title: Add ComposablePolicyCard + SelectedPolicy discriminated union
status: completed
type: task
priority: normal
created_at: 2026-07-07T12:03:34Z
updated_at: 2026-07-07T12:15:12Z
parent: tributary-4vfp
blocked_by:
    - tributary-bq8r
---

Add a discriminated union for selection and a ComposablePolicyCard list item.

**File:** apps/app/src/components/account/account-page.tsx

**Changes:**

1. Add `SelectedPolicy` discriminated union:
```typescript
type SelectedPolicy =
  | { kind: 'regular'; publicKey: PublicKey; account: PaymentPolicy }
  | { kind: 'composable'; publicKey: PublicKey; account: ComposablePolicy }
```

2. Replace `selectedPolicy` state (line 1378) with `SelectedPolicy | null`.

3. Add `ComposablePolicyCard` component (mirrors PolicyCard but with a "Composable" badge):
   - "Composable" badge (distinct color — e.g. purple/violet)
   - Status badge, memo (decoded from [u8; 32]), recipient (truncated), payment count
   - Summary: forward program pubkey (truncated) or "Direct" if forward disabled
   - No action buttons in card (read-only)

4. Render composablePolicies in the same UserPayment group, after regular policies:
```tsx
{policies.map(p => <PolicyCard ... />)}
{composablePolicies.map(p => <ComposablePolicyCard ... />)}
```

**Acceptance:**
- [ ] SelectedPolicy discriminated union added
- [ ] ComposablePolicyCard renders with badge + memo + recipient + payment count
- [ ] Composables appear under the same UserPayment grouping
- [ ] Clicking a composable card selects it (sets SelectedPolicy with kind='composable')
- [ ] TypeScript clean

## Summary of Changes
- SelectedPolicy discriminated union added (kind: regular | composable)
- ComposablePolicyCard component added with violet badge, forward/direct summary
- Composables rendered in the same UserPayment grouping after regular policies
- Clicking a composable sets selectedPolicy with kind='composable'
- TypeScript clean
