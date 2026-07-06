---
# tributary-6egw
title: 'Implementation: gateway merchant layer'
status: completed
type: epic
priority: high
created_at: 2026-07-03T09:10:01Z
updated_at: 2026-07-05T08:40:48Z
parent: tributary-mohi
---

Container epic for all implementation work on the gateway merchant layer. Closes when the API auth, API merchant endpoints, and App merchant UI features all close.

Child features (in dependency order):
1. API — gateway-authority auth (wallet-sign → JWT + middleware) [unblocks the rest]
2. API — merchant query endpoints + CSV exports [blocked-by 1]
3. App — merchant UI sections + CSV download [blocked-by 2]

See parent milestone (tributary-mohi) for the locked scope verdict, definitions, auth model, and endpoint catalog.
