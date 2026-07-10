---
# tributary-qpy3
title: Composable policy actions in the app — pause + delete parity
status: todo
type: feature
priority: high
created_at: 2026-07-10T10:11:50Z
updated_at: 2026-07-10T10:11:50Z
---

Follow-up to tributary-h9ub (read-only composable visibility). The ComposableDetailPanel in apps/app/src/components/account/account-page.tsx is currently read-only — no action buttons. Add pause/resume (toggle status) and delete buttons, mirroring the regular PaymentPolicy panels (Subscription/Milestone/PayAsYouGo/OneTime/UpTo).

## Context

- SDK methods already exist — NO SDK changes needed:
  - sdk.changeComposablePolicyStatus(tokenMint, policyId, newStatus) — sdk.ts:3176
  - sdk.deleteComposablePolicy(tokenMint, policyId) — sdk.ts:3218
- Regular policy handlers exist as the pattern to mirror:
  - handleToggleStatus — account-page.tsx:1887 (calls sdk.changePaymentPolicyStatus)
  - handleDeletePolicy — account-page.tsx:1918 (calls sdk.deletePaymentPolicy)
- ComposableDetailPanel — account-page.tsx:1376 — currently has NO onToggle/onDelete props
- Regular panels receive onToggle/onDelete/onExecute at account-page.tsx:2054-2237
- Owner check pattern: userPayment.owner.toString() === wallet.publicKey.toString()

## Acceptance criteria (TDD)

- [ ] handleToggleStatus generalized OR a sibling handleToggleComposableStatus added — calls sdk.changeComposablePolicyStatus(tokenMint, policyId, {active:{}}/{paused:{}})
- [ ] handleDeletePolicy generalized OR a sibling handleDeleteComposablePolicy added — calls sdk.deleteComposablePolicy(tokenMint, policyId)
- [ ] ComposableDetailPanel accepts onToggle + onDelete callbacks (+ togglingPolicies/deletingPolicies loading sets)
- [ ] Pause/Resume button rendered in ComposableDetailPanel header (next to status badge), gated on owner
- [ ] Delete button rendered with confirm() dialog (same as regular: 'Delete this composable policy? This cannot be undone.')
- [ ] After delete: setSelectedPolicy(null) + setLoaded(false) to refetch
- [ ] After toggle: setLoaded(false) to refetch
- [ ] Toast feedback on success/error (same pattern as regular)
- [ ] No execute button (execute composable needs instructionData + remainingAccounts — explicitly out of scope, same as h9ub)
- [ ] Lint + typecheck pass: pnpm --filter @tributary-so/app run lint && tsc
