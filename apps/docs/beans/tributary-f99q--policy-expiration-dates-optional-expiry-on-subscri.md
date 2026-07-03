---
# tributary-f99q
title: PayAsYouGo policy expiration (optional expiry_date)
status: todo
type: milestone
priority: high
created_at: 2026-07-02T12:00:19Z
updated_at: 2026-07-02T13:04:30Z
---

Three of five PolicyType variants (Subscription, Milestone, PayAsYouGo) have no overall expiration date. OneTime has expiry_date; UpTo has deadline. This milestone adds optional expiration to the remaining three so payers can set 'this authorization stops after timestamp X' without manually pausing/deleting.

## Scope
- Add optional expiry field to Subscription, Milestone, PayAsYouGo variants (128-byte fixed layout preserved per ADR-0002)
- Execute-time gate: reject execution if current_time > expiry
- SDK + CLI support for the new field
- Integration tests

## Note
tributary-qjxz (PayAsYouGo-only expiration) was scrapped as a duplicate of this work.

## REWRITTEN SCOPE (2026-07-02 — supersedes content above)

**Scope narrowed to PayAsYouGo only.** Subscription and Milestone dropped. This adopts the conclusion of the since-removed `tributary-qjxz` (PayAsYouGo-only) bean — its narrower scope was right, the original 3-variant scope here was wrong.

### Design decisions (from grilling)

1. **PayAsYouGo only.** Subscription already expresses "stop" via `max_renewals` (count-based) — "stop after 1 year" = 12 monthly renewals, already expressible. Milestone has absolute per-milestone timestamps; an overall expiry is just "after the last timestamp, lock the rest," already implied by release semantics. **PayAsYouGo is the only variant with neither a count cap nor absolute target dates — the genuine gap.** (Composable topup policies built on PayAsYouGo inherit this fix automatically since ComposablePolicy reuses PolicyType.)
2. **Per-variant field, not top-level.** ADR-0002's fixed 128-byte layout means OneTime's in-variant `expiry_date` bytes **cannot be removed**; a top-level field would create a permanent duplicate + a "which expiry wins?" precedence ambiguity on OneTime — not a consolidation. Matches the established pattern (ADR-0002 / ADR-0019 / ADR-0020 — lifecycle semantics live IN the variant).
3. **Field:** `expiry_date: Option<i64>` carved from PayAsYouGo's 88-byte padding (→ 79 bytes left). Variant stays exactly 128 bytes.
4. **Semantics:** `None` = never expires (backward-compatible default — zeroed legacy padding deserializes to `None` via borsh discriminant 0). `Some(ts)` with `ts > 0`: when `current_time > ts`, `execute_payment` / `execute_composable` fail with `TributaryError::PolicyExpired`. Boundary `current_time == expiry` is permitted (`<=`, mirroring OneTime). Orthogonal to the rolling period cap (`max_amount_per_period` / `period_length_seconds`) — whichever bound trips first wins.
5. **Soft gate only** — no new "Expired" `PolicyStatus`. Reuse `TributaryError::PolicyExpired`. Matches OneTime/UpTo.

### Tree

```
tributary-f99q (milestone)
├─ tributary-5lv3 (epic: implementation)
│  ├─ feature: program contract   ← Rust: field + validation + gate + unit tests
│  └─ feature: sdk compatibility  ← blocked-by program contract
├─ epic: testing
│  └─ feature: integration tests (surfpool)  ← blocked-by program contract
└─ feature: documentation         ← ADR-0021 + AGENTS.md
```

### Non-goals

- Subscription / Milestone date expiry (ruled out above).
- OneTime / UpTo changes (already expire).
- Top-level / cross-variant expiry field (rejected).
- On-chain "Expired" PolicyStatus transition (soft gate only).
