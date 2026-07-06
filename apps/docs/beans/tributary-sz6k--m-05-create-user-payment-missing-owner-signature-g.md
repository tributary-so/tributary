---
# tributary-sz6k
title: 'M-05: create_user_payment missing owner signature — griefing vector'
status: todo
type: bug
priority: high
tags:
    - security
    - audit
created_at: 2026-07-06T10:10:59Z
updated_at: 2026-07-06T10:10:59Z
---

## Security Audit Finding (M-05)

**Severity:** Medium
**File:** programs/tributary/src/instructions/user/create_user_payment.rs

### Issue

The `owner` account is passed as AccountInfo without requiring a signature. Anyone can create a UserPayment PDA for any owner by passing their pubkey as an account. The PDA seeds enforce uniqueness but don't enforce owner consent.

### Attack Scenario

Attacker calls `create_user_payment` with victim's pubkey as owner. Victim now has a UserPayment PDA they didn't create. When victim later tries to create their own, the PDA already exists and fails (InitSpace error). This is a griefing vector.

### Fix

Add `#[account(mut, constraint = owner.key() == user_payment.owner)]` or better, require `owner` to be a Signer. Must be paired with SDK update.

---

## Acceptance Criteria

- [ ] `create_user_payment` requires owner signature (Signer constraint)
- [ ] SDK updated to pass owner as signer
- [ ] Test covering griefing scenario is rejected
- [ ] Test covering legitimate creation still works
