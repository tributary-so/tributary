---
# tributary-pdj8
title: Permissionless composable execution (ADR-0016)
status: todo
type: epic
priority: high
created_at: 2026-06-27T14:43:11Z
updated_at: 2026-06-27T14:43:11Z
---

Implements ADR-0016 (`apps/docs/adr/0016-permissionless-composable-execution.md`): open `execute_composable` to any caller on a permissionless gateway, secured by parameter constraints (not a keeper registry).

Closes two damage vectors:
- (a) hard loss — mandatory `min_output_amount` on the cold-relayer path (atomic revert, route/program-agnostic).
- (d) validation gaming — validation target accounts pinned at creation in `ValidationPda`.

Accepts (b) MEV-within-floor (optionally mitigated by a reserved forward-account lookup table) and ignores (c) griefing.

Architecture: opt-in per GATEWAY (`PaymentGateway.feature_flags` bit `0x08`), caller-conditional gate at `execute_composable` (trusted three = gateway.signer/owner/recipient always pass; cold relayer requires conforming policy). Pre-launch — no backwards-compat / migration constraints.

Children:
- A: Promote ValidationPda to typed Anchor account; drop num_validation_accounts (closes d)
- B: Wire SDK lighthouse facade to pass pinned validation accounts at creation (blocked by A)
- C: Permissionless gateway feature flag + caller-conditional execute_composable gate
- E: Reserve ForwardConfig sentinel + ForwardAccountsPda seed (optional, deferred)

ADR-0016 is the authority on rationale. Tests folded into each child (TDD).
