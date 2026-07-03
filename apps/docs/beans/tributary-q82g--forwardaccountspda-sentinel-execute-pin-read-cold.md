---
# tributary-q82g
title: 'On-chain: InstructionConstraint + ValidationSpec + two ValidationPDAs + gate'
status: completed
type: task
priority: high
created_at: 2026-07-02T08:01:05Z
updated_at: 2026-07-02T12:48:47Z
parent: tributary-cjhh
---

Implements the on-chain half of route pinning as a cold-relayer safety net
(epic parent). TDD throughout. Supersedes scrapped tributary-hcfd (which was
reservation-only).

## 1. ForwardAccountsPda — typed Anchor account

Seed: `["composable_forward_accounts", composable_policy]` (add
`COMPOSABLE_FORWARD_ACCOUNTS_SEED` to `constants.rs`). Lazy-created only when
an owner configures route pinning. Mirrors the ValidationPda typed-account
pattern (promoted in ADR-0016 child A).

```rust
#[account]
pub struct ForwardAccountsPda {
    pub bump: u8,
    pub num_pinned: u8,
    pub pinned: [Pubkey; MAX_FORWARD_PINS],  // Pubkey::default() = wildcard slot
}
```

`MAX_FORWARD_PINS`: size to cover a Meteora DLMM route (pool + bin arrays +
oracles). 8 is a reasonable first cut — confirm against actual DLMM ix account
count during impl. Each entry's `Pubkey::default()` marks that positional slot
as a wildcard (no constraint on `remaining_accounts` at that index) — per
ADR-0016 lines 101-102.

## 2. ForwardConfig sentinel

Add `forward_accounts_pda: Pubkey` to `ForwardConfig`
(`state/composable_policy.rs`). `Pubkey::default()` = no table (current
behaviour). Recompute `ForwardConfig::SIZE`; ComposablePolicy has 32 bytes
padding — verify the field fits or adjust padding. `create_composable_policy`
defaults it to `Pubkey::default()`; `execute_composable` skips the lookup when
sentinel.

## 3. Execute-time pin read

In `execute_composable`, after resolving the forward account slice: if
`forward_accounts_pda != default`, load `ForwardAccountsPda`, and for
`i in 0..num_pinned`:
`require!(pinned[i] == default || remaining_accounts[forward_start+i].key() == pinned[i], ...)`.
Wildcard slots skip. This is the account-level analog of `ByteRangeCheck`
(ADR-0009).

## 4. Cold-relayer OR-gate relaxation (the behaviour change)

`execute_composable.rs:937-942` currently rejects cold relayers unless
`min_output_amount = Some(m > 0)`. Becomes:

```
if !is_trusted_caller {
    let has_floor = matches!(min_output_amount, Some(m) if m > 0);
    let has_route_pin = forward_accounts_pda != Pubkey::default();
    require!(has_floor || has_route_pin, PermissionlessExecutionRequiresSafetyNet);
}
```

Rename error `PermissionlessExecutionRequiresMinOutput` ->
`PermissionlessExecutionRequiresSafetyNet` (or add a new variant; pre-launch,
no migration). Update the message to name both paths.

## 5. ADR-0016 amendment (ships with this code)

Pre-deployment edit to `apps/docs/adr/0016-permissionless-composable-execution.md`
(allowed — route pinning not yet shipped in code):

- Reframe "Forward-account lookup table (optional MEV mitigation)" (lines
  80-107) -> "Forward-account lookup table (dual safety net)": MEV mitigation
  for fungible outputs; SOLE hard-loss shield for non-fungible outputs.
- Amend "Allowlist-growth vetting rule" (lines 72-78): a program may be
  allowlisted if its output is verifiable via `min_output_amount` OR its route
  is fully pinnable via `ForwardAccountsPda`.
- Note the OR-gate as the realised form of the dual safety net.

## Acceptance (TDD)

- [ ] `ForwardAccountsPda` round-trips through create/execute as disabled (sentinel).
- [ ] Execute enforces `pinned[i] == remaining_accounts[forward_start+i]` (non-wildcard).
- [ ] Wildcard slots (`Pubkey::default()` entry) skip enforcement.
- [ ] Cold relayer admitted with `min_output>0`, no route pin (status quo).
- [ ] Cold relayer admitted with route pin, `min_output=None` (NEW).
- [ ] Cold relayer REJECTED with neither (`min_output=None`, no route pin).
- [ ] Trusted caller unaffected by either path.
- [ ] ADR-0016 amended per §5.
- [ ] `cargo test` green; `ForwardConfig::SIZE` recomputed; no account resize break.

## Update (2026-07-02): §5 ADR reframe DONE

The ADR-0016 amendment was applied during the route-pinning grilling — see the live ADR. Scoped per grilling Q2: the OR-gate is **sound for fungible outputs only**; non-fungible (Velocity) is explicitly excluded until deferred epic tributary-2p5g (settle-phase input-residue sweep + ix-data pinning). The earlier §5 draft above said "SOLE hard-loss shield for non-fungible outputs" — that was the overclaim Q2 corrected; ignore it. Remaining §5 work for this bean = verify shipped code matches the ADR; no further drafting.

## Update (2026-07-02): degenerate-pin guard (grilling Q3, accepted)

The OR-gate's `has_route_pin` must require an **effective** pin, not merely a non-sentinel PDA. Enforce at **create** that a configured `ForwardAccountsPda` has `>= 1` concrete entry (`num_pinned >= 1` AND at least one `pinned[i] != Pubkey::default()`) — reject all-wildcard / `num_pinned = 0` tables as nonsensical. Partial wildcards (pin the pool, wildcard an optional oracle) remain valid. This kills the degenerate state at the source.

Added acceptance:
- [ ] `create_composable_policy` rejects a `ForwardAccountsPda` with zero concrete entries (all-wildcard or num_pinned=0).
- [ ] OR-gate `has_route_pin` is true only when an effective pin exists (redundant with the create-guard, but defence-in-depth at execute).


---

## REWRITTEN SCOPE (2026-07-02 grilling — supersedes all content above)

**Old:** ForwardAccountsPda typed account + sentinel + execute pin read + cold-relayer OR-gate.
**New:** InstructionConstraint inline + ValidationSpec enum + two ValidationPDAs + remove min_output_amount.

### 1. InstructionConstraint struct (replaces ForwardConfig fields)

```rust
pub struct InstructionConstraint {
    pub program_id: Pubkey,                    // was target_program; default() = disabled
    pub num_data_checks: u8,
    pub data_checks: [ByteRangeCheck; 4],      // ByteRangeCheck UNCHANGED (H-06 tested)
    pub num_pinned_accounts: u8,
    pub pinned_accounts: [Pubkey; 4],          // positional, default() = wildcard slot
}

pub struct ForwardConfig {
    pub instruction_constraint: InstructionConstraint,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub forward_flags: u8,
}
```

REMOVED: min_output_amount (Option<u64>, 9 bytes). post_validation generalizes it.
REMOVED: ForwardAccountsPda separate account (q82g old design — scrapped).

### 2. ValidationSpec enum (replaces ValidationConfig)

```rust
pub enum ValidationSpec {
    Disabled,
    ProgramCall { program_id: Pubkey },   // must be in ALLOWED_VALIDATION_PROGRAMS
    Inline { /* reserved — not implemented, errors at create */ },
}
```

ComposablePolicy carries TWO instances:
- pre_validation: ValidationSpec (replaces validation_config)
- post_validation: ValidationSpec (NEW — runs after FORWARD, before SETTLE)

SIZE: 1 byte discriminant + 32 bytes program_id = 33 bytes per instance.

### 3. Two ValidationPda accounts

```
["composable_validation_pre",  composable_policy]  → ValidationPda (pre assertion + pinned accounts)
["composable_validation_post", composable_policy]  → ValidationPda (post assertion + pinned accounts)
```
Each independently created only when the corresponding ValidationSpec is ProgramCall. Option<Account> at execute.

### 4. Execute flow

```
1. PULL
2. PRE-VALIDATION  (optional — ProgramCall CPI)
3. FORWARD         (optional — InstructionConstraint-pinned)
4. POST-VALIDATION (optional — ProgramCall CPI)  ← replaces min_output_amount check
5. SETTLE          (sweep + fees, NO min_output check)
```

### 5. Cold-relayer gate (amends ADR-0016)

```rust
if !is_trusted_caller {
    let has_post_validation = matches!(post_validation, ValidationSpec::ProgramCall { .. });
    let has_route_pin = instruction_constraint.has_effective_pins();
    require!(has_post_validation || has_route_pin, PermissionlessExecutionRequiresSafetyNet);
}
```

### 6. Degenerate-pin guard (carried from old q82g)

create_composable_policy rejects InstructionConstraint with zero effective pins when forward enabled.
has_effective_pins() = num_pinned >= 1 AND at least one pinned[i] != Pubkey::default().

### 7. ComposablePolicy sizing

Padding grows ~154 bytes (ComposablePolicy NOT deployed, no migration):
- InstructionConstraint with 4 inline pins: +128 bytes (pins) + 1 byte (num_pinned) - 9 bytes (min_output removed)
- Two ValidationSpec instances: +34 bytes (66 bytes vs old 32 bytes single ValidationConfig)
- Net: ~154 bytes, absorbed by growing padding from 32 → ~192.

### Acceptance (TDD)

- [ ] InstructionConstraint round-trips through create/execute as disabled (program_id default sentinel).
- [ ] Execute enforces pinned_accounts[i] == remaining_accounts[forward_start+i] (non-wildcard).
- [ ] Wildcard slots (Pubkey::default() entry) skip enforcement.
- [ ] ValidationSpec::Disabled = no CPI, no ValidationPda loaded.
- [ ] ValidationSpec::ProgramCall = CPI to allowlisted program with assertion data from corresponding ValidationPda.
- [ ] ValidationSpec::Inline errors at create (not implemented).
- [ ] pre_validation runs after PULL, before FORWARD.
- [ ] post_validation runs after FORWARD, before SETTLE.
- [ ] Cold relayer admitted with post_validation=ProgramCall, no route pin (NEW).
- [ ] Cold relayer admitted with route pin, post_validation=Disabled (NEW).
- [ ] Cold relayer REJECTED with both disabled.
- [ ] Trusted caller unaffected by either path.
- [ ] create_composable_policy rejects zero-effective-pins InstructionConstraint when forward enabled.
- [ ] min_output_amount removed from ForwardConfig. No floor check at settle.
- [ ] Two ValidationPda seeds (pre/post) derive correctly. Each independently created/closed.
- [ ] cargo test green. ForwardConfig::SIZE recomputed. ComposablePolicy::SIZE recomputed.

## Summary of Changes

- Replaced ForwardConfig fields (target_program/num_data_checks/data_checks/min_output_amount) with InstructionConstraint (program_id + data_checks + pinned_accounts inline)
- Added ValidationSpec enum (Disabled/ProgramCall/Inline) replacing ValidationConfig
- ComposablePolicy now carries pre_validation + post_validation (two ValidationSpec instances)
- Two ValidationPda seeds: composable_validation_pre / composable_validation_post
- Execute flow: PULL → PRE-VALIDATION → FORWARD (pin-checked) → POST-VALIDATION → SETTLE (no min_output check)
- Cold-relayer gate: post_validation=ProgramCall OR instruction_constraint.has_effective_pins()
- Degenerate-pin guard: create rejects zero-effective-pins InstructionConstraint when forward enabled
- 139 unit tests + 21 proptests green; IDL regenerated
