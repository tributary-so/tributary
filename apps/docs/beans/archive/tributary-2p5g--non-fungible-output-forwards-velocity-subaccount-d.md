---
# tributary-2p5g
title: 'ADR-0016 amendment: act-mode admission rule + Lighthouse post_validation limitations'
status: completed
type: feature
priority: normal
created_at: 2026-07-02T08:19:01Z
updated_at: 2026-07-06T10:25:37Z
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


---

## REWRITTEN SCOPE (2026-07-06 grilling — supersedes all content above)

The original framing is stale on every clause. ADR-0026 shipped the entire
settle-phase rework (`sweep_input_residual_to_user`, Phase 1b input-side fee
skim, NET-on-pull hardcoding, three settlement shapes including **act mode**).
The prerequisite epic (tributary-l9qw) is `completed`. ix-data amount pinning
was dropped (Q2 below). Velocity was evaluated as the motivating example and
**rejected** (Q4 below). What remains is a documentation-only deliverable.

### Grilling decisions (Q1–Q5, resolved 2026-07-06)

**Q1 — rescope.** Settle-phase residue→user sweep and fee-model (gross pull,
NET-on-pull) are DONE by ADR-0026. Code-confirmed:
`sweep_input_residual_to_user` at
`programs/tributary/src/instructions/composable/execute_composable.rs:534`,
`is_act` mode flag at line 779, Phase 1b skim at line 1198. Unblock from
tributary-l9qw (completed).

**Q2 — drop ix-data amount pinning.** The amount field in the forward ix data
is toothless post-0026. NET-on-pull hardcoding means `intermediate_input`
holds exactly `face` post-skim; SPL token balance semantics bound the forward
CPI to at most `face` (intermediate ATA owned by ComposablePolicy PDA per
ADR-0008); any under-consumption → residue swept → user. The amount-confusion
attack is fully neutralised by the (balance bound + residue→user + NET-on-pull)
triad, not by pinning ix bytes. **Crystallised separation:** Tributary enforces
the balance bound; the client builds a correct ix for the target program.
Amount-byte pinning is a forward-program-specific, client-side concern — not
Tributary's invariant.

**Q3 — amended admission rule (the actual deliverable).** ADR-0016 currently
hard-rejects non-fungible-output programs "until both settle-rework and
ix-data pinning land." Settle shipped, ix-data dropped — the literal blocker
condition is met, but the rule is now both stale AND underspecified (it does
not capture the `post_validation` requirement). Amend ADR-0016 with a third
admission path alongside the existing two:

> **(Act-mode path — additive.)** The forward settles in **act mode**
> (`output_mint == Pubkey::default()` per ADR-0026), and the policy is created
> with `post_validation = ProgramCall { ... }` configured. Tributary's
> invariant is "no more than `face` leaves `intermediate_input`, any residue
> returns to the user" (ADR-0026); the owner's `post_validation` is the sole
> assertion that the forward did what the owner intended. Act-mode admission
> without `post_validation` configured is rejected at create.

Side effect: this also removes the cold-relayer OR-gate ambiguity for act
mode. Today the gate is `has_post_validation || has_route_pin` (ADR-0016
amended). For act mode, `has_route_pin` alone is insufficient — the create-
time reject on missing `post_validation` bakes the requirement in directly.

**Q4 — Lighthouse-only validation; Drift rejected.** Three sub-decisions:

1. **No Drift-native reader.** `ALLOWED_VALIDATION_PROGRAMS` stays
   Lighthouse-only. Expanding it is a separate attack-surface decision;
   ponytail says try Lighthouse first, expand only if proven insufficient.
2. **Drift does NOT qualify under the amended rule.** Drift perp-subaccount
   leverage is off-chain-derived from multiple on-chain fields (collateral,
   deposits, PnL, oracle prices, etc.) — there is no single account field a
   Lighthouse assertion can assert against. "Subaccount data changed" is too
   weak to be a meaningful floor. The motivating example is the anti-example.
3. **Limitations to document (the Q4 note):**
   - Lighthouse byte-offset assertions are brittle (program upgrades can shift
     struct layout). Safe-by-failure: shifted offset → garbage → assertion
     fails → deposits veto → owner reconfigures. No principal-loss path.
   - Act mode does NOT serve programs whose safety state is off-chain-derived
     from multiple on-chain fields (the Drift class). Single-field collateral
     deposits, stake deposits, token burns, NFT mints, LP position creation —
     these ARE servable.
   - `post_validation` in act mode is **quality-of-service**, not principal
     safety. Tributary's invariant (residue→user + balance bound) holds
     regardless; the floor is the owner's assurance the forward did the
     intended work.

**Q5 — convergence.** Documentation-only deliverable. No code changes (ADR-
0026 shipped the mechanism). Demote epic → feature (single ADR amendment +
docs, no child tree). Standalone — parent removed (tributary-zvku milestone is
closed).

### Scope (the actual deliverables)

- [x] Amend ADR-0016 (direct edit — composable program is pre-launch, no
      supersession per ADR conventions). Add the act-mode admission path from
      Q3. Strike the stale "until settle + ix-data implemented" blocker at
      lines 137-139. State the rule and the Q3 side-effect on the cold-relayer
      gate.
- [x] Document the Q4 Lighthouse limitations in the ADR body: brittle byte-
      offset (safe-by-failure), the Drift-class exclusion (off-chain-derived
      state), and the principal-safety vs QoS separation.
- [x] Note in bean body (done here): Velocity was the motivating example,
      evaluated, and rejected on Q4 grounds. Do NOT add Velocity to
      `ALLOWED_FORWARD_PROGRAMS`.
- [x] Do NOT add any new allowlist entry in this bean. Speculative — wait for
      a concrete use case that fits the amended rule (stake deposits, token
      burns, NFT mints, LP positions are candidate classes).

### Already shipped (out of scope — ADR-0026)

- Settle-phase residue→user sweep
- Phase 1b input-side fee skim
- NET-on-pull hardcoding
- Act-mode settlement shape (`output_mint = Pubkey::default()` sentinel)
- Three settlement shapes (deliver-no-transform / deliver-transform / act)

### Explicitly dropped

- ix-data amount pinning (Q2 — toothless post-0026; client-side concern)
- Drift/Velocity allowlist entry (Q4 — off-chain-derived state, no clean floor)
- Drift-native reader program (Q4 — attack-surface growth, ponytail rejected)

### What act mode is actually for (post-grilling)

NOT Drift. Act mode serves forwards whose settlement is a verifiable state
change in a single on-chain account field readable by Lighthouse:

- Stake deposits (`stakeAccount` assertion — Lighthouse ships this)
- Token burns / deflationary mechanisms (`mintAccount` supply field)
- NFT mint to target (`accountInfo` existence)
- LP position creation (`accountInfo` on new position account)
- Single-field collateral deposits where balance is a clean u64 in a known
  struct slot

Programs excluded: those whose safety state is a composite / off-chain
derivation over multiple on-chain fields (the Drift leverage class). Document
this boundary explicitly in the ADR.

## Summary of Changes

Documentation-only deliverable. No code changes — ADR-0026 shipped the act-mode
mechanism; this bean is the admission-rule + boundary follow-up.

- **Amended ADR-0016** (apps/docs/adr/0016-permissionless-composable-execution.md):
  - Added the **act-mode admission path** (third bullet in the allowlist-growth
    vetting rule): act mode settles with `output_mint == Pubkey::default()`,
    requires `post_validation` configured, create-time reject enforces it.
  - **Struck the stale blocker** ("until settle + ix-data implemented") and
    replaced the Non-fungible-output-forwards section with the post-0026 state:
    settle phase RESOLVED by ADR-0026, ix-data amount pinning DROPPED (Q2 —
    toothless post-0026).
  - Updated the cold-relayer gate language: act mode requires `post_validation`;
    `has_route_pin` alone is insufficient for act mode.
  - Documented the **Q4 Lighthouse limitations**: brittle byte-offset
    (safe-by-failure), the Drift-class exclusion (off-chain-derived composite
    state — no single-field floor), and the principal-safety vs QoS separation.
  - Added a new `## Amendment (2026-07-06, bean tributary-2p5g)` section
    recording the Q1–Q5 grilling decisions.
  - Updated the lookup-table non-fungible bullet and the v2.1-amendment closing
    note to reflect act-mode admission.
- **No allowlist change.** Velocity/Drift NOT added to
  `ALLOWED_FORWARD_PROGRAMS` (Q4 — off-chain-derived state). No new
  `ALLOWED_VALIDATION_PROGRAMS` entry (Lighthouse-only, attack-surface
  discipline).
