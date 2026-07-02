---
# tributary-f99q
title: Policy Expiration Dates — optional expiry on Subscription, Milestone, PayAsYouGo
status: todo
type: milestone
priority: high
created_at: 2026-07-02T12:00:19Z
updated_at: 2026-07-02T12:00:19Z
---

Three of five PolicyType variants (Subscription, Milestone, PayAsYouGo) have no overall expiration date. OneTime has expiry_date; UpTo has deadline. This milestone adds optional expiration to the remaining three so payers can set 'this authorization stops after timestamp X' without manually pausing/deleting.

## Scope
- Add optional expiry field to Subscription, Milestone, PayAsYouGo variants (128-byte fixed layout preserved per ADR-0002)
- Execute-time gate: reject execution if current_time > expiry
- SDK + CLI support for the new field
- Integration tests

## Note
tributary-qjxz (PayAsYouGo-only expiration) was scrapped as a duplicate of this work.
