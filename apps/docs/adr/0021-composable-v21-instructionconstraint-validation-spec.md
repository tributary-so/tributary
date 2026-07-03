# Composable v2.1: InstructionConstraint + Unified ValidationSpec

## Decision

Three structural changes to the pre-launch `ComposablePolicy` account,
absorbing lessons from the Squads smart-account-program analysis (bean
tributary-ssd9):

1. **InstructionConstraint** — replaces `target_program`, `ByteRangeCheck[]`,
   and the proposed `ForwardAccountsPda` (scrapped) with one inline struct.
   The forward program, its instruction selector, and its positional
   account set are all pinned in a single struct on `ForwardConfig`.

2. **Unified ValidationSpec** — the old single-phase `ValidationConfig`
   (sentinel-disabled) is replaced by `ValidationSpec` enum
   (`Disabled | ProgramCall | Inline`), instantiated twice:
   `pre_validation` (replaces the old validation) and `post_validation`
   (NEW — runs after FORWARD, before SETTLE, generalizes `min_output_amount`).

3. **`min_output_amount` removed** — `post_validation` generalizes it.
   The NET/gross question is the owner's problem.

## Rejected alternatives

- **Keep `ForwardAccountsPda` as a separate typed account.** Rejected: the
  inline `pinned_accounts: [Pubkey; 4]` on `InstructionConstraint` achieves
  the same topological guarantee (route pinning) without a separate PDA
  account, seed, and lifecycle.

- **Keep `min_output_amount` alongside `post_validation`.** Rejected:
  redundant. A Lighthouse assertion on the output ATA post-forward is
  strictly more expressive than a u64 floor. Keeping both would be a
  confusing dual mechanism.

- **Implement `ValidationSpec::Inline` now.** Rejected: deferred to
  tributary-okhd. The variant exists in the enum (so the Borsh discriminant
  is reserved) but errors at create.

## Rationale

The Squads analysis showed that composable pull payments benefit from
**both** pre- and post-condition checking (like Squads' transaction
validators), and that route pinning is better expressed as an inline
constraint than a separate account. The structural change is possible
because `ComposablePolicy` is pre-launch — no migration.

The execute flow becomes:

```
1. PULL
2. PRE-VALIDATION  (optional — ValidationSpec::ProgramCall)
3. FORWARD         (optional — InstructionConstraint-pinned)
4. POST-VALIDATION (optional — ValidationSpec::ProgramCall)
5. SETTLE          (sweep + fees, NO min_output check)
```

The cold-relayer gate (ADR-0016 amended) becomes:
`has_post_validation || has_route_pin` — either is a valid safety net
for a non-trusted scheduler. The degenerate-pin guard rejects an
InstructionConstraint with zero effective pins when forward is enabled.

(bean tributary-zvku)
