---
# tributary-2st5
title: Update constants.rs ALLOWED_FORWARD_PROGRAMS + allowlist tests
status: todo
type: task
priority: high
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T11:42:04Z
parent: tributary-teqe
---

Add pubkey!("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C") to ALLOWED_FORWARD_PROGRAMS in programs/tributary/src/constants.rs. Audit existing tests that index ALLOWED_FORWARD_PROGRAMS[0] (create_composable_policy.rs:622-690, state/composable_policy.rs:464, proptest_pure_fns.rs:403,502) — add a [1] variant or make them array-length-agnostic. TDD: write a failing test that creates a composable policy with the CPMM program id first.
