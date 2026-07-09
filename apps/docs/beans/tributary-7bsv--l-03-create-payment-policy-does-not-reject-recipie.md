---
# tributary-7bsv
title: 'L-03: create_payment_policy does not reject recipient == Pubkey::default()'
status: todo
type: bug
priority: low
tags:
    - security
    - audit
created_at: 2026-07-09T12:05:42Z
updated_at: 2026-07-09T12:05:42Z
---

## Security Audit Finding (L-03)

**Severity:** Low
**Report:** `reports/L-03-create-payment-policy-recipient-default.md`
**Files:** `programs/tributary/src/instructions/payment/create_payment_policy.rs:23-25` (missing guard), `programs/tributary/src/instructions/composable/create_composable_policy.rs:38-40` (correct reference)

### Issue

`create_payment_policy` accepts `recipient` as an `UncheckedAccount` with **no** constraint, so a policy can be created with `recipient == Pubkey::default()`. The sibling `create_composable_policy` explicitly rejects this (`recipient.key() != Pubkey::default()`); the plain-policy path omits the same guard.

At execution (`execute_payment.rs:82-87`) the destination is bound by `recipient_token_account.owner == payment_policy.recipient` only. When `recipient == Pubkey::default()` (the System Program ID), a token account whose `owner` field is the System Program satisfies the check, so execution does not revert — it transfers the payout into an account no key can sign for. Funds are permanently unrecoverable.

Self-inflicted footgun, not a third-party exploit (only the owner signs `create_payment_policy`). Severity is Low; the value is closing the inconsistency with the composable path.

### Fix

Add the same guard the composable path uses:

```rust
#[account(
    constraint = recipient.key() != Pubkey::default() @ TributaryError::InvalidAmount,
)]
pub recipient: UncheckedAccount<'info>,
```

Consider extending the same guard to any other authority-accepting `UncheckedAccount` (e.g. `create_referral_account`) for full coverage.

## Acceptance Criteria

- [ ] `create_payment_policy` rejects `recipient == Pubkey::default()`
- [ ] Test: creating a policy with a default recipient fails
- [ ] Composable guard remains intact (no regression)
