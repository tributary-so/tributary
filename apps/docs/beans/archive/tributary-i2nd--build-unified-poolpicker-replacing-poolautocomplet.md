---
# tributary-i2nd
title: Build unified PoolPicker replacing PoolAutocomplete + RaydiumPoolAutocomplete
status: completed
type: task
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-30T00:00:00Z
parent: tributary-24g9
blocked_by:
  - tributary-xnif
---

assigned: implementer

Uses usePoolSearch(q, {venue: template.lane}). Renders normalized rows (pair symbols + logos + TVL + fee + stars/tier1 badge). Emits uniform onSelect(pool, srcMint, tgtMint, extras, srcMeta, tgtMeta). One shell for all venues.

## Summary of Changes

Built the unified, venue-agnostic `PoolPicker` as a dependency-light
presentational module in `packages/pools-client` (no HeroUI, no Mill
internals), shipped via the `@tributary-so/pools-client/react` subpath.

**Why in pools-client (not the Mill app):** the Mill app is a separate git
repo (`/home/xeroc/projects/Tributary/mill`, its own `mill-*` bean store) and
does not yet depend on `@tributary-so/pools-client`. This bean is a
tributary bean and the daemon operates on the tributary worktree, so the
code lands here. The picker is presentational so it inverts no dependency:
Mill embeds `<PoolRow/>` inside its own HeroUI `AutocompleteItem` (the
yk1m rewire) and the pure helpers replace Mill's duplicated
`pool-direction.ts`.

**Added:**

- `packages/pools-client/src/picker.tsx` — `PoolRow` (pair logos + symbols +
  stars/tier1 trust badge + TVL + fee), `PoolResultsList` (standalone
  listbox shell), and the pure contract: `PoolSelectHandler` (the uniform
  positional 6-arg `onSelect(pool, srcMint, tgtMint, extras, srcMeta,
tgtMeta)`), `resolvePoolDirection`, `impliedPoolDirection`, `selectPool`,
  `formatTvl`, `formatFee`, `starGlyph`, `STABLE_MINTS`, `Direction`,
  `PoolLegMeta`. `extras` carries venue side-channels server-side (e.g.
  Raydium `ammConfig`) so the client never branches on venue.
- `packages/pools-client/src/picker.test.ts` — ponytail self-check covering
  direction resolution, swap-to-stable implied direction, the uniform
  onSelect arg order, formatting, and the star clamp.
- `src/react.ts` — re-exports the picker so `/react` is the single React
  entry (hooks + picker); main `.` entry stays UI-free.
- `package.json` — `test` script runs the new `picker.test.ts`.

**Verified:** `pnpm run lint` clean, `pnpm run build` (tsc) green, all three
self-checks pass (client + hook + picker).

**Deferred (sibling/out-of-scope):** the Mill-side rewire (drop the
`if(lane==='raydium')` branch + two cloned components + pool-direction
duplication) is bean tributary-yk1m (blocked by this bean).
