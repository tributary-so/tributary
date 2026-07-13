---
# tributary-udx0
title: 'MIGRATION.md: dual-delegate migration note'
status: draft
type: task
priority: high
created_at: 2026-07-13T11:12:29Z
updated_at: 2026-07-13T11:12:29Z
parent: tributary-9825
---

**File:** `MIGRATION.md` at repo root (or wherever convention dictates)

**From checklist §D:** Migration note published. The dual-delegate model (vault `MIGRATION.md`): v1 teams keep the global delegate; new SDK defaults to per-user `UserPayment` PDA. No forced migration.

**Requirements:**

- Explain the dual-delegate model: legacy global `PaymentsDelegate` PDA vs per-user `UserPayment` PDA
- v1 PaymentPolicy teams: no action needed, global delegate still accepted for backward compat
- v2 ComposablePolicy teams: SDK defaults to UserPayment PDA
- No forced migration path — both work
- Link to existing-team migration notice (announcements/existing-team-migration-notice.md)
- Keep it short — this is a note, not a guide

**Current code anchors:** programs/tributary/src/state/user_payment.rs

**Per ADR:** ADR-0001 (delegate model)

**Acceptance:** v1 teams understand they're not affected. New teams understand which delegate model applies.
