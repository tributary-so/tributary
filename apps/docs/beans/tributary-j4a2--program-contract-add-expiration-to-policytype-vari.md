---
# tributary-j4a2
title: 'Program contract: add expiration to PolicyType variants'
status: todo
type: feature
priority: high
created_at: 2026-07-02T12:01:44Z
updated_at: 2026-07-02T12:01:58Z
parent: tributary-5lv3
---

Add optional expiry field (Option<i64>) to Subscription, Milestone, PayAsYouGo variants. 128-byte fixed layout preserved. Execute-time gate rejects if current_time > expiry.
