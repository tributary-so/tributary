---
# tributary-ml82
title: 'C-01: Subscription max_renewals off-by-one fix (Option B)'
status: completed
type: bug
priority: critical
created_at: 2026-06-17T10:30:27Z
updated_at: 2026-06-18T10:04:43Z
---

Implement Option B from reports/C-01-subscription-max-renewals-off-by-one.md: increment payment_count inside traits::execute before should_pause_policy, and remove the duplicate increment from execute_payment.rs. Add regression tests for max_renewals=1 and max_renewals=3.

## Todos

- [ ] RED: Add regression tests (max_renewals=1 and =3) to tests/tributary.test.ts
- [ ] Verify tests fail on current buggy code
- [ ] GREEN: Move payment_count increment into policies/traits.rs::execute (Option B)
- [ ] Remove duplicate increment from instructions/execute_payment.rs
- [ ] Run anchor test / cargo test to verify GREEN
- [ ] Run pnpm run lint and cargo clippy
