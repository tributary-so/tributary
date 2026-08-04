---
# tributary-qeqc
title: Fix existing composable docs (code-drift repair)
status: completed
type: epic
priority: critical
created_at: 2026-07-13T11:08:36Z
updated_at: 2026-08-04T20:07:00Z
parent: tributary-6hl4
---

13+ docs in apps/docs/ have drifted from the current on-chain code. Each file needs a line-by-line audit against the actual SDK signatures, instruction accounts, flows, and constants (v2.2). Do NOT rewrite — surgically fix what's wrong. Priority order: integration-guide examples first (devs hit these first), then protocol-reference.

Additionally, you'll need to document the new receipts we have as part of
./packages/forward-builders

## Summary of Changes

All 13 child tasks resolved: 4 were already completed (sdk.md, native-sol-topup, swap-and-deliver, auto-topup-guard), 9 draft tasks verified + fixed (overview, validation-hook, forward-hook, native-output, security-model, vs-payment-policy, allowlists-and-sentinels, lighthouse-facade, api-reference). Punch-list of code-drift fixes applied across the cluster.
