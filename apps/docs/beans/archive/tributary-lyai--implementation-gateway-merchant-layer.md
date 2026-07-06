---
# tributary-lyai
title: 'Implementation: gateway merchant layer'
status: scrapped
type: epic
priority: high
created_at: 2026-07-03T09:09:40Z
updated_at: 2026-07-03T09:13:00Z
parent: tributary-mohi
---

Container epic for all implementation work on the gateway merchant layer. Closes when the API auth, API merchant endpoints, and App merchant UI features all close.

Child features (in dependency order):
1. API — gateway-authority auth (wallet-sign → JWT + middleware)  [unblocks the rest]
2. API — merchant query endpoints + CSV exports  [blocked-by 1]
3. App — merchant UI sections + CSV download  [blocked-by 2]

See parent milestone (tributary-mohi) for the locked scope verdict, definitions, auth model, and endpoint catalog.

## Reasons for Scrapping

Duplicate of tributary-6egw — created by a create call that reported no output but succeeded. tributary-6egw is the canonical implementation epic. No children, no work, safe to scrap.
