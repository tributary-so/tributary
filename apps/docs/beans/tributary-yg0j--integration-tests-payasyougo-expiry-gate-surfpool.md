---
# tributary-yg0j
title: 'Integration tests: PayAsYouGo expiry gate (surfpool)'
status: todo
type: feature
priority: high
created_at: 2026-07-02T13:05:21Z
updated_at: 2026-07-02T13:07:39Z
parent: tributary-d5hj
blocked_by:
    - tributary-clo7
---

Integration-test the PayAsYouGo expiry end-to-end via Surfpool. Parent: testing epic.

## Acceptance criteria

- [ ] Create a PayAsYouGo policy with a near-future `expiryDate`; `executePayment` succeeds before, fails with `PolicyExpired` after warp-past-expiry.
- [ ] Create one with no expiry; executes indefinitely (regression guard).
- [ ] Composable (topup) PayAsYouGo policy inherits the gate — `executeComposable` fails past expiry.
- [ ] `cd tests && npx jest` clean (requires `surfpool start --legacy-anchor-compatibility --no-tui`).
