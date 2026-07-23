---
# tributary-ojqx
title: 'Write design doc: ORE TopUp instruction + forward constraint'
status: todo
type: task
priority: normal
created_at: 2026-07-23T08:04:11Z
updated_at: 2026-07-23T08:17:55Z
parent: tributary-mtxx
blocked_by:
    - tributary-hqaf
---

See milestone tributary-ew9s HANDOFF §2, §4, §7. Decide and record: exact TopUp account order; automation_wsol lifecycle (pre-created ATA vs create/close inside TopUp) and the rent flow; final discriminator (26 proposed — check deployed fork history); whether TopUp also tops up miner.checkpoint_fee (recommend yes, mirrors automate.rs:103-105); go/no-go on the primary Act-mode design vs the HANDOFF §7 fallback. Output: docs/ design note or ADR in this repo, referenced by E2/E3/E4 tasks.

Prior art to read first: apps/docs .../examples/native-sol-topup.md (act-mode topup, the exact shape of this forward) and examples/auto-topup-guard.md (Lighthouse guard wiring); Raydium CPMM forward beans (tributary-b3jg, tributary-teqe) as the latest forward-onboarding template. Note MAX_PINNED_FORWARD_ACCOUNTS = 2 (tributary-jsna) — the automation pin must fit.
