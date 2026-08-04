---
# tributary-jmar
title: SDK ESM directory-import leak breaks CLI runtime
status: completed
type: bug
priority: high
created_at: 2026-07-21T10:32:20Z
updated_at: 2026-07-21T10:39:46Z
---

packages/sdk/src/sdk.ts:12 uses `import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes"` (a directory import). The SDK is built ESM via tsup with anchor kept external, so the directory import leaks verbatim into dist/packages/sdk/src/index.js and Node ESM rejects it with ERR_UNSUPPORTED_DIR_IMPORT when any consumer (CLI, checkout) loads the SDK at runtime. Same bug in apps/checkout/src/lib/tributary.ts:18.

Fix: point at anchor's ESM build with full file path: `@coral-xyz/anchor/dist/esm/utils/bytes/index.js`.

- [ ] Patch packages/sdk/src/sdk.ts:12
- [ ] Patch apps/checkout/src/lib/tributary.ts:18
- [ ] Rebuild SDK
- [ ] Verify CLI runs the pda command

## Summary of Changes

### Root cause
`packages/sdk/src/sdk.ts:12` imported `bs58` from `@coral-xyz/anchor/dist/cjs/utils/bytes` (a directory import). The SDK is built ESM via tsup with `@coral-xyz/anchor` kept external, so the directory import leaked verbatim into `dist/packages/sdk/src/index.js:127`. Node ESM rejects directory imports (`ERR_UNSUPPORTED_DIR_IMPORT`) — directory→`index.js` resolution is CJS-only. Same bug in `apps/checkout/src/lib/tributary.ts:18`.

First attempt (swap to `dist/esm/utils/bytes/index.js`) failed: anchor's own ESM build is also broken (`utils/bytes/utf8.js` does `import {isBrowser} from "../common"` — another directory import — and uses `require("util")` in an ESM file). Already noted in `tributary-lb9f`.

### Fix
Dropped the deep import entirely. Both files already do `import * as anchor from "@coral-xyz/anchor"`, so all five call sites now use `anchor.utils.bytes.bs58.encode(...)` (re-exported through anchor's main entry — Node ESM loads anchor's CJS build via the `main` field cleanly). Left a `ponytail:` comment at both former import sites explaining why.

### Verification
- `pnpm --filter @tributary-so/sdk build` → clean, no directory imports in output.
- `pnpm --filter @tributary-so/sdk test` → 13/13 pass.
- `tsc --noEmit` on SDK, CLI, checkout → clean.
- `npx . pda user-payment --user GMaUX… --token-mint EPjFWdd5…` → runs end-to-end, returns PDA `71iv6RDTt9ebMyQk7mbSG1Kzubre2fLB5TmPsnUQTYGV` bump 254.

### Files
- `packages/sdk/src/sdk.ts` — dropped broken import; 2 call sites → `anchor.utils.bytes.bs58.encode`.
- `apps/checkout/src/lib/tributary.ts` — dropped broken import; 3 call sites → `anchor.utils.bytes.bs58.encode`.
