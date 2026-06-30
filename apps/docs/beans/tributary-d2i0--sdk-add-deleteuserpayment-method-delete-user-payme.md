---
# tributary-d2i0
title: 'SDK: add deleteUserPayment method (delete_user_payment)'
status: completed
type: task
priority: normal
created_at: 2026-06-29T07:51:25Z
updated_at: 2026-06-29T19:44:13Z
---

Standalone prerequisite (NOT a child of `tributary-hy8a` — the epic's "Out of
scope" puts SDK gaps in their own beans). Blocks: `cli-user-delete`.

## Requirement

Add `Tributary.deleteUserPayment(mint)` to `packages/sdk/src/sdk.ts`, wrapping
the on-chain `delete_user_payment` instruction. Today `tests/tributary.test.ts`
builds the instruction by hand; the CLI cannot surface `user delete` until this
exists.

## Spec

- Mirror the style of the existing `deletePaymentPolicy` / `deletePaymentGateway`
  methods in `sdk.ts`.
- Owner signs; resolves `UserPayment` PDA `["user_payment", owner, mint]`,
  closes it, refunds rent to owner. Resolves `ProgramConfig` PDA for the
  `!emergency_pause` guard.
- Re-export from `packages/sdk/src/index.ts`.

### Decisions cited

- **ADR-0001** — per-`(user, mint)` UserPayment PDA; `owner: Signer` binds the
  PDA identity (same reason `create_user_payment` requires the owner sig).
- On-chain instruction: `programs/tributary/src/instructions/user/delete_user_payment.rs`
  (exists; guarded by `!config.emergency_pause`).

## Acceptance Criteria

- [ ] `sdk.deleteUserPayment(mint)` returns a runnable instruction.
- [ ] Re-exported from the package entry; typed in the SDK surface.
- [ ] `tests/tributary.test.ts` updated to use it instead of the hand-built ix.

## Test Plan

- Replace the hand-built ix in `tests/tributary.test.ts`; suite still green.
- `cd packages/sdk && pnpm run build`.
- `anchor test` / `cd tests && npx jest` for the delete_user_payment flow.

## Workflow

routing: implementer · unblocks `cli-user-delete`.

## Summary of Changes

- Added `Tributary.deleteUserPayment(tokenMint)` to `packages/sdk/src/sdk.ts`, mirroring `deletePaymentPolicy`/`deletePaymentGateway` style. Resolves UserPayment + ProgramConfig PDAs, owner signs, refunds rent to owner, honors `!emergency_pause`.
- Already re-exported via existing `export * from "./sdk"` in `packages/sdk/src/index.ts` (no change needed).
- Replaced hand-built `deleteUserPayment` instruction in `tests/tributary.test.ts` with `sdk.deleteUserPayment(tokenMint)`.
- Verified: `cd packages/sdk && pnpm run build` green; `tsc --noEmit` on test file clean; built `.d.ts`/JS contain the new method.
