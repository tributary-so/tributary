---
# tributary-u8n4
title: Reduce composable account/tx footprint — MAX_PINNED_FORWARD_ACCOUNTS 4→2 + MAX_VALIDATION_DATA_SIZE 1024→512
status: completed
type: milestone
priority: high
created_at: 2026-07-12T19:10:21Z
updated_at: 2026-07-13T07:46:19Z
---

## Context

Diagnosis (2026-07-12): `create_composable_policy` tx exceeds the 1232-byte
cap even with zero validation data. The bloat is structural, not data-driven:

```
signatures (2)         129
14 accounts × 32       449   ← account array
fixed ix args          631   ← see below
+ actual validation_data bytes (Vec<u8>, variable)
                     ─────
≈ 1264+               over 1232 even before any Lighthouse bytes
```

Fixed ix args (631B) break down as:
- PolicyType                 128  (ADR-0002 fixed)
- memo [u8;32]                32
- ForwardConfig              267  = InstructionConstraint(202) + mints(65)
    - InstructionConstraint  202  = prog(32)+ndc(1)+checks(40)+npa(1)+**pins(128)**
- 2× ValidationSpec            66
- 2× ValidationInit (fixed)   138  = 2×(1 + 64 pinned + 4 vallen)

**`MAX_VALIDATION_DATA_SIZE` does NOT drive tx size** — `validation_data`
travels as a Borsh `Vec<u8>` (actual bytes only, never padded to MAX) and at
execute is read from the account, not the instruction. Cutting it only saves
rent (588B vs 1100B per ValidationPda, ~0.005 SOL each). It does NOT help
tx-too-big. (Captured here because the rent win is still worth taking.)

The two levers that DO move tx bytes:
- **(a)** `MAX_PINNED_FORWARD_ACCOUNTS` 4→2 → `pinned_accounts` 128B→64B in
  `InstructionConstraint` → ForwardConfig 267→203 → saves 64B of ix data per
  create. (Validation-side pins `MAX_PINNED_ACCOUNTS` already = 2.)
- LUT + split-validation-init are orthogonal follow-ups (separate beans).

## Scope of this milestone

1. Reduce `MAX_PINNED_FORWARD_ACCOUNTS` 4→2 (program + qedspec + SDK + tests).
2. Reduce `MAX_VALIDATION_DATA_SIZE` 1024→512 (program + tests; no SDK/spec
   impact — Lighthouse assertions are out of qedspec scope and the SDK passes
   the data as a variable-length Buffer).
3. Formal-verification consequences: spec const, Layer 1 regen, drift-gate
   re-stamp.
4. Amend existing ADRs (0021/0009/0016) in place + docs.

## Design decisions

### D1 — Layout is freely mutable (composable is greenfield)

`pinned_accounts` sits mid-struct in ForwardConfig/ComposablePolicy, so shrinking
4→2 shifts trailing field offsets. That would break live accounts — but composable
is NOT deployed anywhere: it exists only on develop. The `programs.mainnet`
Anchor.toml entry is a program-ID reservation, not deployed state. No
ComposablePolicy accounts exist. Layout is freely mutable — no migration, no
version discriminator, no program-ID bump. Edit the const and move on.

### D2 — (b) is NOT breaking (data is the trailing field)

`ValidationPda.data: [u8; N]` is the LAST field. Shrinking 1024→512:
- Old accounts (1024-byte data): new code reads 512, ignores trailing 512B.
  Reads OK.
- New accounts: allocate 588B (vs 1100B). Mixed old/new coexist readably.
- No field-offset shift. No deserialization break.

Safe to ship independently of (a). The only touch is the const, the SIZE
comment, and the `size_covers_full_layout` unit test (`assert_eq!(SIZE, 1100)`
→ `588`).

### D3 — Feasibility gate for (a): Meteora DLMM needs ≤2 pinned accounts

`MAX_PINNED_FORWARD_ACCOUNTS` exists to pin the forward-CPI (Meteora DLMM)
account slice. A DLMM `swap` typically needs: pool bin array + user input
ATA + user output ATA + … If a real swap references >2 accounts that must be
pinned, reducing to 2 BREAKS swap execution and (a) is infeasible as stated.
This MUST be verified against `tests/topup-balance-swap.test.ts` and the
DLMM account list BEFORE editing the const. If infeasible, (a) is descoped
and only (b) ships. The gate is a blocking task.

### D4 — qedspec + drift-gate consequence

`tributary.qedspec:103` declares `const MAX_PINNED_FORWARD_ACCOUNTS = 4`.
Changing it alters the spec text → the `spec_hash` stamped on the
`#[qed(verified)]` drift gates (`create_payment_policy`, `transfer`) changes
→ `cargo check` fails with `compile_error!` even though those handlers are
untouched. Must re-stamp via `qedgen adapt` after the spec edit. Layer 1
harness (`formal_verification/kani.rs`) hardcodes the const at line 22 and
`[PinnedAccount; 4]` at line 35 → regenerate via `qedgen codegen --kani` +
`fix-kani.py`. Layer 2 harnesses reference the real const (`use ...
MAX_PINNED_FORWARD_ACCOUNTS`) and auto-track, but proptest fixtures must be
audited for any stray literal `4`.

The qedspec does NOT reference `MAX_VALIDATION_DATA_SIZE` (Lighthouse
assertions are explicitly OUT OF SCOPE per spec header line 28), so (b) has
no spec/drift-gate/Layer-1 consequence.

## Out of scope (follow-up beans)

- Address Lookup Table for create_composable_policy accounts (the bigger
  tx-size win, ~434B; client-only, no program change).
- Splitting validation-PDA init into a separate instruction.
- The `[Pubkey; N]` vs `PinnedAccount { index, pubkey }` divergence between
  the on-chain struct and the qedspec/proptest Layer 2 (pre-existing, noted
  in qedspec:107-109; not touched here).
