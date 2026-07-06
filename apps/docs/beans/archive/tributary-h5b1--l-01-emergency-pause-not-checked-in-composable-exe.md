---
# tributary-h5b1
title: 'L-01: Emergency Pause Not Checked in Composable Execution'
status: completed
type: task
priority: low
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T06:28:10Z
parent: tributary-4kt4
---

# L-01: Emergency Pause Not Checked in Composable Execution

| Field              | Value                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**       | Informational (Verified Safe)                                                                                                    |
| **Status**         | False Positive                                                                                                                   |
| **File(s)**        | `programs/tributary/src/instructions/execute_payment.rs`, `programs/tributary/src/instructions/composable/execute_composable.rs` |
| **Program ID**     | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`                                                                                     |
| **Anchor Version** | 0.31.1                                                                                                                           |

---

## Description

`ProgramConfig` (`state/program_config.rs:16`) exposes an `emergency_pause: bool` flag.

When set to `true`, all payment execution must halt. The flag acts as a
protocol-level kill switch — a single bit that lets the admin freeze value
movement across every gateway and policy without touching individual accounts.

The original concern was whether `execute_composable` respected this flag,
since a missing check would allow an attacker or any gateway signer to bypass
the pause via the composable execution path.

---

## Verification

**Both execution paths enforce the emergency pause constraint.**

### `execute_payment.rs` — line 74

```rust
#[account(
    seeds = [CONFIG_SEED],
    bump = config.bump,
    constraint = !config.emergency_pause,  // <--- checked here
)]
pub config: Box<Account<'info, ProgramConfig>>,
```

### `execute_composable.rs` — line 154

```rust
#[account(
    seeds = [CONFIG_SEED],
    bump = config.bump,
    constraint = !config.emergency_pause,  // <--- also checked here
)]
pub config: Box<Account<'info, ProgramConfig>>,
```

The constraint is applied identically in both `Accounts` structs. Anchor
evaluates `constraint` expressions during account validation — before the
handler runs. If `config.emergency_pause == true`, the transaction fails with
`AnchorError.constraint violated` (error code `2006`) before any state mutation
or CPI occurs.

No bypass is possible.

---

## Impact

**None.** The emergency pause is correctly enforced in both execution paths.
The finding is a false positive.

---

## Pattern Analysis

The enforcement pattern is consistent and correct:

```
                    ┌─────────────────────┐
                    │   ProgramConfig     │
                    │   emergency_pause   │
                    └────────┬────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
   ExecutePayment::config      ExecuteComposable::config
   (line 74, constraint)       (line 154, constraint)
              │                             │
              ▼                             ▼
   ✗ if emergency_pause       ✗ if emergency_pause
     == true → tx fails         == true → tx fails
```

Both paths use the same Anchor `constraint` on the same `config` account,
validated at the same point in the transaction lifecycle (account resolution,
pre-handler).

---

## Testing Instructions

To verify this finding:

1. **Initialize the program** and create a composable policy with active schedule.
2. **Set `emergency_pause = true`** via the admin `update_config` instruction.
3. **Attempt `execute_composable`** — must fail with Anchor constraint error.
4. **Attempt `execute_payment`** — must also fail.
5. **Set `emergency_pause = false`** — both paths must succeed again.

```bash
# After setting emergency_pause = true:
anchor test -- --grep "emergency"
```

Expected: all execution tests fail while paused, pass after unpausing.

---

## Conclusion

The emergency pause is enforced identically in both `execute_payment` and
`execute_composable` via Anchor account constraints. No code change required.

**Verdict: Verified Safe — No Action Needed.**
