---
# tributary-6tx8
title: 'H1: Rename misleading user_payment_info param in process_output_and_sweep'
status: completed
type: bug
priority: high
created_at: 2026-06-21T18:52:44Z
updated_at: 2026-06-21T18:58:46Z
---

The process_output_and_sweep helper declares its 4th param as user_payment_info but the caller passes &composable_policy_info (the ComposablePolicy PDA, which owns the intermediate ATAs). Rename to intermediate_owner_info and rename seeds -> intermediate_owner_seeds for symmetry with run_forward_cpi. Pure refactor, no behavior change.

Report: reports/H1-process-output-and-sweep-misleading-param-name.md

## Todos
- [x] Rename param user_payment_info -> intermediate_owner_info in process_output_and_sweep
- [x] Update 3 internal authority: sites
- [x] Rename seeds -> intermediate_owner_seeds for symmetry (helper param + caller local)
- [x] anchor build (clean; 3 pre-existing warnings unrelated to change)
- [x] anchor test (93/93 pass: 76 tributary + 17 composable)
- [x] prettier --check (clean; no `lint` script in workspace)

## Summary of Changes

Pure rename refactor in `programs/tributary/src/instructions/composable/execute_composable.rs` — no behavior change.

- `process_output_and_sweep` param `user_payment_info` -> `intermediate_owner_info` (4th param, the ComposablePolicy PDA that owns the intermediate ATAs), with a clarifying comment that it is NOT the UserPayment PDA.
- 3 internal `authority:` sites in the gateway-fee / protocol-fee / recipient-sweep `TransferChecked` calls updated to the new name.
- `process_output_and_sweep` param `seeds` -> `intermediate_owner_seeds` for symmetry with `run_forward_cpi` (which already used `intermediate_owner_seeds`).
- Caller local `seeds` -> `intermediate_owner_seeds` for end-to-end clarity at the call site.

Left untouched (correctly named): the caller's `let user_payment_info = ctx.accounts.user_payment.to_account_info();` at line ~742 and its use in `resolve_delegate(...)` — that genuinely IS the UserPayment info used for the initial pull (UserPayment / payments_delegate signs), a different scope and role.

Verification: anchor build OK (3 pre-existing warnings from commented-out forward CPI, per B1); anchor test 93/93 pass; prettier clean. Report status updated to Fixed.
