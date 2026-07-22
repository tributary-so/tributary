---
# tributary-mygq
title: 'Security: intermediate-output non-zero post_validation'
status: completed
type: epic
priority: normal
created_at: 2026-07-22T11:41:22Z
updated_at: 2026-07-22T12:46:17Z
parent: tributary-404h
---

Investigation: should Tributary enforce (or recommend as SDK default) a post_validation that asserts the intermediate output ATA has a non-zero balance after the forward CPI? Generalizes to ALL forward programs, not just Raydium. Candidate conclusion already on the table from prior discussions.

## Investigation scope

### The threat
A malicious or compromised gateway signer controls the forward CPI's `remaining_accounts` and (within the pinned constraint) the instruction data. For `deliver-transform` settlement (ADR-0026), Tributary sweeps the intermediate_output ATA to the recipient and guards with `> 0`. But:

1. Can the gateway route the forward CPI such that the intermediate_output ATA receives **less than expected** (e.g. a swap that returns dust) while still passing the on-chain `> 0` guard? The `> 0` guard is an existence assertion, not a magnitude assertion.
2. Can the gateway point the forward at a **different output mint** than the policy declares? The `output_mint` pin in `InstructionConstraint` should prevent this — verify it actually does for CPMM (where output mint is account index 10, not pinned by default).
3. For `act mode` (ADR-0026) there is **no `> 0` guard at all** — is a post_validation the only backstop there?

### Candidate solution (from prior discussion)
A `post_validation` Lighthouse assertion on the intermediate_output ATA: `amount > 0` (or `amount >= owner_floor`). This is owner-controlled insurance against a gateway that executes a degenerate/empty forward.

### Questions to resolve
1. Is `amount > 0` sufficient, or do we need `amount >= some owner-set floor`? (The owner floor already exists conceptually as `min_output_amount` was removed in v2.1 — `post_validation` generalizes it.)
2. Should this be **enforced on-chain** (reject create_composable_policy without it for deliver-transform) or **SDK-default** (warn/require at builder time)? Enforcing reduces flexibility; SDK-default relies on integrators reading docs.
3. Does the existing `> 0` guard in `process_output_and_sweep` make the post_validation redundant for deliver-transform? (If yes, the gap is act-mode only.)
4. Cost: one extra Lighthouse CPI + one ValidationPda account per composable policy. Acceptable?

### Output
A recommendation (one of):
- (a) Enforce post_validation for deliver-transform + act mode on-chain.
- (b) SDK default + docs; on-chain stays optional.
- (c) No change — existing guards are sufficient; document why.
- (d) Scope-limited: only act mode needs it (deliver-transform covered by `> 0`).

If (a) or (b): create follow-up feature beans. If (c) or (d): close this epic with the rationale.

### Tags
security, composable, post_validation, forward, lighthouse
