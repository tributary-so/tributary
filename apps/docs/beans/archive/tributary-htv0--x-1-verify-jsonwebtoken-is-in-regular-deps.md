---
# tributary-htv0
title: 'X-1: Verify jsonwebtoken is in regular deps'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:03Z
updated_at: 2026-07-06T16:46:32Z
parent: tributary-jnx8
---

sdk-x402/src/middleware.ts:7 — hard jsonwebtoken dependency. Verify it's in package.json regular deps, not peer.

## Summary of Changes
Verified jsonwebtoken is already in regular dependencies (packages/sdk-x402/package.json:35, "jsonwebtoken": "^9.0.2"). Types live in devDependencies as @types/jsonwebtoken. No change needed; the dependency classification is correct.
