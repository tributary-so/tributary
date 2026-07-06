---
# tributary-j4a2
title: 'Program contract: add expiration to PolicyType variants'
status: scrapped
type: feature
priority: high
created_at: 2026-07-02T12:01:44Z
updated_at: 2026-07-02T13:07:47Z
parent: tributary-5lv3
---

Add optional expiry field (Option<i64>) to Subscription, Milestone, PayAsYouGo variants. 128-byte fixed layout preserved. Execute-time gate rejects if current_time > expiry.

## Reasons for Scrapping (2026-07-02)

Old-scope (3-variant: Subscription + Milestone + PayAsYouGo) program-contract feature. Superseded by tributary-clo7 (PayAsYouGo-only) after the grilling narrowed the milestone. Subscription and Milestone were dropped from scope (see milestone tributary-f99q design decisions).
