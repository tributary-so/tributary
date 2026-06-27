---
# tributary-y07z
title: Permissionless gateway feature flag + caller-conditional execute_composable gate
status: todo
type: task
priority: high
created_at: 2026-06-27T14:43:59Z
updated_at: 2026-06-27T14:44:15Z
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
