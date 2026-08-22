---
# tributary-mrvw
title: Security audit of programs/tributary (Aug 2026)
status: completed
type: task
priority: normal
created_at: 2026-08-21T23:14:20Z
updated_at: 2026-08-21T23:32:00Z
---

Full security review of the Tributary Anchor program (programs/tributary/) using auditor-skill checklists 01-07. Deliverable: report in ./reports.

## Summary of Changes

Full program-scope security audit of programs/tributary (commit 8a959671) completed using auditor-skill checklists 01-07 (517/517 items verdicted) + 52 known vectors.

Deliverable: reports/audit_1/REPORT.md

Key findings (Repo Risk Score 6 - MEDIUM):
- F-001 [6]: counter-derived policy PDAs permanently freezable via 1-lamport donation (KV-123)
- F-002 [6]: composable intermediate-ATA pre-creation bricks execute_composable (KV-127)
- F-003 [5]: UpTo x ComposablePolicy has no executable path
- F-004 [4]: create_composable_policy misses input_mint == user_payment.token_mint check
- F-005 [5]: no on-chain output floor on forward CPI beyond >0 (ADR-0031 documented posture)
- F-006 [4]: referral carve-out never distributed on composable path; tier revalidation gap
- F-007 [3]: one-step admin rotation without acceptance
- F-008/F-009 [2]: admin gateway-delete liveness kill; mainnet-feature-gated timestamp check

No Critical/High fund-loss paths found. cargo check clean.
