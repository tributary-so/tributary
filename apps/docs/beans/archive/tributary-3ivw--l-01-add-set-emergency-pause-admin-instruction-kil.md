---
# tributary-3ivw
title: 'L-01: Add set_emergency_pause admin instruction (kill-switch setter)'
status: completed
type: bug
priority: normal
created_at: 2026-07-09T12:23:19Z
updated_at: 2026-07-09T13:03:26Z
parent: tributary-3nhr
---

**Finding L-01 (Low)** — `emergency_pause` kill-switch has no setter instruction.

### Root cause

`ProgramConfig.emergency_pause` is enforced at 20 execute sites
(`execute_payment.rs:58-63`, `execute_composable.rs:671`, `transfer.rs:24`, …)
but is hardcoded to `false` at `initialize` and **no instruction exists** to
flip it. Grep for `set_emergency|pause_program|update_program_config` returns
zero matches across the repo. The kill-switch is read-only dead code — a
genuine emergency cannot be halted without a program upgrade.

### Fix

Add an admin-gated `set_emergency_pause(new_value: bool)` instruction. Mirror
the `ChangeProgramAuthority` accounts pattern (`config.admin == admin.key()`).
New file `instructions/set_emergency_pause.rs`, wired in `lib.rs`.

### Acceptance criteria

- [ ] New instruction `set_emergency_pause` added, admin-gated
- [ ] Rust unit test: only admin can flip; non-admin rejected
- [ ] Rust unit test: flipping to true blocks execute, false resumes
- [ ] `cargo test` passes
- [ ] qedspec updated


## Summary of Changes

- **Commit `bb8909a`**: Added `set_emergency_pause(paused: bool)` instruction — admin-gated (`config.admin == admin.key()`), mirrors `ChangeProgramAuthority` pattern. New file `instructions/set_emergency_pause.rs`, wired in `lib.rs` + `instructions/mod.rs`. Added `EmergencyPauseChanged` event. SDK `setEmergencyPause()` method added; IDL + types regenerated via `anchor build`. AGENTS.md instruction list updated.
