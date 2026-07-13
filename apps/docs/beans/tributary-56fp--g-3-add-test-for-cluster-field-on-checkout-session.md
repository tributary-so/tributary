---
# tributary-56fp
title: 'G-3: Add test for Cluster field on checkout sessions'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:11Z
updated_at: 2026-07-06T16:47:25Z
parent: tributary-fzak
---

No test coverage for Cluster field handling on checkout sessions.

## Summary of Changes
Added 20 new Cluster-field tests to packages/payments/src/__tests__/session.roundtrip.test.ts. Cover round-trip survival for all 3 clusters (mainnet/devnet/testnet) across all 6 variants (subscription/payment/milestone/payAsYouGo/oneTime/upTo), plus the legacy-link fallback (cluster field absent) and invalid-cluster fallback (cluster=localnet → mainnet). All 28 tests pass.
