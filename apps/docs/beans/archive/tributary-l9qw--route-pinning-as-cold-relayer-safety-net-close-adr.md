---
# tributary-l9qw
title: 'Implementation epic: InstructionConstraint + Unified ValidationSpec (pre/post)'
status: completed
type: epic
priority: high
created_at: 2026-07-02T08:00:51Z
updated_at: 2026-07-02T13:06:07Z
parent: tributary-zvku
---

Re-evaluation of ADR-0016 child E (forward-account lookup table), previously
deferred as "optional MEV mitigation" (vector b). Promoted to a REQUIRED safety
net for a class of forwards the current design cannot serve permissionlessly.

## Why now (the Drift/Velocity argument)

ADR-0016's cold-relayer gate (`execute_composable.rs:937-942`) requires
`min_output_amount = Some(m > 0)` for any third-party scheduler. This works for
fungible-output swaps (Meteora DLMM): the output balance delta is verifiable,
the floor is meaningful. But it categorically BLOCKS forwards whose settlement
is not a clean token balance delta.

Concrete motivating use case (allowlist expansion DEFERRED — see below): Drift
("Velocity") perp subaccounts. A pull payment that deposits into a user's Drift
subaccount CPIs Drift's deposit function — there is no output token, no balance
delta to floor. `min_output_amount` is meaningless (must be None), so the
current gate rejects any cold relayer for such a policy. The only execution
path is the trusted three (gateway signer / owner / recipient) — no open
scheduler layer, defeating the point of ADR-0016 for this forward class.

Route pinning (the forward-account lookup table) provides the alternative
topological guarantee: pin the exact accounts the forward CPI touches, so a
cold relayer cannot substitute its own. This makes non-fungible-output forwards
safe to run permissionlessly WITHOUT a min_output floor.

## Grilling decisions (Q1, resolved)

1. **IMPLEMENT** the route-pinning read at execute — not just reserve the field.
2. **RELAX** the cold-relayer gate to OR-logic: admit if `min_output_amount > 0`
   OR `forward_accounts_pda` is configured (route pinned). Both are valid
   independent safety nets.
3. **DEFER** the Drift allowlist expansion (`ALLOWED_FORWARD_PROGRAMS`). That is
   a separate attack-surface decision; the infra built here ENABLES it but does
   not require it.

## ADR impact

ADR-0016 currently frames the forward-account table as "optional MEV mitigation"
(vector b, lines 80-107). This epic reframes it as a **DUAL safety net**:

- For fungible-output forwards (swaps): optional MEV-within-floor mitigation.
- For non-fungible-output forwards: the SOLE cold-relayer hard-loss shield.

The "allowlist-growth vetting rule" (lines 72-78) amends from "output fully
verifiable via min_output_amount" to "output verifiable via min_output_amount
OR route fully pinned." This amendment ships with child 1 (pre-deployment, so
a direct edit is allowed per ADR conventions; no supersession needed).

## Children

- [ ] 1 (on-chain + ADR): ForwardAccountsPda typed account, sentinel, execute
      pin read, cold-relayer OR-gate, ADR-0016 reframe.
- [ ] 2 (SDK): wire pinned forward accounts through create + execute (blocked
      by 1).
- [ ] 3 (immutability): gateway permissionless flag (bit 0x08) one-way lock.

## Deferred (NOT this epic)

- Drift/Velocity allowlist + non-fungible-output forward semantics. Open a
  separate epic when that use case is prioritised. This epic's infra is the
  prerequisite.

## Supersedes

tributary-hcfd (reserve-only) — scrapped; reservation scope is superseded by
the full implementation in child 1.


---

## REWRITTEN SCOPE (2026-07-02 grilling — supersedes all content above)

**Old framing:** Route pinning via ForwardAccountsPda.
**New framing:** InstructionConstraint + Unified ValidationSpec (pre/post).

This epic is now the **implementation epic** under milestone tributary-zvku (Composable v2.1). Three structural changes to the pre-launch ComposablePolicy account:

### InstructionConstraint (absorbs target_program + ByteRangeCheck + ForwardAccountsPda)
```
InstructionConstraint {
    program_id: Pubkey,                    // was target_program; default() = disabled
    num_data_checks: u8,                   // unchanged
    data_checks: [ByteRangeCheck; 4],      // unchanged (H-06 tested)
    num_pinned_accounts: u8,               // NEW (replaces ForwardAccountsPda)
    pinned_accounts: [Pubkey; 4],          // NEW (positional, default() = wildcard)
}
```
ALLOWED_FORWARD_PROGRAMS stays static. M=4 pins. No separate ForwardAccountsPda account.

### ValidationSpec enum (pre + post, same type)
```
ValidationSpec = Disabled | ProgramCall { program_id } | Inline { reserved, not implemented }
```
- pre_validation replaces ValidationConfig
- post_validation is NEW — runs after FORWARD, before SETTLE
- Inline variant errors at create (future work, gated on tributary-okhd)
- Two separate ValidationPda accounts: pre + post seeds

### min_output_amount REMOVED — post_validation generalizes it

### Execute flow
```
1. PULL → 2. PRE-VALIDATION → 3. FORWARD → 4. POST-VALIDATION → 5. SETTLE
```

### Cold-relayer gate: post_validation is ProgramCall OR instruction_constraint.has_effective_pins()

### Children (under milestone tributary-zvku)
- feature: program contract (tributary-cjhh) — on-chain changes
  - task: InstructionConstraint + ValidationSpec on-chain (tributary-q82g, REWRITTEN)
  - task: gateway permissionless flag one-way lock (tributary-1355)
- feature: sdk compatibility (tributary-ksdy)
  - task: SDK wiring (tributary-6bpl, REWRITTEN)
- feature: apps update (tributary-y4ff)

### Supersedes
Old ForwardAccountsPda design (ForwardAccountsPda separate PDA, sentinel, lazy-create) is SCRAPPED. The goal (route pinning for non-fungible outputs) is achieved via InstructionConstraint.pinned_accounts inline.

## Summary of Changes

All children complete: program contract (cjhh), SDK (ksdy), apps (none touched). Implementation epic done.
