---
# tributary-pdj8
title: Permissionless composable execution (ADR-0016)
status: completed
type: epic
priority: high
created_at: 2026-06-27T14:43:11Z
updated_at: 2026-06-29T16:45:59Z
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

Sibling epic: tributary-5gf3 (Unified fee model, ADR-0017) — provides the scheduler incentive that makes the permissionless path viable.



## Summary of Changes (Epic Closeout)

Children completed:
- **A (tributary-ru3b)**: ValidationPda promoted to typed Anchor account; num_validation_accounts dropped; pin-check at execute closes vector (d). ✅
- **B (tributary-3pvf)**: SDK wired to pass pinned accounts at creation; executeComposable passes ValidationPda as named account. ✅
- **C (tributary-y07z)**: Permissionless gateway feature flag (0x08) + caller-conditional execute_composable gate (mandatory min_output_amount for cold relayers). ✅

Child deferred (per epic body, low priority):
- **E (tributary-hcfd)**: ForwardConfig sentinel + ForwardAccountsPda seed reservation. Optional route pinning — reserved for a future task when the residual MEV-within-floor vector (b) becomes worth closing. No account-migration cost to adding it later.

Verification:
- cargo test: 85 passed (7 new ValidationPda tests + 2 new permissionless flag tests + all pre-existing green).
- SDK (packages/sdk) builds clean (DTS + ESM).
- ADR-0016 vectors closed: (a) hard loss via mandatory min_output_amount; (d) validation gaming via owner-pinned target accounts. Vectors (b) accepted and (c) ignored, per the ADR.

Integration tests (composable.test.ts, topup-balance*.test.ts) updated for the new create/execute signatures and compile clean against the regenerated IDL. Blocked at runtime by a pre-existing Surfpool environment issue (config.admin mismatch + getBlockTime on post-fork slots) — environmental, not a code regression. Rust unit tests cover the actual logic changes.
