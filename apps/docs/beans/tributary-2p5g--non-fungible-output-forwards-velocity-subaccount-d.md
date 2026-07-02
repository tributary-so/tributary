---
# tributary-2p5g
title: Non-fungible-output forwards (Velocity subaccount deposits) — settle-phase input-residue sweep + ix-data pinning + allowlist
status: todo
type: epic
priority: low
created_at: 2026-07-02T08:19:01Z
updated_at: 2026-07-02T12:01:58Z
parent: tributary-zvku
blocked_by:
    - tributary-l9qw
---

Deferred per grilling Q1 decision 3 ("no, not yet"). Captured here so the
design notes surfaced during the route-pinning grilling (2026-07-02) are not
lost. Epic tributary-l9qw (route pinning) is the PREREQUISITE — it does not
deliver Velocity support itself.

## Goal

Enable non-fungible-output forwards — pull payments that CPI into a program
whose settlement is NOT a clean token balance delta in an output ATA. The
motivating use case: depositing into a Velocity (formerly "Drift") perp
subaccount from a composable pull payment, runnable by third-party schedulers
(permissionlessly).

## Why this is separate from the route-pinning epic (tributary-l9qw)

Route pinning (l9qw) secures the ACCOUNT TOPOLOGY of a forward CPI. It is
fully sound for FUNGIBLE-output forwards (Meteora DLMM): the owner pins the
exact pool, the output balance delta is verifiable via min_output_amount, and
the settle phase sweeps intermediate_output -> recipient cleanly.

Non-fungible outputs break TWO assumptions that route pinning does NOT fix
(both now documented in ADR-0016 "Non-fungible-output forwards"):

1. **SETTLE PHASE.** `process_output_and_sweep` (execute_composable.rs:353)
   only sweeps intermediate_output -> recipient. A Velocity deposit consumes
   only PART of intermediate_input (deposits the configured amount to the
   subaccount); the residue is stranded in intermediate_input with no sweep
   path. The settle phase must ALSO sweep intermediate_input residue -> USER
   (owner token account), so a partial-consumption forward returns unspent
   input to the user. Returning residue to the user neutralises the "cranker
   deposits less than pulled" attack: the user gets the change back — never a
   loss.
2. **IX-DATA PINNING.** Route pinning fixes the accounts; ByteRangeCheck pins
   the discriminator. But the deposit AMOUNT lives in the forward ix data
   beyond the discriminator. Additional byte-range checks (or a pinned-amount
   field) are needed to constrain caller-supplied data for non-fungible
   forwards.

## Scope (when prioritised)

- [ ] Settle-phase rework: sweep intermediate_input residue -> user, in
      addition to intermediate_output -> recipient. Fee-model implication to
      resolve: are fees on gross pull or net consumption?
- [ ] ix-data pinning for non-fungible forwards (amount field constraint).
- [ ] Add Velocity to ALLOWED_FORWARD_PROGRAMS (attack-surface decision).
- [ ] Confirm ADR-0016 allowlist rule admits Velocity under the route-pinned +
      ix-data-pinned + settle-reworked safety argument.

## Blocked by

tributary-l9qw (route pinning infra — the prerequisite account-topology safety
net).
