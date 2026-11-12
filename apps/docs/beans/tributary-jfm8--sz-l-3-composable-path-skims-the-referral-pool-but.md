---
# tributary-jfm8
title: 'SZ-L-3: composable path skims the referral pool but never distributes it — pool swept to recipient'
status: todo
type: bug
priority: low
created_at: 2026-11-12T12:15:47Z
updated_at: 2026-11-12T12:15:47Z
---

Slot Zero 2026-11-08 §T5b (ID SZ-L-3, programs/tributary/security-checklist.md).

MECHANISM (verified at 4b0a32e9): skim_input_fees computes the full FeeBreakdown including referral_pool (carved out of gateway_residual) exactly like execute_payment, but process_referral_rewards is only called from execute_payment and transfer — never from execute_composable. The undistributed pool stays in intermediate_input after the skim and is swept to the recipient with the face (repro at 1000 bps allocation on a 10 USDC face: recipient +10.02, gateway +0.178, protocol +0.002). Dormant until a gateway enables referral — same enablement gate as SZ-M-3.

FIX: either distribute the pool on the composable path (input-side referral rewards before the forward) or stop carving it there (allocate the would-be pool to the gateway residual until composable referral distribution exists).

ACCEPTANCE: with referral enabled, composable execution leaves no undistributed pool in intermediate_input; recipient receives exactly face; referral chain (or gateway residual) receives the pool.

Program change ⇒ update tributary.qedspec and regenerate formal_verification per AGENTS.md.
