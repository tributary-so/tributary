---
# tributary-1fcv
title: 'Ponytail #7: unify PaymentStatus and PolicyStatus enums'
status: completed
type: task
priority: high
tags:
    - ponytail
    - dedup
created_at: 2026-06-24T12:38:55Z
updated_at: 2026-06-25T18:55:36Z
parent: tributary-9hca
---

Two near-identical status enums exist:

- `state/payment_policy.rs:166-172` — `PaymentStatus { Active, Paused }`
- `state/policy_status.rs:3-14` — `PolicyStatus { Active, Paused, Completed }`

`PaymentStatus` is used only by `PaymentPolicy`. `PolicyStatus` is used by `ComposablePolicy`. The only delta is `Completed`, which PaymentPolicy never reaches today (it uses `Paused` as terminal state, set inside `MilestoneStrategy::update_policy_state`).

Consequence: `change_payment_policy_status::handler` and `change_composable_status::handler` each carry their own `Active↔Paused` transition match. Identical logic.

## Cut

- [ ] Delete `PaymentStatus` enum + its derives
- [ ] Rename all `PaymentStatus` references to `PolicyStatus` across:
  - `state/payment_policy.rs` (`PaymentPolicy.status` field, size comment)
  - `instructions/payment/{create,change_status,delete,execute}_payment_policy.rs`
  - `instructions/payment/execute_payment.rs:37` (`constraint = payment_policy.status == PaymentStatus::Active`)
  - `policies/milestone.rs:140` (`PaymentStatus::Paused`)
  - `state/events.rs` (`PaymentPolicyStatusChanged.old/new_status`)
- [ ] After unification, `change_payment_policy_status::handler` can adopt the same 3-arm `Active↔Paused↔Completed` match as `change_composable_status` — OR keep the 2-arm version if `Completed` should stay terminal-for-payment-policies (semantic decision: can a payment policy be explicitly Completed by the owner? If yes, allow the transition; if no, reject `(_, Completed)` for PaymentPolicy).

## Verification

- Account layout unchanged — both enums serialize identically (1-byte discriminator, Anchor borsh). No migration.
- `cargo test --lib` + `anchor test` must pass.

## Risk

Low. Pure rename + one transition-rule decision.

## Decision needed

Should `PaymentPolicy` allow owner-initiated `Active → Completed`? If yes, the unified enum's full transition table applies. If no, the payment-policy status-change handler keeps its narrower `Active↔Paused` only match (and execution can still set `Completed` for exhausted subscriptions post-M7 — currently it sets `Paused`).

## Files
- `programs/tributary/src/state/payment_policy.rs:166-172` (delete enum)
- `programs/tributary/src/state/policy_status.rs` (keep, becomes the single enum)
- All `PaymentStatus` references repo-wide

## Decisions (2026-06-25)

- **Owner-initiated `Active -> Completed` on PaymentPolicy: REJECTED.** `change_payment_policy_status::handler` keeps the 2-arm `Active<->Paused` match; `Completed` is rejected for PaymentPolicy. `Completed` is a program-internal terminal state only.
- **Program-set terminal state now writes `Completed` instead of `Paused`.** Today every program-set `Paused` is actually terminal (subscription `max_renewals` hit; milestones exhausted). PAYG never auto-pauses (no global max). After unification:
  - Subscription: `max_renewals` reached -> status = `Completed`
  - Milestone: `current_milestone >= total_milestones` -> `Completed`
  - PayAsYouGo: never auto-terminal (unchanged)
  - Owner pause/resume via `change_payment_policy_status`: still `Active<->Paused`
  - Behavior change: new terminal transitions write `Completed`. Historical on-chain accounts keep their old `Paused` (no migration). Indexers keying on `status == Paused` to detect 'done' must add `Completed`.

## SDK scope (added — bean was Rust-only)

Bean missed the SDK impact. Three issues triggered by the Rust rename:

- `packages/sdk/src/types.ts:88` `export type PaymentStatus = IdlTypes<...>["paymentStatus"]` stops compiling after IDL regen (IDL drops `paymentStatus`, keeps `policyStatus`). The comment is also wrong (claims 'payment execution status: success/fail/pending' — fiction; `PaymentRecord` has no status field).
- `packages/sdk/src/sdk.ts:1695` `changePaymentPolicyStatus` uses inline literal `{ active: {} } | { paused: {} }` instead of an IDL type (asymmetric vs `changeComposablePolicyStatus` which uses `PolicyStatus`).
- `PaymentStatus` is a public SDK export -> hard rename breaks production integrations.

Out of scope: `packages/payments/src/types/tributary.ts:91` `PaymentStatus` interface (pending/paid/failed) is a different domain; do NOT touch.

## Cut (Rust)

- [ ] Delete `PaymentStatus` enum (`state/payment_policy.rs:150-159`); re-export is via `pub use payment_policy::*` so `state::PaymentStatus` disappears cleanly.
- [ ] Rename `PaymentStatus` -> `PolicyStatus` in: `state/payment_policy.rs` (field + size comment), `state/events.rs:2,92,93`, `instructions/payment/{create,change_status,execute}_payment_policy.rs`, `instructions/payment/execute_payment.rs:37` (constraint), `policies/milestone.rs:140`, `policies/pay_as_you_go.rs:195,220`, `lib.rs:72`.
- [ ] Terminal-Completed: `execute_payment.rs:286-288` set `PolicyStatus::Completed` (not `Paused`) when `should_pause`. `policies/milestone.rs:140` likewise. Keep `change_payment_policy_status::handler` 2-arm `Active<->Paused`.
- [ ] `cargo build`; verify `target/idl/tributary.json` has only `PolicyStatus` type.
- [x] `cargo test --lib` (64 passed). `anchor test` deferred to SDK test phase (requires Surfpool runtime).

## Cut (SDK)

- [ ] `packages/sdk/src/types.ts`: fix comment; replace `PaymentStatus` alias with `export type PaymentStatus = PolicyStatus;` deprecation alias (\@deprecated, removed next minor). Widening (adds `completed`) = backward compatible at call sites.
- [ ] `packages/sdk/src/sdk.ts:1695`: widen `newStatus` param from inline literal to `PolicyStatus`. Update JSDoc: `completed` accepted by type, rejected by program for PaymentPolicy.
- [x] `cd packages/sdk && pnpm run build` (clean, incl .d.ts). Lint is a repo no-op (`exit 0`).
- [x] `cd tests && npx jest`: pre-existing babel/TS-transform config breakage (6/6 suites fail to PARSE on unchanged lines, confirmed identical with changes stashed). Tests require Surfpool runtime per AGENTS.md. Touched call sites (797,841,4146 passing `{paused}/{active}` literals) verified to type-check against the widened `PolicyStatus` via standalone tsc.

## Summary of Changes

Unified the dual status enums into a single `PolicyStatus { Active, Paused, Completed }` across program + SDK, with a semantic upgrade and a backward-compatible SDK transition.

### Rust (program)
- Deleted `PaymentStatus { Active, Paused }` (`state/payment_policy.rs`); all references renamed to `PolicyStatus` (state/events.rs, lib.rs, instructions/payment/{create,change_status,execute}_payment_policy.rs, execute_payment.rs, policies/milestone.rs, policies/pay_as_you_go.rs, policies/README.md).
- **Decision (per Fabian, 2026-06-25):** owner-initiated `Active -> Completed` on PaymentPolicy is REJECTED. `change_payment_policy_status::handler` keeps the 2-arm `Active<->Paused` match.
- **Behavior change — program-set terminal state now writes `Completed`:** previously every program-set `Paused` was actually terminal. Now `execute_payment.rs` writes `PolicyStatus::Completed` when `should_pause` (subscription `max_renewals` reached, or all milestones released), and `policies/milestone.rs` likewise. PayAsYouGo never auto-completes (no global max). Historical on-chain accounts keep their legacy `Paused`; no migration. Indexers keying on `status == Paused` to detect 'done' must also accept `Completed`.
- Account layout unchanged (1-byte borsh discriminator, identical for Active/Paused). Zero migration.
- `cargo test --lib`: 64 passed. IDL regenerated; `target/idl/tributary.json` exposes only `PolicyStatus`.

### SDK (`@tributary-so/sdk`)
- `types.ts`: fixed the misleading comment on `PaymentStatus` (it claimed 'payment execution status: success/fail/pending' — fiction; `PaymentRecord` has no status field). `PolicyStatus` is now the single canonical lifecycle type. `PaymentStatus` kept as a `@deprecated` alias = `PolicyStatus` for one minor release — a widening (adds `completed`), so existing call sites passing `{ active: {} } / { paused: {} }` keep compiling.
- `sdk.ts` `changePaymentPolicyStatus`: widened the `newStatus` param from the inline literal `{ active: {} } | { paused: {} }` to `PolicyStatus` (parity with `changeComposablePolicyStatus`). JSDoc notes `completed` is accepted by the type but rejected by the program for PaymentPolicy.
- `pnpm run build`: clean (incl .d.ts emission). Project-aware `tsc --noEmit` reports no errors in sdk.ts/types.ts.

### Verification gaps (honest)
- `anchor test` and `cd tests && npx jest` NOT executed: jest hits a pre-existing babel/TS-transform config breakage in this worktree (6/6 suites fail to PARSE on unchanged import lines; identical with my changes stashed) and requires Surfpool runtime per AGENTS.md. The three touched `changePaymentPolicyStatus` call sites in `tests/tributary.test.ts` (797, 841, 4146) verified to type-check against the widened `PolicyStatus` via standalone `tsc`.

### Out of scope (intentionally)
- `packages/payments/src/types/tributary.ts` `PaymentStatus` interface (pending/paid/failed) — different domain, not touched.
- No on-chain migration helper (borsh layout byte-identical).
- No downstream codemod (deprecation alias covers consumers).
