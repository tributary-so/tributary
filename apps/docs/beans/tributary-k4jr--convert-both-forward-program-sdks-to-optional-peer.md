---
# tributary-k4jr
title: Convert both forward-program SDKs to optional peerDependencies + tsup external
status: completed
type: task
priority: high
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T12:18:10Z
parent: tributary-evkj
---

package.json: move @meteora-ag/dlmm from dependencies to peerDependencies, add @raydium-io/raydium-sdk-v2 to peerDependencies, add peerDependenciesMeta.optional:true for both. Add both to devDependencies so tests resolve. CRITICAL: tsup.config.ts external:[] must become external:['@meteora-ag/dlmm','@raydium-io/raydium-sdk-v2'] or the peerDep declaration is a lie (tsup inlines deps with external:[]). Breaking change for existing consumers — minor version bump.


## Summary of Changes

- `packages/forward-builders/package.json`:
  - Moved `@meteora-ag/dlmm` from `dependencies` → `peerDependencies` (optional)
  - Added `@raydium-io/raydium-sdk-v2` to `peerDependencies` (optional, `^0.2.59-alpha`)
  - Added both to `devDependencies` so tests resolve
  - Added `peerDependenciesMeta` with `optional: true` for both
- `packages/forward-builders/tsup.config.ts`: `external: []` → `external: ["@meteora-ag/dlmm", "@raydium-io/raydium-sdk-v2"]`
  - Verified: bundle now `import DLMM from "@meteora-ag/dlmm"` (external) instead of inlining
- `pnpm-lock.yaml`: refreshed (raydium-sdk-v2 + transitive deps added)

Verification: `pnpm test` (10/10 pass), `pnpm run build` succeeds, bundle grep confirms externalization.

Note: `@raydium-io/raydium-sdk-v2` publishes only prereleases; `^0.2.59-alpha` resolves to the `latest` dist-tag. Sibling task tributary-b3jg (actual raydium builder impl) can widen this if it needs the `2.0.x-rc` line.
