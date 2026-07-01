#![cfg(kani)]
// Hand-rolled Kani harnesses testing the REAL Tributary pure functions.
// No spec model — these call shared/fees.rs and shared/schedule.rs directly.
// If someone changes the real implementation, these proofs break.
//
// Run:  cd programs/tributary && cargo kani --tests
//       cargo kani --tests --harness <name>

use tributary::shared::fees::calculate_fees;
use tributary::shared::schedule::{advance_policy, validate_policy_execution, MilestoneSigners};
use tributary::state::PolicyType;

// ============================================================================
// calculate_fees — unified fee model (ADR-0018)
// Target: programs/tributary/src/shared/fees.rs:30
// ============================================================================

#[kani::proof]
#[kani::solver(cadical)]
fn verify_calculate_fees_conservation() {
    let amount: u64 = kani::any();
    let fee_bps: u16 = kani::any();
    let proto_bps: u16 = kani::any();
    let sched_bps: u16 = kani::any();
    let referral_bps: u16 = kani::any();
    let is_referral: bool = kani::any();
    let is_net: bool = kani::any();

    kani::assume(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

    if let Ok(fb) = calculate_fees(
        amount,
        fee_bps,
        proto_bps,
        sched_bps,
        referral_bps,
        is_referral,
        is_net,
    ) {
        let sum = fb.protocol_cut as u128
            + fb.scheduler_cut as u128
            + fb.referral_pool as u128
            + fb.gateway_residual as u128;
        assert!(
            sum == fb.total_fee as u128,
            "fee_conservation: carve-outs must sum to total_fee"
        );
    }
}

#[kani::proof]
#[kani::solver(cadical)]
fn verify_calculate_fees_residual_nonnegative() {
    let amount: u64 = kani::any();
    let fee_bps: u16 = kani::any();
    let proto_bps: u16 = kani::any();
    let sched_bps: u16 = kani::any();
    let referral_bps: u16 = kani::any();
    let is_referral: bool = kani::any();
    let is_net: bool = kani::any();

    kani::assume(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

    if let Ok(fb) = calculate_fees(
        amount,
        fee_bps,
        proto_bps,
        sched_bps,
        referral_bps,
        is_referral,
        is_net,
    ) {
        assert!(
            fb.gateway_residual <= fb.total_fee,
            "residual_nonnegative: gateway_residual <= total_fee"
        );
    }
}

#[kani::proof]
#[kani::solver(cadical)]
fn verify_calculate_fees_bps_decomposition() {
    let amount: u64 = kani::any();
    let fee_bps: u16 = kani::any();
    let proto_bps: u16 = kani::any();
    let sched_bps: u16 = kani::any();
    let referral_bps: u16 = kani::any();
    let is_referral: bool = kani::any();
    let is_net: bool = kani::any();

    kani::assume(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

    if let Ok(fb) = calculate_fees(
        amount,
        fee_bps,
        proto_bps,
        sched_bps,
        referral_bps,
        is_referral,
        is_net,
    ) {
        let expected = (amount as u128 * fee_bps as u128) / 10000;
        assert!(
            fb.total_fee as u128 == expected,
            "bps_decomposition: total_fee == amount * bps / 10000"
        );
    }
}

#[kani::proof]
#[kani::solver(cadical)]
fn verify_calculate_fees_recipient_gross() {
    let amount: u64 = kani::any();
    let fee_bps: u16 = kani::any();
    let proto_bps: u16 = kani::any();
    let sched_bps: u16 = kani::any();
    let referral_bps: u16 = kani::any();

    kani::assume(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

    if let Ok(fb) = calculate_fees(
        amount,
        fee_bps,
        proto_bps,
        sched_bps,
        referral_bps,
        true,
        false,
    ) {
        assert!(
            fb.recipient_amount as u128 + fb.total_fee as u128 == amount as u128,
            "gross: recipient_amount + total_fee == payment_amount"
        );
        assert!(
            fb.total_from_user == amount,
            "gross: total_from_user == payment_amount"
        );
    }
}

#[kani::proof]
#[kani::solver(cadical)]
fn verify_calculate_fees_recipient_net() {
    let amount: u64 = kani::any();
    let fee_bps: u16 = kani::any();
    let proto_bps: u16 = kani::any();
    let sched_bps: u16 = kani::any();
    let referral_bps: u16 = kani::any();

    kani::assume(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

    if let Ok(fb) = calculate_fees(
        amount,
        fee_bps,
        proto_bps,
        sched_bps,
        referral_bps,
        true,
        true,
    ) {
        assert!(
            fb.recipient_amount == amount,
            "net: recipient_amount == payment_amount"
        );
        assert!(
            fb.total_from_user as u128 == amount as u128 + fb.total_fee as u128,
            "net: total_from_user == payment_amount + total_fee"
        );
    }
}

#[kani::proof]
fn verify_calculate_fees_max_input_no_panic() {
    let result = calculate_fees(u64::MAX, u16::MAX, 10000, 10000, 10000, true, true);
    kani::cover!(
        result.is_ok() || result.is_err(),
        "handles u64::MAX without panic"
    );
}

// ============================================================================
// validate_policy_execution — PAYG chunk bounds + drain resistance
// Target: programs/tributary/src/shared/schedule.rs:288
// ============================================================================

#[kani::proof]
fn verify_payg_rejects_zero_chunk() {
    let max_chunk: u64 = kani::any();
    kani::assume(max_chunk > 0);
    let pt = PolicyType::PayAsYouGo {
        max_amount_per_period: kani::any(),
        max_chunk_amount: max_chunk,
        period_length_seconds: kani::any(),
        current_period_start: kani::any(),
        current_period_total: kani::any(),
        padding: [0u8; 88],
    };
    let now: i64 = kani::any();
    let result = validate_policy_execution(&pt, now, Some(0), &MilestoneSigners::none());
    assert!(result.is_err(), "PAYG must reject Some(0) chunk");
}

#[kani::proof]
fn verify_payg_rejects_oversize_chunk() {
    let max_chunk: u64 = kani::any();
    kani::assume(max_chunk < u64::MAX);
    let oversize: u64 = kani::any();
    kani::assume(oversize > max_chunk);

    let pt = PolicyType::PayAsYouGo {
        max_amount_per_period: kani::any(),
        max_chunk_amount: max_chunk,
        period_length_seconds: kani::any(),
        current_period_start: kani::any(),
        current_period_total: kani::any(),
        padding: [0u8; 88],
    };
    let now: i64 = kani::any();
    let result = validate_policy_execution(&pt, now, Some(oversize), &MilestoneSigners::none());
    assert!(result.is_err(), "PAYG must reject chunk > max_chunk_amount");
}

#[kani::proof]
fn verify_payg_pull_bounded() {
    let max_per_period: u64 = kani::any();
    let max_chunk: u64 = kani::any();
    let period_secs: u64 = kani::any();
    let period_start: i64 = kani::any();
    let period_total: u64 = kani::any();

    kani::assume(max_chunk > 0);
    kani::assume(max_per_period >= max_chunk);
    kani::assume(period_secs > 0);
    // Bound to realistic ranges to avoid i64 overflow in the real code's
    // guard: current_period_start + period_length_seconds as i64.
    // schedule.rs:359 — this is a known code issue (should use saturating_add).
    kani::assume(period_secs > 0 && period_secs <= 1_000_000_000_000);
    kani::assume(period_start >= 0 && period_start <= 1_000_000_000_000);
    kani::assume(period_total <= max_per_period);

    let pt = PolicyType::PayAsYouGo {
        max_amount_per_period: max_per_period,
        max_chunk_amount: max_chunk,
        period_length_seconds: period_secs,
        current_period_start: period_start,
        current_period_total: period_total,
        padding: [0u8; 88],
    };
    let chunk: u64 = kani::any();
    kani::assume(chunk > 0);
    kani::assume(chunk <= max_chunk);
    let now: i64 = kani::any();

    if let Ok(returned) =
        validate_policy_execution(&pt, now, Some(chunk), &MilestoneSigners::none())
    {
        assert!(
            returned <= max_chunk,
            "pull_bounded: returned <= max_chunk_amount"
        );
        assert!(returned == chunk, "PAYG returns the chunk unchanged");
    }
}

#[kani::proof]
fn verify_payg_rejects_period_breach() {
    let max_per_period: u64 = kani::any();
    let max_chunk: u64 = kani::any();
    let period_secs: u64 = kani::any();
    let period_start: i64 = kani::any();
    let period_total: u64 = kani::any();

    kani::assume(max_chunk > 0);
    kani::assume(max_per_period > 0);
    kani::assume(period_secs > 0 && period_secs <= 1_000_000_000_000);
    kani::assume(period_start >= 0 && period_start <= 1_000_000_000_000);

    let now: i64 = kani::any();
    kani::assume(now < period_start + period_secs as i64);

    let chunk: u64 = kani::any();
    kani::assume(chunk > 0);
    kani::assume(chunk <= max_chunk);
    kani::assume(period_total.saturating_add(chunk) > max_per_period);

    let pt = PolicyType::PayAsYouGo {
        max_amount_per_period: max_per_period,
        max_chunk_amount: max_chunk,
        period_length_seconds: period_secs,
        current_period_start: period_start,
        current_period_total: period_total,
        padding: [0u8; 88],
    };
    let result = validate_policy_execution(&pt, now, Some(chunk), &MilestoneSigners::none());
    assert!(
        result.is_err(),
        "PAYG must reject chunk that breaches period cap"
    );
}

// ============================================================================
// advance_policy — PAYG period reset/accumulate preserves the cap (A2)
// Target: programs/tributary/src/shared/schedule.rs:424
// ============================================================================

#[kani::proof]
fn verify_payg_advance_preserves_cap() {
    let max_per_period: u64 = kani::any();
    let max_chunk: u64 = kani::any();
    let period_secs: u64 = kani::any();
    let period_start: i64 = kani::any();
    let period_total: u64 = kani::any();

    kani::assume(max_per_period > 0);
    kani::assume(max_chunk > 0);
    kani::assume(max_chunk <= max_per_period);
    kani::assume(period_secs > 0 && period_secs <= 1_000_000_000_000);
    kani::assume(period_start >= 0 && period_start <= 1_000_000_000_000);
    kani::assume(period_total <= max_per_period);

    let mut pt = PolicyType::PayAsYouGo {
        max_amount_per_period: max_per_period,
        max_chunk_amount: max_chunk,
        period_length_seconds: period_secs,
        current_period_start: period_start,
        current_period_total: period_total,
        padding: [0u8; 88],
    };

    let now: i64 = kani::any();
    let amount: u64 = kani::any();
    kani::assume(amount <= max_chunk);

    if now >= period_start + period_secs as i64 {
        // Period reset.
        if let Ok(should_complete) = advance_policy(&mut pt, now, amount) {
            assert!(!should_complete, "PAYG never auto-completes");
            match &pt {
                PolicyType::PayAsYouGo {
                    current_period_total,
                    max_amount_per_period,
                    ..
                } => {
                    assert!(
                        *current_period_total <= *max_amount_per_period,
                        "A2 reset: period_total <= max_amount_per_period"
                    );
                }
                _ => panic!("expected PayAsYouGo"),
            }
        }
    } else {
        // Same period — validate already checked the accumulation stays in cap.
        kani::assume(period_total.saturating_add(amount) <= max_per_period);
        if let Ok(should_complete) = advance_policy(&mut pt, now, amount) {
            assert!(!should_complete, "PAYG never auto-completes");
            match &pt {
                PolicyType::PayAsYouGo {
                    current_period_total,
                    max_amount_per_period,
                    ..
                } => {
                    assert!(
                        *current_period_total <= *max_amount_per_period,
                        "A2 accumulate: period_total <= max_amount_per_period"
                    );
                }
                _ => panic!("expected PayAsYouGo"),
            }
        }
    }
}

#[kani::proof]
fn verify_onetime_advance_completes() {
    let mut pt = PolicyType::OneTime {
        amount: kani::any(),
        due_date: kani::any(),
        expiry_date: kani::any(),
        padding: [0u8; 103],
    };
    let now: i64 = kani::any();
    let amount: u64 = kani::any();
    if let Ok(should_complete) = advance_policy(&mut pt, now, amount) {
        assert!(should_complete, "OneTime must always complete");
    }
}

#[kani::proof]
fn verify_upto_advance_completes() {
    let mut pt = PolicyType::UpTo {
        max_amount: kani::any(),
        valid_after: kani::any(),
        deadline: kani::any(),
        padding: [0u8; 104],
    };
    let now: i64 = kani::any();
    let amount: u64 = kani::any();
    if let Ok(should_complete) = advance_policy(&mut pt, now, amount) {
        assert!(should_complete, "UpTo must always complete");
    }
}
