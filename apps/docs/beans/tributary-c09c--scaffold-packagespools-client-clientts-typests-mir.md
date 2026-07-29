---
# tributary-c09c
title: Scaffold packages/pools-client — client.ts + types.ts mirroring tokens-client
status: todo
type: task
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-29T19:08:07Z
parent: tributary-30yg
---

assigned: implementer

createPoolsClient({baseUrl, fetch?}) → { searchPools(query, opts?) }. Types mirror the /v1/pools/search envelope (HANDOFF §2). Pure fetch, no React, no globals. Separate package (Q5) — NOT in tokens-client.
