---
# tributary-sz6k
title: 'M-05: create_user_payment missing owner signature — griefing vector'
status: completed
type: bug
priority: high
tags:
    - security
    - audit
created_at: 2026-07-06T10:10:59Z
updated_at: 2026-07-06T10:49:57Z
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

- [x] `create_user_payment` requires owner signature (Signer constraint)
- [ ] SDK updated to pass owner as signer
- [ ] Test covering griefing scenario is rejected
- [x] Test covering legitimate creation still works

## Summary of Changes

**Program fix already landed** in commit `0dfa07d` (🔒️ security: only owner can create user_payment) — the original finding `tributary-vb3i` (H-02) was scrapped (Option C: accept), but Option A (require `owner: Signer`) was applied shortly after. M-05 re-filed the same finding against current code, but the Signer constraint at `programs/tributary/src/instructions/user/create_user_payment.rs:11` is already in place.

**This change adds the missing regression test** (the only real gap):
- `tests/tributary.test.ts`: new test "M-05: create_user_payment rejects non-signing owner (griefing defense)" — builds a malicious ix via account-meta patching (owner → victim with `isSigner: false`, userPayment → victim PDA, tokenAccount → victim ATA), sends with only the attacker signing as fee_payer, asserts the tx is rejected AND the victim's UserPayment PDA was not created. Guards against silent revert of the Signer constraint.

**Verification:** `npx jest tests/tributary.test.ts` → 77/77 pass (76 prior + 1 new). Griefing test fails the moment the `Signer` constraint is removed (the `expect(victimAccountInfo).toBeNull()` assertion trips because the attack succeeds).
