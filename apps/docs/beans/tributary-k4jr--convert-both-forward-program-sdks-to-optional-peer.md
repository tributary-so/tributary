---
# tributary-k4jr
title: Convert both forward-program SDKs to optional peerDependencies + tsup external
status: todo
type: task
priority: high
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T11:42:04Z
parent: tributary-evkj
---

package.json: move @meteora-ag/dlmm from dependencies to peerDependencies, add @raydium-io/raydium-sdk-v2 to peerDependencies, add peerDependenciesMeta.optional:true for both. Add both to devDependencies so tests resolve. CRITICAL: tsup.config.ts external:[] must become external:['@meteora-ag/dlmm','@raydium-io/raydium-sdk-v2'] or the peerDep declaration is a lie (tsup inlines deps with external:[]). Breaking change for existing consumers — minor version bump.
