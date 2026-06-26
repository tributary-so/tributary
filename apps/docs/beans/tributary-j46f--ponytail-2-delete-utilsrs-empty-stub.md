---
# tributary-j46f
title: 'Ponytail #2: delete utils.rs (empty stub)'
status: completed
type: task
priority: high
tags:
    - ponytail
    - dead-code
created_at: 2026-06-24T12:37:47Z
updated_at: 2026-06-24T12:53:24Z
parent: tributary-9hca
---

Whole file (12 LOC) is a doc-comment stub. The header literally says "What remains here is intentionally minimal" — but what remains is *nothing*: only the module doc. All three former occupants (referral distribution, calendar-month math, Token-2022 mint validation) migrated to `shared/referral.rs`, `shared/schedule.rs`, `shared/mint.rs` under audit finding M1.

## Cut

- [x] Delete `programs/tributary/src/utils.rs`
- [x] Remove `pub mod utils;` from `programs/tributary/src/lib.rs:14`
- [x] `cargo check` clean; `cargo test --lib` 60/0

## Verification

No behavior change. The file has no items, so no caller can break.

## Files
- `programs/tributary/src/utils.rs` (delete)
- `programs/tributary/src/lib.rs` (one-line removal at line 14)

## Summary of Changes

- Deleted `programs/tributary/src/utils.rs` (12 LOC, doc-comment-only stub).
- Removed `pub mod utils;` from `programs/tributary/src/lib.rs:14`.
- `cargo check` clean; `cargo test --lib` 60/0.

No behavior change. The file contained no items — all former occupants had already migrated to `shared/{referral,schedule,mint}.rs` under audit M1.
