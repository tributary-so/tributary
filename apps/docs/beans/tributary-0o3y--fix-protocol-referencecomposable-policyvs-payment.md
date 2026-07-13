---
# tributary-0o3y
title: Fix protocol-reference/composable-policy/vs-payment-policy.md
status: draft
type: task
priority: high
created_at: 2026-07-13T11:11:13Z
updated_at: 2026-07-13T11:11:13Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/vs-payment-policy.md

**Known issues:** Comparison table likely omits fee path differences (input-side skim vs gross-based cut). Settlement flexibility (act/deliver-no-transform/deliver-transform) likely missing. The Dual-delegate model difference vs global delegate not documented. UserPayment PDA as counter tracker for both policy types not documented.

**Read first:** Read the file, then programs/tributary/src/state/user_payment.rs for the dual-counter field.

**Current code anchors:** programs/tributary/src/state/user_payment.rs, programs/tributary/src/state/payment_policy.rs, programs/tributary/src/state/composable.rs

**Per ADR:** ADR-0026 (fee path difference), ADR-0026 (settlement shapes), ADR-0001 (dual-delegate model)

**Acceptance:** Comparison is accurate. Fee difference documented. Settlement difference documented. Add ponytail: comment.
