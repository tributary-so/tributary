---
# tributary-1355
title: Gateway permissionless flag (0x08) one-way lock — reject clearing once set
status: todo
type: task
priority: normal
created_at: 2026-07-02T08:01:05Z
updated_at: 2026-07-02T11:43:58Z
parent: tributary-cjhh
---

Gateway permissionless flag (`feature_flags` bit `0x08`) must be ONE-WAY: once
set ON, `update_gateway_feature_flags` MUST reject clearing it.

## Rationale (per grilling Q1 decision 2)

The cold-relayer OR-gate (child 1) only runs for permissionless gateways. A
policy may be created relying on route pinning as its sole safety net
(`min_output=None` + `forward_accounts_pda` set). If the operator could toggle
permissionless off, the scheduler ecosystem built on top loses execution
capability for those policies — a liveness/commitment break for any third-party
scheduler that integrated the gateway.

**Open question (confirm during grilling/impl):** is this purely a
commitments/liveness invariant (schedulers need a stable expectation), or is
there a funds-safety angle? Initial analysis says liveness only — trusted-three
execution is unaffected by the flag, so no funds are at risk from toggling.

## Implementation

In the handler for `update_gateway_feature_flags`: if the incoming flags have
bit `0x08` CLEAR but the stored flags have it SET -> reject with a new error
(`GatewayPermissionlessFlagImmutable` / similar). Setting the bit is allowed;
clearing once set is not.

Independently shippable from children 1 and 2 — the invariant applies to the
existing permissionless feature regardless of route pinning.

## Acceptance

- [ ] `update_gateway_feature_flags` accepts setting `0x08`.
- [ ] `update_gateway_feature_flags` REJECTS clearing `0x08` once set.
- [ ] Test: set -> clear attempt -> err; set -> set (idempotent) -> ok.
- [ ] Error variant + message names the one-way invariant.

## REVISED (2026-07-02 grilling Q4): read-only after CREATE, not one-way

Stronger than the original spec above. The permissionless bit is **frozen at gateway creation and never flips in either direction** — not merely "once ON, cannot unset."

### Implementation changes

1. **`create_payment_gateway`** gains an initial feature_flags value (new param). Today it zero-inits `feature_flags` and the operator flips 0x08 later — that later-flip path is removed. The creation-time value is validated against the accept-mask and stored.
2. **`update_gateway_feature_flags`**: move `FEATURE_PERMISSIONLESS` OUT of the freely-toggleable set (lines 40-43, 48-52) and INTO the protected/preserved set (alongside `FEATURE_CUSTOM_PROTOCOL_FEE`). The bit is carried across every write unchanged.
3. **Update the comment at lines 31-37** — it currently calls permissionless "freely-toggleable"; that is now false.

### Acceptance (replaces original)

- [ ] `create_payment_gateway` accepts an initial feature_flags value and stores it.
- [ ] `update_gateway_feature_flags` preserves `FEATURE_PERMISSIONLESS` across writes (never writable post-create).
- [ ] Test: create with 0x08 SET -> update attempting to clear -> bit unchanged (no err, bit sticky). Create with 0x08 CLEAR -> update attempting to set -> bit unchanged.
- [ ] Test: other bits (REFERRAL, NET_AMOUNT) still toggle freely.
- [ ] Lines 31-37 comment corrected.
- [ ] Error/message: setting 0x08 via update is silently ignored (preserved), OR rejected — pick the clearer UX (recommend: silently preserved, matching CUSTOM_PROTOCOL_FEE precedent).
