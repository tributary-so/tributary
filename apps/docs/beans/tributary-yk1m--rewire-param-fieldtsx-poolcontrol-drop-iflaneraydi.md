---
# tributary-yk1m
title: Rewire param-field.tsx PoolControl — drop if(lane===raydium), POOL_SOURCES[lane]={venue:lane}
status: todo
type: task
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-29T19:08:07Z
parent: tributary-24g9
blocked_by:
    - tributary-i2nd
---

assigned: implementer

Delete the if(lane==='raydium') branch, the two cloned components, pool-direction.ts duplication, and the 5-vs-6-arg onSelect drift. POOL_SOURCES[lane] becomes {venue: lane}; the venue adapter lives server-side.
