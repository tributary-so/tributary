---
# tributary-podi
title: tokens.xyz refresh + star precompute (reuse services/tokens-proxy.ts)
status: todo
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T09:07:38Z
parent: tributary-s8y9
blocked_by:
    - tributary-ssvc
---

assigned: implementer

Refresh `tokens` for pooled mints, REUSING apps/api's existing tokens.xyz upstream client (`services/tokens-proxy.ts`) — same service now (milestone REWRITTEN SCOPE).
Curated mint -> asset+tier; unknown -> singleton `solana-<mint>` with known=false. Star precompute per HANDOFF section 4: stars = (a.known?1:0)+(b.known?1:0); tier1 if any side is tier1. Recompute affected pools when a tokens row changes.
Writes go through the dedicated sync DB connection.
