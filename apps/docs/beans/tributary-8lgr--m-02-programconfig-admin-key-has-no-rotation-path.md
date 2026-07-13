---
# tributary-8lgr
title: 'M-02: ProgramConfig admin key has no rotation path'
status: completed
type: bug
priority: high
tags:
    - security
    - audit
created_at: 2026-07-06T10:11:00Z
updated_at: 2026-07-06T10:40:30Z
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

- [x] `change_program_authority` instruction added, gated on current authority
- [x] Test covering authority rotation works
- [x] Test covering unauthorized rotation is rejected
- [x] ADR added if decision is locked in

## Summary of Changes

- Added `change_program_authority` instruction (programs/tributary/src/instructions/change_program_authority.rs) — current admin signs, new admin recorded as a non-default Pubkey, `config.admin == admin.key()` constraint.
- Added `ProgramAuthorityChanged` event (programs/tributary/src/state/events.rs).
- Wired into instructions/mod.rs and lib.rs; IDL regenerated via `anchor build`.
- SDK method `changeProgramAuthority(newAdmin)` added to packages/sdk/src/sdk.ts.
- Tests added in tests/tributary.test.ts under "Program authority rotation (M-02)": (1) admin can rotate, state updated, fee_recipient untouched, rotate-back works; (2) impostor signer rejected, state unchanged.
- ADR-0029 added (apps/docs/adr/0029-program-authority-rotation.md) explaining single-step rotation, no timelock/multisig at program level, fee_recipient not auto-rotated.
- AGENTS.md updated: new instruction under "Admin:", ADR-0029 in the map + link index.
