---
# tributary-s8y9
title: pools module in apps/api — sync + index + /v1/pools routes
status: completed
type: epic
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T13:22:57Z
parent: tributary-gq0p
blocked_by:
    - tributary-ergr
---

The pool resolver as an in-process MODULE of apps/api (NOT a new app — see milestone REWRITTEN SCOPE).
Owns: the `/v1/pools` route, the Raydium sync service, the tokens.xyz refresh + star precompute, and the dedicated sync DB connection.
All under `apps/api/src/{routes,services,db}`. Blocked by pools-data (needs the `pools` schema migrated by apps/api).
