---
# tributary-n37g
title: Verify swap/topup/composable jest suites pass with 2 forward pins
status: todo
type: task
priority: normal
created_at: 2026-07-12T19:12:53Z
updated_at: 2026-07-12T19:13:24Z
parent: tributary-mmmi
blocked_by:
    - tributary-jsna
    - tributary-uizu
---

Parent tributary-mmmi. The integration suites construct InstructionConstraint fixtures with pinned_accounts arrays (currently padded to 4). After the const drops to 2, every fixture must still construct valid configs AND the DLMM swap suite must still execute a real swap CPI against Surfpool.

## Touch points (all in tests/)
- `topup-balance-swap.test.ts:447` — swap forward config pinned_accounts (the critical one — real DLMM CPI).
- `topup-balance.test.ts:396`, `topup-balance-sol.test.ts:425` — no-swap forward configs.
- `composable.test.ts:74,1145` + `defaultForwardConfig` helper — many call sites.
- `composable-fee-rebase.test.ts:316`, `one-time-payment.test.ts:492` — composable fixtures.
- `sdk-composable-constructor.test.ts:61` — SDK constructor forward config.

## Acceptance criteria
- [ ] Start Surfpool: `surfpool start --legacy-anchor-compatibility --no-tui`.
- [ ] `cd tests && npx jest` — all suites green.
- [ ] Specifically `topup-balance-swap.test.ts` passes (real DLMM swap with 2 pins — this is the proof that blocker tributary-ahfg's verdict was FEASIBLE).
- [ ] If any suite breaks because a config supplies >2 real pins, that contradicts the blocker verdict — stop and escalate.
- [ ] No suite builds a Lighthouse assertion >512B (validation-data reduction); typical assertions are <200B so this should be a no-op check.
