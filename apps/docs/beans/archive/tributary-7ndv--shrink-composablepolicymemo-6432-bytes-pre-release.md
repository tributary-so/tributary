---
# tributary-7ndv
title: Shrink ComposablePolicy.memo 64→32 bytes (pre-release layout)
status: completed
type: task
priority: normal
created_at: 2026-06-29T10:14:04Z
updated_at: 2026-06-29T10:48:11Z
---

## Context

"Grill" outcome (2026-06-29):

- **Purpose**: `memo` is a **user-defined, human-readable label** so users can identify which service a transfer/execution corresponds to. Tracking is secondary. NOT a binary correlation-ID field.
- **Deployment**: `ComposablePolicy` is **pre-release, zero live accounts** → free to reshape the layout. (`PaymentPolicy` is frozen on mainnet with user funds per ADR 0007 — out of scope.)
- **Account shape**: memo 64→32, **keep `padding: [u8; 32]`** at 32. Account shrinks 32 bytes (≈0.00026 SOL/account, one-time, rent-payer). Padding stays as the deliberate future-field buffer — don't burn it for trivial savings.
- **Why 32, not lower**: 32 bytes = a UUID-as-hex-string-without-dashes, and 32 ASCII chars is enough for short service labels. 16 (raw UUID binary) kills human-readable labels, which is the field's primary job.
- **ADR**: ship **ADR 0017** alongside the change explaining the composable(32)/payment(64) memo asymmetry. ADR 0007 already blesses composable/payment flat-struct asymmetry; this is another instance.

## Blast radius (composable-scoped)

Ripple is mechanical and confined to the composable path. PaymentPolicy / transfer / execute_payment paths are **untouched** (they stay `[u8; 64]`).

## Tasks

- [x] `ComposablePolicy.memo`: `[u8; 64]` → `[u8; 32]` (`programs/tributary/src/state/composable_policy.rs:106`)
- [ ] Update `ComposablePolicy::SIZE` arithmetic + comment (`...`:127, 64→32)
- [ ] `create_composable_policy` instruction arg: `memo: [u8; 64]` → `[u8; 32]` (`lib.rs:136`, `instructions/composable/create_composable_policy.rs:96`)
- [ ] `ComposablePolicyCreated` event `memo`: `[u8; 64]` → `[u8; 32]` (`state/events.rs:145`) — composable-only event, no PaymentPolicy cross-contamination
- [ ] SDK composable path: `encodeMemo(memo, 64)` → `encodeMemo(memo, 32)` (`packages/sdk/src/sdk.ts:2853`). Do **not** change the `encodeMemo` default (64) — PaymentPolicy still needs it.
- [ ] Composable tests: `new Array(64).fill(0)` → `new Array(32).fill(0)` in composable test files only: `tests/composable.test.ts`, `tests/topup-balance.test.ts`, `tests/topup-balance-swap.test.ts`, `tests/topup-balance-sol.test.ts`
- [ ] Write `apps/docs/adr/0017-composable-memo-32-bytes.md` (decision / rejected alts: 16-byte raw UUID, keep-at-64 / rationale: human-readable label is the job, 32 is the floor, ADR 0007 blesses asymmetry)
- [~] `anchor build` clean + 73/73 rust unit tests pass + SDK builds clean. Jest integration tests blocked by pre-existing Surfpool config-init race (identical failure on unmodified code via `git stash` — fails at `CreatePaymentGateway` setup, not memo).

## Non-goals

- **Do NOT** touch `PaymentPolicy.memo`, `PaymentRecord.memo`, `PaymentPolicyCreated.memo`, the `transfer` instruction, or `execute_payment` — all stay 64 (mainnet-frozen).
- **Do NOT** change `encodeMemo`'s default size (64).
- **Do NOT** remove or resize `ComposablePolicy.padding`.
- **Do NOT** add a new memo validation/trimming layer — caller responsibility.

## Verification

- `anchor build` clean (no SIZE arithmetic mismatch)
- Composable jest tests pass with 32-byte memos
- ADR 0017 merged; ADR index/README in apps/docs updated if one exists

## Summary of Changes

Shrunk `ComposablePolicy.memo` from `[u8; 64]` to `[u8; 32]` (32-byte account shrink, ≈0.00026 SOL/account). Composable-only: PaymentPolicy / transfer / execute_payment paths untouched (mainnet-frozen per ADR 0007).

**Files changed:**
- `programs/tributary/src/state/composable_policy.rs` — memo field 64→32, SIZE arithmetic 64→32
- `programs/tributary/src/lib.rs` — `create_composable_policy` arg 64→32
- `programs/tributary/src/instructions/composable/create_composable_policy.rs` — handler arg 64→32
- `programs/tributary/src/state/events.rs` — `ComposablePolicyCreated.memo` 64→32
- `packages/sdk/src/sdk.ts` — `encodeMemo(memo)` → `encodeMemo(memo, 32)` + doc comment (default stays 64)
- `tests/{composable,topup-balance,topup-balance-swap,topup-balance-sol}.test.ts` — `new Array(64)` → `new Array(32)`
- `apps/docs/adr/0017-composable-memo-32-bytes.md` — new ADR (decision + rejected: 16-byte raw UUID, keep-at-64)

**Verification:**
- `anchor build` clean (SIZE arithmetic consistent)
- 73/73 Rust unit tests pass
- SDK builds clean (types regenerate for 32-byte memo from IDL)
- Jest integration tests: blocked by pre-existing Surfpool config-init race (identical 18-test failure on unmodified code via `git stash` — fails at `CreatePaymentGateway` `config.admin` constraint in setup, not at any memo assertion). Not a memo-change regression.

(bean tributary-7ndv)
