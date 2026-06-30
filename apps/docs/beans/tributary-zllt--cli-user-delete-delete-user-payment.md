---
# tributary-zllt
title: 'CLI: user delete (delete_user_payment)'
status: completed
type: task
priority: normal
created_at: 2026-06-29T07:51:25Z
updated_at: 2026-06-30T07:37:47Z
parent: tributary-hy8a
blocked_by:
    - tributary-p6n3
    - tributary-d2i0
---

Parent: `tributary-hy8a` — CLI v2 epic
Track: B (surface contract) · Blocked-by: `cli-cleanup` AND external SDK bean
`tributary-d2i0` (SDK `deleteUserPayment` method does not
exist today; `tests/tributary.test.ts` builds the ix by hand).

## Requirement

Surface `delete_user_payment` as `user delete`. Split into its own child solely
because it is gated on SDK work — every other v1 gap lives in `cli-v1-gaps`
and is unblocked.

## Spec

- `user delete --mint <mint>` wraps the new `sdk.deleteUserPayment(mint)`.
- Owner signs (`owner: Signer` on the instruction). Resolves the UserPayment PDA
  `["user_payment", owner, mint]` and closes it (rent refund to owner).
- Guarded on-chain by `!config.emergency_pause` and by the policy-count state
  on `UserPayment` (program rejects if open policies remain — surface that error
  cleanly).
- Once the SDK method lands, this is a thin command; until then it cannot start.

### Decisions cited (not re-decided)

- **ADR-0001** — per-`(user, mint)` `UserPayment` PDA is the delegate; deleting
  it closes that scoping unit. The legacy global `PaymentsDelegate` is retained
  only for back-compat and is out of scope (non-goal).
- **Epic "Out of scope"** — SDK gaps get their own beans; the prerequisite SDK
  method is tracked as a standalone task, not as CLI code.

## Acceptance Criteria

- [ ] `user delete --mint <mint>` closes the UserPayment account and refunds
      rent to the owner, end-to-end on Surfpool.
- [ ] Fails cleanly when open PaymentPolicy / ComposablePolicy accounts remain.
- [ ] Uses `sdk.deleteUserPayment`, not a hand-built instruction.

## Test Plan

- Port the manual `delete_user_payment` ix from `tests/tributary.test.ts` as a
  CLI smoke test once the SDK method exists.
- Negative: delete with an active policy → expect the program's
  `PoliciesRemaining` (or equivalent) error, surfaced readably.
- Lint + build clean.

## Workflow

routing: implementer · cannot start until SDK `deleteUserPayment` ships.

## Summary of Changes

Added user delete command wrapping sdk.deleteUserPayment(mint). Fails cleanly on-chain if open policies remain. Rent refunded to owner.
