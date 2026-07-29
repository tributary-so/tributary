---
# tributary-i2nd
title: Build unified PoolPicker replacing PoolAutocomplete + RaydiumPoolAutocomplete
status: todo
type: task
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-29T19:08:07Z
parent: tributary-24g9
blocked_by:
    - tributary-xnif
---

assigned: implementer

Uses usePoolSearch(q, {venue: template.lane}). Renders normalized rows (pair symbols + logos + TVL + fee + stars/tier1 badge). Emits uniform onSelect(pool, srcMint, tgtMint, extras, srcMeta, tgtMeta). One shell for all venues.
