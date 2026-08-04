---
# tributary-axyb
title: Add ComposableDetailPanel (read-only) with forward + validation labels
status: completed
type: task
priority: normal
created_at: 2026-07-07T12:04:00Z
updated_at: 2026-07-07T12:15:12Z
parent: tributary-4vfp
blocked_by:
    - tributary-bq8r
---

Add the read-only detail panel for a selected composable policy.

**File:** apps/app/src/components/account/account-page.tsx

**Component: ComposableDetailPanel**

Props: `{ policy: { publicKey: PublicKey; account: ComposablePolicy }, userPayment: UserPaymentWithPolicies, formatAmount }`

NO action buttons (no execute/pause/delete). Purely informational.

**Sections:**

1. **Header**: "Composable Policy" + status badge. Badge color: purple/violet to distinguish from regular policies.

2. **Pull parameters**: Reuse the existing `getPolicyTypeKey` logic — ComposablePolicy has the same `policyType` enum (5 variants). Show type badge + variant-specific summary (amount for subscription, milestones for milestone, etc.). Read from `policy.account.policyType`.

3. **Forward config**:
   - `forwardConfig.instructionConstraint.programId` → truncated pubkey or "Disabled" when sentinel (Pubkey.default)
   - Input mint → Output mint (truncated pubkeys)

4. **Validation**:
   - Pre-validation: "Enabled" / "Disabled" (check preValidation variant)
   - Post-validation: same

5. **Stats**:
   - Payment count
   - Total input (formatAmount on totalInput, input mint)
   - Total output (formatAmount on totalOutput, output mint)

6. **Details** (DetailRow):
   - Policy address (copyable)
   - Recipient (copyable)
   - Gateway (copyable)
   - Token mint (copyable)
   - Memo (decoded from [u8; 32])
   - Rent payer (copyable)

**Acceptance:**
- [ ] ComposableDetailPanel renders all 6 sections
- [ ] NO action buttons anywhere
- [ ] Forward program shows "Disabled" when programId == Pubkey.default
- [ ] Validation labels show "Enabled" / "Disabled" correctly
- [ ] Stats use totalInput / totalOutput (NOT totalPaid)
- [ ] TypeScript clean

## Summary of Changes
- ComposableDetailPanel component added (read-only, no action buttons)
- 6 sections: header, memo, stats, forward config, validation hooks, details
- Forward program shows 'Disabled' when sentinel; validation shows 'Enabled'/'Disabled'
- Stats use totalInput/totalOutput (not totalPaid)
- TypeScript clean
