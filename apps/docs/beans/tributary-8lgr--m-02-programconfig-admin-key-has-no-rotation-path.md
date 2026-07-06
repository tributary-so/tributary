---
# tributary-8lgr
title: 'M-02: ProgramConfig admin key has no rotation path'
status: todo
type: bug
priority: high
tags:
    - security
    - audit
created_at: 2026-07-06T10:11:00Z
updated_at: 2026-07-06T10:11:00Z
---

## Security Audit Finding (M-02)

**Severity:** Medium
**Files:** programs/tributary/src/state/program_config.rs, instructions/initialize.rs

### Issue

`ProgramConfig.authority` is set at `initialize` and immutable. No `change_program_authority` instruction exists. If the admin key is lost or compromised, protocol fees, emergency pause, and gateway deletion are permanently locked.

### Attack Scenario

Admin key compromised → attacker sets `emergency_pause = true` → griefs entire protocol. Or: admin key lost → protocol fee stuck at whatever it was set to, no one can update it.

### Fix

Add `change_program_authority` instruction, gated on current authority signer. Consider timelock or multisig for production.

---

## Acceptance Criteria

- [ ] `change_program_authority` instruction added, gated on current authority
- [ ] Test covering authority rotation works
- [ ] Test covering unauthorized rotation is rejected
- [ ] ADR added if decision is locked in
