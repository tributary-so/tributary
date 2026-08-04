---
# tributary-r0b2
title: 'CLI: split policy → payment-policy + composable-policy namespaces'
status: completed
type: task
priority: high
created_at: 2026-07-10T07:35:17Z
updated_at: 2026-07-10T07:52:10Z
---

Refactor apps/cli/ command namespaces to distinguish PaymentPolicy from ComposablePolicy operations.

## Design decisions (locked)
- Rename `policy/` → `payment-policy/` (create, list, status)
- Split `payment-policy/delete` from the current status --status deleted
- Move `payment/execute` → `payment-policy/execute`
- Rename `composable/` → `composable-policy/` (create, execute, delete, status)
- Add new `composable-policy/list` using sdk.getComposablePoliciesByUserPayment
- `payment/transfer` stays as-is
- Clean break, no backward-compat aliases

## Checklist
- [x] Rename policy/ → payment-policy/ (create, list, status)
- [x] Split payment-policy/delete from status
- [x] Move payment/execute → payment-policy/execute
- [x] Rename composable/ → composable-policy/ (create, execute, delete, status)
- [x] Add composable-policy/list command
- [x] Update command strings in output JSON
- [x] Regenerate oclif manifest
- [x] Build + lint passes

## Summary of Changes

- Renamed `policy/` → `payment-policy/` (create, list, status)
- Split `payment-policy/delete` from the old `status --status deleted` command
- Moved `payment/execute` → `payment-policy/execute`
- Renamed `composable/` → `composable-policy/` (create, execute, delete, status)
- Added new `composable-policy/list` using `sdk.getComposablePoliciesByUserPayment`
- Updated all class names (e.g. PolicyCreate → PaymentPolicyCreate) and command strings in JSON output
- `payment/transfer` stays as the sole `payment:*` command
- Clean break, no backward-compat aliases
- oclif manifest regenerated; build + lint pass
