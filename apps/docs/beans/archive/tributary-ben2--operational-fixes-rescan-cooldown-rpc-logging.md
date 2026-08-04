---
# tributary-ben2
title: Operational fixes — rescan, cooldown, RPC, logging
status: completed
type: epic
priority: critical
created_at: 2026-07-21T09:21:50Z
updated_at: 2026-07-22T11:03:52Z
parent: tributary-y0g1
---

Implementation epic for the 7 operational fixes (investigation items 1-6, 8). One task per fix; each is small (single file, single commit). Sequenced so #2 (stderr capture) lands first to unblock debugging the rest, then #1 (rescan dedupe) which is the runaway-RPC root cause, then the remaining smaller fixes.

Out of scope: fix #7 (on-chain failure root-cause for the 19 perpetually failing PaymentPolicies) - deferred, needs #2 landed first. Winston refactor - tracked as standalone task outside this milestone.
