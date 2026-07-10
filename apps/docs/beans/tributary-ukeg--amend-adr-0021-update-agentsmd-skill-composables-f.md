---
# tributary-ukeg
title: Amend ADR-0021 + update AGENTS.md + SKILL-composables for indexed pins
status: todo
type: feature
priority: normal
created_at: 2026-07-10T10:21:58Z
updated_at: 2026-07-10T20:09:35Z
parent: tributary-btqv
---

## These are pre-launch amendments — direct edits, no supersession.

## File 1: `apps/docs/adr/0021-composable-v21-instructionconstraint-validation-spec.md`

**Current state (62 lines).** The ADR describes InstructionConstraint with positional `pinned_accounts: [Pubkey; 4]`.

**Amend the "Rejected alternatives" section** — the first bullet says inline `pinned_accounts: [Pubkey; 4]` achieves route pinning. This is now superseded by indexed pins. Add a new paragraph after the rationale section:

```markdown
## Amendment (2026-07-10): Indexed Pinned Accounts

The original positional `pinned_accounts: [Pubkey; 4]` mapped slot `i`
to `remaining_accounts[fwd_base + i]`. This constrained only a contiguous
prefix of the forward-account slice. Forward programs (DLMM, Drift) dictate
fixed account grammars that Tributary cannot reshape — if the account that
must be pinned sits at a non-contiguous or high index, positional pins
cannot express it. An attacker substituting a different pubkey at that
position is an unconstrained drain vector.

Replaced with indexed pins:
```rust
struct PinnedAccount {
    index: u8,      // position within the forward-account slice
    pubkey: Pubkey, // must match remaining_mid[fwd_base + index]
}
```

Design decisions:
- All active pins must have concrete pubkeys (no default-pubkey wildcards).
- No duplicate indices among active pins (create-time validation).
- `has_effective_pins()` simplifies to `num_pinned_accounts > 0`.
- ValidationPda.pinned_accounts stays positional — the owner controls
  Lighthouse assertion ordering, so positions 0 and 1 are always sufficient.
```

## File 2: `AGENTS.md`

**Lines 259-265** — the InstructionConstraint code block. Replace:
```
pinned_accounts: [Pubkey; 4],     // positional, default() = wildcard slot
```
with:
```
pinned_accounts: [PinnedAccount; 4], // indexed: { index: u8, pubkey: Pubkey }
```

Add after the code block (before line 266):
```
PinnedAccount pins a specific position (`index`) in the forward-account
slice to a concrete `pubkey`. All active pins must be concrete (no
default-pubkey wildcards). No duplicate indices. The execute check:
`remaining_mid[fwd_base + pin.index].key() == pin.pubkey`.
```

**Line 264** comment `// positional, default() = wildcard slot` — remove (no longer accurate).

## File 3: `skills/tributary/SKILL-composables.md`

**Lines 318-326** — the `InstructionConstraint` interface block. Update:
```
interface InstructionConstraint {
    program_id: Pubkey,
    num_data_checks: u8,
    data_checks: [ByteRangeCheck; 4],
    num_pinned_accounts: u8,
    pinned_accounts: [PinnedAccount; 4],  // was [Pubkey; 4]
}
```

Add `PinnedAccount` interface:
```
interface PinnedAccount {
    index: u8,      // position in the forward-account slice
    pubkey: Pubkey,
}
```

**Lines 892-901** — the pinned_accounts mapping description. Replace the positional mapping explanation with:
```
For forward accounts, `pinned_accounts[i].index` maps to
`remaining_accounts[fwd_base + pinned_accounts[i].index]`. The owner can
pin ANY position in the forward-account slice, not just a contiguous prefix.
All active pins must have concrete pubkeys. No duplicate indices.
```

**Lines 403-404** — these describe ValidationPda.pinned_accounts (positional, max 2). **DO NOT CHANGE** — add a note that ValidationPda stays positional while InstructionConstraint is indexed.

## Verification
- [ ] `make build` passes (docs build with mkdocs)
- [ ] No broken internal links
- [ ] Code blocks are valid Rust syntax
