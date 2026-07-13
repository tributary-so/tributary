---
# tributary-piso
title: 'CLI: delegate lifecycle — approve/revoke/migrate'
status: completed
type: task
priority: normal
created_at: 2026-06-29T07:51:25Z
updated_at: 2026-06-30T07:36:22Z
parent: tributary-hy8a
blocked_by:
    - tributary-p6n3
---

Parent: `tributary-hy8a` — CLI v2 epic
Track: B (surface contract) · Blocked-by: `cli-cleanup`

## Requirement

Surface the token-delegate lifecycle that today is hidden inside
`createSubscription`. A user who already has a `UserPayment` (and has revoked
the delegate, or wants to re-approve after a revoke) has no CLI path.

## Spec

- **`delegate approve --mint <mint> --amount <lamports|\"unlimited\">`** —
  SPL `approve` on the user's source ATA with delegate = the **UserPayment PDA**
  (`["user_payment", owner, mint]`). Build with `@solana/spl-token` (already a
  workspace dep) — no SDK method needed; this is a standard token-program op.
- **`delegate revoke --mint <mint>`** — SPL `revoke` on the same ATA.
- **`delegate migrate`** — wraps `sdk.migrateDelegate` (`sdk.ts:1635`): moves a
  user still on the legacy global `PaymentsDelegate` PDA onto their per-mint
  `UserPayment` PDA delegate.

### Decisions cited (not re-decided)

- **ADR-0001** — the **UserPayment PDA itself is the delegate** on the source
  ATA (not the global `["payments"]` PDA). Per-`(user, mint)` scoping isolates
  blast radius; the approve is a one-time setup. `approve`/`revoke` here set the
  delegate to exactly that PDA. `migrate` is the back-compat bridge from the
  legacy global delegate (retained as a fallback via `resolve_delegate`).
- No ADR-0016 relevance (composable-only).

## Acceptance Criteria

- [ ] `delegate approve` sets the ATA delegate to the UserPayment PDA with the
      requested amount (verifiable via `spl-token display` / `getAccount`).
- [ ] `delegate revoke` clears the delegate; subsequent `payment execute` fails
      until re-approved.
- [ ] `delegate migrate` moves a legacy-delegate user onto the UserPayment PDA
      delegate and a subsequent `payment execute` succeeds.
- [ ] `--amount unlimited` maps to `u64::MAX` (delegated_amount).

## Test Plan

- Revoke → execute (fails) → approve → execute (succeeds) loop against
  Surfpool, mirroring the delegate-approval assertions in
  `tests/tributary.test.ts`.
- `delegate migrate` against an account created under the legacy global
  delegate path.
- Lint + build clean.

## Workflow

routing: implementer · delegate model per ADR-0001.

## Summary of Changes

Added delegate topic with approve/revoke/migrate commands. delegate approve uses @solana/spl-token createApproveInstruction with delegate = UserPayment PDA. delegate revoke uses createRevokeInstruction. delegate migrate wraps sdk.migrateDelegate. All three support --amount unlimited (u64::MAX).
