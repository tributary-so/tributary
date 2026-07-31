---
# tributary-r6tq
title: Unit tests for pools-client (fetch mock, envelope parsing, hook)
status: completed
type: task
priority: normal
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-30T10:29:15Z
parent: tributary-30yg
blocked_by:
  - tributary-xnif
---

assigned: tester

Mock fetch; assert envelope parsing, searchPools query/venue/limit wiring, hook debounce + enabled gate.

## Summary of Changes

Added two `npx tsx` self-checks mirroring the tokens-client convention
(hand-rolled `assert` + mocked global `fetch`, no test framework):

- `packages/pools-client/src/client.test.ts` — envelope parsing (success flag,
  nested token_x/token_y identity, stars/tier1/tvl/extras, null-leg survival),
  `q`/`venue`/`limit` URL wiring, limit clamp [1,50], empty-query short-circuit
  (no fetch), HTTP-error → empty-not-500 (ADR-0028 D3), `success:false` → empty,
  venue wiring, trailing-slash strip.
- `packages/pools-client/src/react.test.ts` — renders `usePoolSearch` DOM-free
  via `react-test-renderer` + a real `QueryClient` (uses `React.createElement`,
  not JSX, so it stays a `.ts` file excluded from the dist build): enabled gate
  (`enabled:false` → 0 fetches), empty/whitespace gate (0 fetches), valid query
  fetches once with correct URL + results flow back, and debounce holds a query
  change off until the window elapses then fires.

- `package.json`: added `"test": "npx tsx src/client.test.ts && npx tsx
src/react.test.ts"` and `react-test-renderer` (devDep, `^19.2.3` matching the
  react peer).

Verified: lint clean, build green, tests pass (dist contains no test files).

Landed in this commit (unit tests for pools-client).
