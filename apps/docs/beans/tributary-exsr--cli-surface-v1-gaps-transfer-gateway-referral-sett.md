---
# tributary-exsr
title: 'CLI: surface v1 gaps — transfer, gateway referral-settings, protocol-fee'
status: todo
type: task
priority: normal
created_at: 2026-06-29T07:51:25Z
updated_at: 2026-06-29T07:51:25Z
parent: tributary-hy8a
blocked_by:
    - tributary-p6n3
---

Parent: `tributary-hy8a` — CLI v2 epic
Track: B (surface contract) · Blocked-by: `cli-cleanup`

## Requirement

Wire the v1 instructions that exist in contract + SDK but have no CLI surface:
`transfer`, `update_gateway_referral_settings`, `update_gateway_protocol_fee`.
Also surface the new open-relay feature flag and document the one admin knob
that **cannot** be surfaced (emergency pause has no on-chain setter).

`user delete` is split out into its own child (`cli-user-delete`) because it is
blocked on an SDK gap; this child holds only unblocked wiring.

## Spec

- **`payment transfer`** (or `transfer`) — wraps `sdk.transfer`
  (`packages/sdk/src/sdk.ts:2771`). Single SPL transfer + memo + protocol/gateway
  fee split + referral rewards, permissionless execution semantics.
- **`gateway referral-settings`** — wraps `sdk.updateGatewayReferralSettings`
  (`sdk.ts:277`). Gateway-authority signer.
- **`gateway protocol-fee`** — wraps `sdk.updateGatewayProtocolFee`
  (`sdk.ts:1889`). Protocol-admin signer. Only effective when the gateway has
  `FEATURE_CUSTOM_PROTOCOL_FEE` (0x04).
- **`gateway feature-flags`** — already wired (`gateway/feature-flags.ts`); this
  child only ensures help text documents the new **0x08 open-relay bit** and the
  existing 0x01/0x02/0x04 bits. Use `sdk.enableGatewayFeature` /
  `disableGatewayFeature` / `updateGatewayFeatureFlags`.
- **`config show`** (read-only) — surface `ProgramConfig` including the
  `emergency_pause` flag status. This is the replacement for the deleted
  `program config` (killed in cleanup): read-only, no setter command because
  none exists on-chain.

### Decisions cited (not re-decided)

- **ADR-0004** — `transfer` is the standalone fee+referral-integrated transfer;
  it must NOT bypass the protocol/gateway fee split (so do not wire a bare
  `spl-token transfer` here — use `sdk.transfer`).
- **ADR-0006** — per-gateway fee model; `update_gateway_protocol_fee` is the
  protocol-admin fee setter, re-runs the combined-bps<10000 check; gateway admin
  ops are single-sig, no timelock (operational responsibility, not a CLI
  concern). Feature flags are a `u8` bit-field (0x01/0x02/0x04, +0x08).
- **ADR-0005 / ADR-0011** — referral system is gateway-scoped and re-validated
  - payer-bound at execution; `referral-settings` just configures it.
- **Emergency pause:** verified — every instruction _reads_
  `config.emergency_pause` as a guard, and `initialize` sets it `false`; there is
  **no setter instruction** in `programs/tributary/src`. Therefore `set
emergency-pause` is **unsurfaceable** and is deferred to a separate contract
  bean (not this epic). `config show` exposes the flag read-only.

## Acceptance Criteria

- [ ] `payment transfer <amount> <dest>` moves tokens and routes fees via
      `sdk.transfer` (not a raw spl transfer).
- [ ] `gateway referral-settings ...` and `gateway protocol-fee ...` invoke the
      correct SDK methods with the correct signer context.
- [ ] `gateway feature-flags --help` documents bits 0x01/0x02/0x04/0x08.
- [ ] `config show` prints `emergency_pause` status (read-only); no
      `set-emergency-pause` command exists.
- [ ] All four commands resolve the right signer (owner / gateway-authority /
      protocol-admin) from the existing keypair flag.

## Test Plan

- Port the `transfer` flow from `tests/tributary.test.ts` as a CLI smoke test.
- Port a `create_payment_gateway` + `update_gateway_referral_settings` +
  `update_gateway_protocol_fee` sequence against Surfpool; assert on-chain state
  changes.
- Negative: `gateway protocol-fee` without admin signer fails with the program's
  authority error.
- Lint + build clean.

## Workflow

routing: implementer · signer model per ADR-0006.
