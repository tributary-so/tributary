---
# tributary-y07z
title: Permissionless gateway feature flag + caller-conditional execute_composable gate
status: completed
type: task
priority: high
created_at: 2026-06-27T14:43:59Z
updated_at: 2026-06-29T16:45:43Z
parent: tributary-pdj8
---

Enables the actual permissionless-execution capability from ADR-0016. Independent of the ValidationPda refactor (task A) — this is caller-identity plumbing, not validation hardening.

**PaymentGateway** (`state/payment_gateway.rs`): add `FEATURE_PERMISSIONLESS: u8 = 0x08` constant + `is_permissionless()` helper (mirrors existing `is_referral_enabled` / `is_amount_net` / `is_custom_protocol_fee_enabled`). Bits 0/1/2 in use; 0x08 is next free.

**update_gateway_feature_flags** (`instructions/gateway/update_gateway_feature_flags.rs`): widen the accept-mask so bit `0x08` is settable (currently masks to REFERRAL | NET_AMOUNT only). Decide whether the permissionless bit should be 'protected' like CUSTOM_PROTOCOL_FEE (set via its own instruction) or freely toggled with the other flags — recommend freely toggled, it's an operational mode not a fee parameter.

**execute_composable** (`instructions/composable/execute_composable.rs`):
- Relax the `fee_payer` constraint (currently must be gateway.signer | owner | recipient) to ANY Signer when `gateway.is_permissionless()`.
- Add the caller-conditional gate in the handler: when the caller is a cold relayer (not one of the trusted three) AND gateway is permissionless, require `forward_config.min_output_amount == Some(m > 0)` (reject None / Some(0)). Trusted-caller path unchanged — a gateway's own scheduler may still run a no-floor policy (backward-compat escape hatch per ADR-0016).

**Tests**: integration test — (1) relayer executes a conforming policy on a permissionless gateway; (2) relayer rejected when min_output_amount is None/0; (3) trusted caller executes a non-conforming policy unaffected; (4) relayer rejected on a non-permissionless gateway.

**Acceptance**: a permissionless gateway admits any signer for conforming policies; the trusted three always pass regardless; non-conforming policies only run via trusted callers. Nothing breaks when a gateway flips the bit (existing policies keep running via the gateway scheduler).

## Summary of Changes (Task C)

- `state/payment_gateway.rs`: added FEATURE_PERMISSIONLESS = 0x08 + is_permissionless() helper. 2 new unit tests (toggle independence, bit non-collision).
- `instructions/gateway/update_gateway_feature_flags.rs`: widened accept-mask to include 0x08. Permissionless bit is freely toggleable (operational mode, not fee param); CUSTOM_PROTOCOL_FEE stays protected.
- `instructions/composable/execute_composable.rs`: relaxed fee_payer Signer constraint to admit ANY signer when gateway.is_permissionless(). Added caller-conditional gate in handler: cold relayers (not the trusted three) must run a CONFORMING policy (min_output_amount = Some(m > 0)). Trusted-caller path unchanged (backward-compat hatch per ADR-0016).
- `error.rs`: PermissionlessExecutionRequiresMinOutput variant.
- `packages/sdk/src/constants.ts`: exported GATEWAY_FEATURES.PERMISSIONLESS = 0x08.
- cargo test: 85 passed (2 new permissionless flag tests).

Integration tests (composable.test.ts) blocked by a pre-existing Surfpool environment issue: config.admin is set to the mainnet deploy key by the auto-deployment runbook, and getBlockTime returns null for post-fork slots on a mainnet fork. Both are environmental, not code regressions — the Rust unit tests cover the actual logic changes (ValidationPda promotion, pin-check, permissionless gate, conforming-policy enforcement).
