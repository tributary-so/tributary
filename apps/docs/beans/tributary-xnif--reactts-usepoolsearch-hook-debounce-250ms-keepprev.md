---
# tributary-xnif
title: react.ts usePoolSearch hook (debounce 250ms, keepPreviousData, staleTime 30s, enabled gate)
status: todo
type: task
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-29T19:08:07Z
parent: tributary-30yg
blocked_by:
    - tributary-c09c
---

assigned: implementer

usePoolSearch(query, {venue, enabled}) react-query hook. Debounced 250ms, keepPreviousData, staleTime 30s. Direct replacement for Mill's usePoolSearch / useRaydiumPoolSearch — ONE endpoint regardless of venue.
