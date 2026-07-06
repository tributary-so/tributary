---
# tributary-dr6j
title: Adapt account-page.tsx to render the OneTime policy variant
status: completed
type: task
priority: high
created_at: 2026-06-30T18:41:39Z
updated_at: 2026-06-30T18:47:52Z
---

Add a `oneTime` adaptor to apps/app/src/components/account/account-page.tsx so the new PolicyType variant (ADR-0019) renders correctly: type-key detection, badge config, detail panel, due/expiry gating in getNextPaymentDue/isPaymentDue, and dispatch in the selected-policy render. Add a Send icon to icons.ts and a oneTime color palette to tailwind.config.js.

## Summary of Changes

Adapted `account-page.tsx` so the OneTime `PolicyType` variant (ADR-0019) renders end-to-end:

**`apps/app/src/icons.ts`** — added `Send` to the lucide-react re-export (paper-plane = single dispatch).

**`apps/app/tailwind.config.js`** — added a `oneTime` color palette (violet HSL ~262), mirroring the existing per-variant pattern.

**`apps/app/src/components/account/account-page.tsx`:**
- `PolicyTypeKey` union + `getPolicyTypeKey` now detect `oneTime` (no longer falls through to `payAsYouGo`).
- `POLICY_TYPE_CONFIG.oneTime` entry with the `Send` icon + violet palette.
- `getNextPaymentDue`: OneTime arm — `Completed` / `Expired` / `Overdue` / `Due now` / relative due date.
- `isPaymentDue`: OneTime arm — `due_date <= 0` means due now; rejects if past `expiryDate`.
- `PolicyCard` `isOverdue` useMemo: OneTime arm — only flags overdue when `due_date > 0` and past (immediate policies show "Due now" without going red).
- NEW `OneTimeDetailPanel`: amount hero, due/expiry cards, status stat, policy details — mirrors the structure of `SubscriptionDetailPanel`/`MilestoneDetailPanel`/`PayAsYouGoDetailPanel`. Action buttons disable sensibly: execute disabled when `Completed`/`Expired`/not due; toggle disabled when `Completed` (terminal).
- Main render: added `{'oneTime' in selectedPolicy.account.policyType && <OneTimeDetailPanel .../>}` dispatch.
- `EmptyState` copy + icon row mentions the One-time variant.

**Verification:** `tsc -b` (apps/app) clean. `eslint .` reports 3 pre-existing `any`-type errors in account-page.tsx (lines 552/1046/1093 pre-change → 582/1220/1267 post-change); zero new lint errors introduced by this work.
