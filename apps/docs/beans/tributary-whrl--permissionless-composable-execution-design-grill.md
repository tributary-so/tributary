---
# tributary-whrl
title: Permissionless composable execution — design grill
status: completed
type: task
priority: high
created_at: 2026-06-27T12:41:01Z
updated_at: 2026-06-27T14:35:19Z
---

Investigate whether/how execute_composable can be made permissionlessly callable (any keeper) without exposing the user to damage from a malicious caller. Produces threat model + constraint set + recommendation. Likely becomes an ADR.

## Summary of Changes

Grill resolved the architectural question: **Path B (parameter-constrained relayers)** over Path A (keeper registry). Decisions captured in ADR-0016 (`apps/docs/adr/0016-permissionless-composable-execution.md`):

- Threat-model floor = hard loss (a) + validation gaming (d). MEV-within-floor (b) and griefing (c) accepted.
- Three shields close hard loss: allowlist + discriminator pin + **mandatory non-zero `min_output_amount`** (the route/program-agnostic core — atomic revert, not refund).
- Allowlist-growth vetting rule: a program is admissible only if its output is fully verifiable via the `intermediate_output` balance delta under a mandatory floor.
- Validation account pubkeys MUST be positionally pinned (closes (d)); forward account pubkeys OPTIONALLY pinnable (MEV reduction, reserved).
- Pinning primitive = ALT-format `[Pubkey; N]` in a Tributary-owned PDA (NOT a real ALT account — wrong owner model); `Pubkey::default()` = wildcard; sentinel-disabled, lazy-created. Validation pins extend ValidationPda/ValidationConfig; forward pins live in a new optional `ForwardAccountsPda` with a sentinel field reserved in `ForwardConfig` now to avoid migration later.
- Permissionless mode is opt-in per policy (preserves ADR-0014 gateway-operated scheduler as a valid keeper; no migration of existing policies).
- AGENTS.md ADR map patched (0014/0015/0016 added; 0014/0015 were pre-existing drift).

Implementation deferred per user request (\u201cno need to implement now\u201d). Follow-up bean should be filed when implementation begins.

## Amendment (post-completion refinements)

Two decisions evolved after this summary was written; ADR-0016 is authoritative:

1. **Permissionless mode is opt-in per GATEWAY** (a new bit `0x08` in `PaymentGateway.feature_flags`), NOT per-policy. The `min_output_amount` precondition is enforced cross-account at `execute_composable` on the cold-relayer path (caller-conditional: trusted three always pass).

2. **(d) validation gaming is now CLOSED.** Validation target accounts are pinned at creation in `ValidationPda`, which is promoted from a hand-parsed byte blob to a typed `Account<'info, ValidationPda>` with fields `bump / num_pinned_accounts / pinned_accounts: [Pubkey; 2] / data_len / data: [u8;1024]`. `num_validation_accounts` is dropped from `ValidationConfig` (pre-launch, no migration); arity lives in `num_pinned_accounts`. This is structural (always-on), not a permissionless-mode gate. The forward-account lookup table (optional, separate `ForwardAccountsPda`) remains a distinct, optional (b)-mitigation knob.
