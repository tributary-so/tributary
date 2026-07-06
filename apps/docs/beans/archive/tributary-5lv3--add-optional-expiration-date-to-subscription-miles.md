---
# tributary-5lv3
title: 'Implementation: PayAsYouGo expiration'
status: completed
type: epic
priority: high
created_at: 2026-07-02T09:13:36Z
updated_at: 2026-07-04T10:46:42Z
parent: tributary-f99q
---

## Problem

Three of the five PolicyType variants have no overall expiration date. OneTime has `expiry_date: Option<i64>`; UpTo has a mandatory `deadline`. The other three currently run indefinitely (Subscription until `max_renewals` is hit, Milestone until all milestones release, PayAsYouGo forever within its rolling period cap). There is no way for a payer to say "this authorization stops pulling after timestamp X" on those variants.

## Scope

Add an optional `expiry_date: Option<i64>` (None = never expires) to:

- [ ] `Subscription`
- [ ] `Milestone`
- [ ] `PayAsYouGo`

Semantics: `None` = never expires (backward-compatible default). When `Some(ts)` and `current_time > ts`, `execute_payment` / `execute_composable` fail with `PolicyExpired`. Orthogonal to each variant's existing lifecycle (renewal count, per-milestone timestamps, period cap) — whichever boundary fires first wins.

## Design notes

- **No account resize.** All three variants carry padding with room for 9 bytes (Sub: 97, Milestone: 53, PayG: 88). Carve `Option<i64>` from padding. ADR-0002's 128-byte-per-variant invariant holds.
- **Backward compat.** Existing on-chain accounts have zeroed padding. Borsh `Option` discriminant 0 = `None`, so legacy accounts deserialize as `None` = never expires. Verify with a deserialization test before claiming compatibility.
- **Execute-time gating** lives in `programs/tributary/src/shared/schedule.rs` next to the existing OneTime (`current_time <= expiry`) and UpTo (`current_time < deadline`) checks. Reuse `TributaryError::PolicyExpired`.
- **Validation** in each `policies/*.rs` module: only constraint is `expiry_date > 0` when `Some` (mirrors OneTime). No cross-field ordering to enforce on these variants.

## Checklist

- [ ] Rust: add `expiry_date: Option<i64>` to the 3 variants, carve from padding, keep 128 bytes
- [ ] Rust: extend `validate_*_policy` in `policies/{subscription,milestone,payg}.rs`
- [ ] Rust: add expiry gate in `shared/schedule.rs` for the 3 variants + unit tests
- [ ] Rust: backward-compat deserialization test (zeroed account → `None`)
- [ ] SDK: optional `expiryDate` param on the 3 builders + types
- [ ] ADR-0021: optional policy expiration for Subscription/Milestone/PayAsYouGo
- [ ] Update `AGENTS.md` PolicyType table + ADR map

## Open questions

- Should `create_payment_policy` accept expiry as a top-level arg or per-variant? (OneTime embeds it in the variant; likely mirror that.)
- Do we want an on-chain "expired" `PolicyStatus` transition, or just a soft execute-time gate? (Soft gate is cheaper; OneTime/UpTo use the soft gate.)

## Non-goals

- Changing OneTime/UpTo (already expire).
- Admin/global expiry override (emergency pause already covers halting).

## REWRITTEN SCOPE (2026-07-02 — supersedes content above)

Repurposed as the **implementation epic** for the PayAsYouGo-only expiration milestone (tributary-f99q). Theme groups the code-bearing deliverables across layers. See the milestone body for the locked design decisions; children carry TDD acceptance criteria.

Children:

- feature: changes to program contract (`programs/tributary/`) — variant field, validation, execute-time gate, unit tests, backward-compat deserialization.
- feature: sdk compatibility (`packages/sdk`) — optional `expiryDate` builder param + types. Blocked-by program contract.

Removed from scope: Subscription and Milestone (see milestone non-goals).
