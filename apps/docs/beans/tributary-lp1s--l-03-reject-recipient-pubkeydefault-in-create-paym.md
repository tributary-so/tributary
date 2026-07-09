---
# tributary-lp1s
title: 'L-03: Reject recipient == Pubkey::default() in create_payment_policy'
status: in-progress
type: bug
priority: normal
created_at: 2026-07-09T12:23:33Z
updated_at: 2026-07-09T12:27:51Z
parent: tributary-3nhr
---

**Finding L-03 (Low)** — `create_payment_policy` accepts `recipient == Pubkey::default()`.

### Root cause

`create_payment_policy.rs:23-25` declares `recipient` as an `UncheckedAccount`
with no constraint. `create_composable_policy.rs:37-41` validates
`recipient.key() != Pubkey::default()`. Asymmetric validation — same field
semantics, different behavior across the two policy families.

### Fix

Add the same constraint to `create_payment_policy.rs:23-25`:
```rust
#[account(
    constraint = recipient.key() != Pubkey::default() @ TributaryError::InvalidAmount,
)]
pub recipient: UncheckedAccount<'info>,
```

### Acceptance criteria

- [ ] Constraint added to `create_payment_policy` recipient account
- [ ] Rust unit test: zero-address recipient rejected
- [ ] `cargo test` passes
- [ ] qedspec hash updated
