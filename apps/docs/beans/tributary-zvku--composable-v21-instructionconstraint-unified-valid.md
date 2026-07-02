---
# tributary-zvku
title: Composable v2.1 — InstructionConstraint + Unified ValidationSpec
status: todo
type: milestone
priority: high
created_at: 2026-07-02T11:43:00Z
updated_at: 2026-07-02T11:43:00Z
---

Composable policy refactoring inspired by Squads smart-account-program analysis (bean tributary-ssd9). Three structural changes to the pre-launch ComposablePolicy account:

## Design decisions (grilled 2026-07-02)

### 1. InstructionConstraint replaces three fields
`target_program` + `ByteRangeCheck[]` + the proposed `ForwardAccountsPda` all collapse into one struct:
```
InstructionConstraint {
    program_id: Pubkey,                    // was target_program; default() = disabled
    num_data_checks: u8,                   // unchanged
    data_checks: [ByteRangeCheck; 4],      // unchanged (H-06 tested)
    num_pinned_accounts: u8,               // NEW (replaces ForwardAccountsPda)
    pinned_accounts: [Pubkey; 4],          // NEW (positional, default() = wildcard)
}
```
ALLOWED_FORWARD_PROGRAMS stays STATIC (opened via upgrade). InstructionConstraint.program_id must be in the allowlist. M=4 pins covers Meteora DLMM (lbPair + reserveX + reserveY + 1 wildcard).

### 2. Unified ValidationSpec (pre + post, same type)
```
ValidationSpec = Disabled | ProgramCall { program_id } | Inline { reserved, not implemented }
```
- pre_validation replaces ValidationConfig (was validation_program sentinel)
- post_validation is NEW — runs after FORWARD, before SETTLE
- Inline variant errors at create; future work (gated on tributary-okhd)
- Two separate ValidationPda accounts: ["composable_validation_pre", ...] and ["composable_validation_post", ...]

### 3. min_output_amount REMOVED
post_validation generalizes it. Owner uses Lighthouse assertion to check output. NET/gross is the users problem — fee breakdown emitted in PaymentRecord for transparency.

### Execute flow
```
1. PULL
2. PRE-VALIDATION  (optional — ValidationSpec::ProgramCall)
3. FORWARD         (optional — InstructionConstraint-pinned)
4. POST-VALIDATION (optional — ValidationSpec::ProgramCall)
5. SETTLE          (sweep + fees, NO min_output check)
```

### Cold-relayer gate (amends ADR-0016)
```
if !is_trusted_caller:
    has_post_validation = matches!(post_validation, ProgramCall { .. })
    has_route_pin = instruction_constraint.has_effective_pins()
    require!(has_post_validation || has_route_pin)
```

### Degenerate-pin guard (carried from q82g)
create_composable_policy rejects InstructionConstraint with zero effective pins when forward enabled.

### Account sizing
ComposablePolicy NOT deployed (pre-launch). Padding grows ~154 bytes to absorb InstructionConstraint + two ValidationSpec instances. No migration.

### Fixed-size PDAs
No realloc (deferred to tributary-okhd). All types use fixed arrays.

## Tree
- implementation: program contract + sdk + apps
- testing: surfpool integration tests
- documentation: ADR amendments (0010, 0016) + CONTEXT/README
