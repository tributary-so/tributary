---
# tributary-znts
title: 'H-1: milestone release_condition signer bits 1-3 silently ignored'
status: completed
type: bug
priority: high
created_at: 2026-06-25T13:28:14Z
updated_at: 2026-06-25T20:02:20Z
parent: tributary-etbw
---

schedule.rs:262 only checks release_condition & 0b0001 (due-date). Bits 1 (gateway signer), 2 (owner signer), 3 (recipient signer) are documented as release conditions but never enforced in validate_policy_execution. Milestones configured for signer-based release fire on the date alone.

Impact: milestone payments configured for signer-gated release execute without the signer authorization. Gateway-only/owner-only/recipient-only release is bypassed.

Fix: in the Milestone arm of validate_policy_execution (shared/schedule.rs:249-269), check bits 1-3 against the relevant signers passed in via the caller. Bits 1-3 are documented as mutually exclusive; enforce exactly that.

Location: programs/tributary/src/shared/schedule.rs:262
Note: this is the shared schedule used by the composable path; confirm whether the PaymentPolicy (execute_payment) path also routes through here or has its own check.

## Summary of Changes

H-1 fixed: milestone `release_condition` signer bits 1-3 now enforced in the composable execution path.

**Root cause:** `shared::schedule::validate_policy_execution` (used only by `execute_composable`) only checked bit 0 (due-date). Bits 1-3 (gateway/owner/recipient signer) were silently ignored, so a Milestone composable policy with a signer-gated release would fire on the due date alone.

**Fix** (`programs/tributary/src/shared/schedule.rs`):
- Added `MilestoneSigners<'a>` struct (caller / gateway_signer / owner / recipient) plus `MilestoneSigners::none()` test helper.
- Extended `validate_policy_execution` signature with `&MilestoneSigners` and added the bit 1/2/3 checks in the Milestone arm, mirroring the legacy `MilestoneStrategy::validate_payment_timing` (policies/milestone.rs:86-96).

**Caller update** (`programs/tributary/src/instructions/composable/execute_composable.rs`):
- Builds `MilestoneSigners` from `fee_payer`, `gateway.signer`, `user_payment.owner`, `composable_policy.recipient` and passes it into `validate_policy_execution`.

**Legacy PaymentPolicy path** is unaffected — it routes through `policies/milestone.rs` which already enforced the bits. No regression.

**Tests added** (`shared/schedule.rs`, 6 new unit tests):
- `milestone_release_due_date_only_executes_when_due`
- `milestone_release_gateway_bit_requires_gateway_signer`
- `milestone_release_owner_bit_requires_owner`
- `milestone_release_recipient_bit_requires_recipient`
- `milestone_release_zero_condition_allows_anyone`
- `milestone_release_due_plus_gateway_bit_requires_both` (verifies bit-0 AND bit-1 combine)

Plus updated 2 existing subscription test callsites for the new signature.

**Verification:** `anchor test` → 70 cargo + 76 tributary + 17 composable = 163 tests, 0 failures.
