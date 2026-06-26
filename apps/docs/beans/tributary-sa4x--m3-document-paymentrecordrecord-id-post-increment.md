---
# tributary-sa4x
title: 'M3: Document PaymentRecord.record_id post-increment contract'
status: completed
type: task
priority: normal
created_at: 2026-06-22T12:35:17Z
updated_at: 2026-06-22T12:39:21Z
---

Commit a0a19d6 moved payment_count increment before should_pause check (correct fix for max_renewals boundary), but as a side effect shifted PaymentRecord.record_id from pre-increment (0-indexed) to post-increment (1-indexed). Off-chain indexers may miscount.

Going with Option B from the report: document the new contract on the event struct + add CHANGELOG breaking entry. The post-increment behavior is correct for pause-boundary semantics; reverting (Option A) would reintroduce the off-by-one in max_renewals.

Also adds the breadcrumb comment requested by finding L1.

Report: reports/M3-record-id-semantic-shift-paymentrecord-event.md

## Summary of Changes

- Added doc comment on `PaymentRecord.record_id` in `state/events.rs` documenting the post-increment contract.
- Added breadcrumb comment on the `emit!` line in `execute_payment.rs` pointing to `policies/traits.rs` where the increment now lives (addresses L1).
- Created `CHANGELOG.md` (Keep a Changelog format) with a Breaking entry noting record_id is now post-increment (starts at 1, was 0).
- Documentation-only — cargo build succeeds, no behavior change.
- `reports/`, `target/`, `.beans/` untouched (except this bean file).
