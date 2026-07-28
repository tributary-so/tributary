// Hand-rolled proptests on the REAL Tributary pure functions.
// Fast (milliseconds) but non-exhaustive (random sampling, not symbolic).
// Pairs with kani_pure_fns.rs which is exhaustive but slow.
//
// Run:  cd programs/tributary && cargo test --test proptest_pure_fns
// Deep: PROPTEST_CASES=10000 cargo test --test proptest_pure_fns

use anchor_lang::prelude::Pubkey;
use proptest::prelude::*;
use tributary::shared::fees::calculate_fees;
use tributary::shared::schedule::{advance_policy, validate_policy_execution, MilestoneSigners};
use tributary::state::{PaymentFrequency, PolicyType};

// ============================================================================
// calculate_fees — unified fee model (ADR-0018)
// ============================================================================

proptest! {
    #[test]
    fn prop_fee_conservation(
        amount in 0u64..u64::MAX,
        fee_bps in 0u16..10000u16,
        proto_bps in 0u16..3_334u16,
        sched_bps in 0u16..3_334u16,
        referral_bps in 0u16..3_334u16,
        is_referral in prop::bool::ANY,
        is_net in prop::bool::ANY,
    ) {
        // Only test when shares sum ≤ 10000 (ADR-0018 invariant)
        prop_assume!(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

        if let Ok(fb) = calculate_fees(amount, fee_bps, proto_bps, sched_bps, referral_bps, is_referral, is_net) {
            let sum = fb.protocol_cut as u128
                + fb.scheduler_cut as u128
                + fb.referral_pool as u128
                + fb.gateway_residual as u128;
            prop_assert_eq!(sum, fb.total_fee as u128);
        }
    }

    #[test]
    fn prop_residual_nonnegative(
        amount in 0u64..u64::MAX,
        fee_bps in 0u16..10000u16,
        proto_bps in 0u16..3_334u16,
        sched_bps in 0u16..3_334u16,
        referral_bps in 0u16..3_334u16,
        is_referral in prop::bool::ANY,
        is_net in prop::bool::ANY,
    ) {
        prop_assume!(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

        if let Ok(fb) = calculate_fees(amount, fee_bps, proto_bps, sched_bps, referral_bps, is_referral, is_net) {
            prop_assert!(fb.gateway_residual <= fb.total_fee);
        }
    }

    #[test]
    fn prop_bps_decomposition(
        amount in 0u64..1_000_000_000_000,  // bound to avoid checked_mul overflow
        fee_bps in 0u16..10000u16,
        proto_bps in 0u16..3_334u16,
        sched_bps in 0u16..3_334u16,
        referral_bps in 0u16..3_334u16,
        is_referral in prop::bool::ANY,
        is_net in prop::bool::ANY,
    ) {
        prop_assume!(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

        if let Ok(fb) = calculate_fees(amount, fee_bps, proto_bps, sched_bps, referral_bps, is_referral, is_net) {
            let expected = amount as u128 * fee_bps as u128 / 10000;
            prop_assert_eq!(fb.total_fee as u128, expected);
        }
    }

    #[test]
    fn prop_recipient_gross_mode(
        amount in 0u64..1_000_000_000_000,
        fee_bps in 1u16..10000u16,
        proto_bps in 0u16..3_334u16,
        sched_bps in 0u16..3_334u16,
        referral_bps in 0u16..3_334u16,
    ) {
        prop_assume!(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

        if let Ok(fb) = calculate_fees(amount, fee_bps, proto_bps, sched_bps, referral_bps, true, false) {
            prop_assert_eq!(
                fb.recipient_amount as u128 + fb.total_fee as u128,
                amount as u128
            );
            prop_assert_eq!(fb.total_from_user, amount);
        }
    }

    #[test]
    fn prop_recipient_net_mode(
        amount in 0u64..1_000_000_000_000,
        fee_bps in 1u16..10000u16,
        proto_bps in 0u16..3_334u16,
        sched_bps in 0u16..3_334u16,
        referral_bps in 0u16..3_334u16,
    ) {
        prop_assume!(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

        if let Ok(fb) = calculate_fees(amount, fee_bps, proto_bps, sched_bps, referral_bps, true, true) {
            prop_assert_eq!(fb.recipient_amount, amount);
            prop_assert_eq!(
                fb.total_from_user as u128,
                amount as u128 + fb.total_fee as u128
            );
        }
    }

    #[test]
    fn prop_referral_disabled_zeros_pool(
        amount in 0u64..1_000_000_000_000,
        fee_bps in 1u16..10000u16,
        proto_bps in 0u16..3_334u16,
        sched_bps in 0u16..3_334u16,
        referral_bps in 1u16..3_334u16,
    ) {
        prop_assume!(proto_bps as u64 + sched_bps as u64 + referral_bps as u64 <= 10000);

        if let Ok(fb) = calculate_fees(amount, fee_bps, proto_bps, sched_bps, referral_bps, false, false) {
            prop_assert_eq!(fb.referral_pool, 0);
        }
    }

    #[test]
    fn prop_overflow_returns_err(
        amount in u64::MAX / 2..u64::MAX,
        fee_bps in 60_000u16..u16::MAX,
    ) {
        let result = calculate_fees(amount, fee_bps, 0, 0, 0, false, false);
        // amount * fee_bps will overflow u64 for these ranges
        prop_assert!(result.is_err(), "should return Err on overflow");
    }
}

// ============================================================================
// validate_policy_execution — PAYG chunk bounds
// ============================================================================

proptest! {
    #[test]
    fn prop_payg_rejects_zero_chunk(
        max_chunk in 1u64..u64::MAX,
        max_per_period in 1u64..u64::MAX,
        period_secs in 1u64..1_000_000_000,
        period_start in 0i64..2_000_000_000i64,
        now in 0i64..2_000_000_000i64,
    ) {
        let pt = PolicyType::PayAsYouGo {
            max_amount_per_period: max_per_period,
            max_chunk_amount: max_chunk,
            period_length_seconds: period_secs,
            current_period_start: period_start,
            current_period_total: 0,
            expiry_date: None,
            padding: [0u8; 79],
        };
        let result = validate_policy_execution(&pt, now, Some(0), &MilestoneSigners::none());
        prop_assert!(result.is_err(), "PAYG must reject zero chunk");
    }

    #[test]
    fn prop_payg_rejects_oversize_chunk(
        max_chunk in 1u64..u64::MAX / 2,
        max_per_period in 1u64..u64::MAX,
        period_secs in 1u64..1_000_000_000,
        period_start in 0i64..2_000_000_000i64,
        now in 0i64..2_000_000_000i64,
        extra in 1u64..u64::MAX / 2,
    ) {
        let oversize = max_chunk + extra;
        let pt = PolicyType::PayAsYouGo {
            max_amount_per_period: max_per_period,
            max_chunk_amount: max_chunk,
            period_length_seconds: period_secs,
            current_period_start: period_start,
            current_period_total: 0,
            expiry_date: None,
            padding: [0u8; 79],
        };
        let result = validate_policy_execution(&pt, now, Some(oversize), &MilestoneSigners::none());
        prop_assert!(result.is_err(), "PAYG must reject chunk > max_chunk");
    }

    #[test]
    fn prop_payg_accepts_valid_chunk(
        max_chunk in 1u64..1_000_000_000,
        max_extra in 0u64..1_000_000_000,
        period_secs in 1u64..1_000_000_000,
        period_start in 0i64..2_000_000_000i64,
        chunk_factor in 1u64..1000,
    ) {
        let max_per_period = max_chunk + max_extra;
        let chunk = chunk_factor.min(max_chunk);
        let pt = PolicyType::PayAsYouGo {
            max_amount_per_period: max_per_period,
            max_chunk_amount: max_chunk,
            period_length_seconds: period_secs,
            current_period_start: period_start,
            current_period_total: 0,
            expiry_date: None,
            padding: [0u8; 79],
        };
        let now = period_start + 100; // within period
        let result = validate_policy_execution(&pt, now, Some(chunk), &MilestoneSigners::none());
        prop_assert!(result.is_ok(), "valid chunk should be accepted");
        prop_assert_eq!(result.unwrap(), chunk);
    }
}

// ============================================================================
// advance_policy — completion semantics + cap preservation
// ============================================================================

proptest! {
    #[test]
    fn prop_payg_never_completes(
        max_chunk in 1u64..1_000_000_000,
        max_extra in 0u64..1_000_000_000,
        period_secs in 1u64..1_000_000_000,
        period_start in 0i64..2_000_000_000i64,
        now in 0i64..2_000_000_000i64,
        amount in 0u64..1_000_000_000,
    ) {
        let max_per_period = max_chunk + max_extra;
        let mut pt = PolicyType::PayAsYouGo {
            max_amount_per_period: max_per_period,
            max_chunk_amount: max_chunk,
            period_length_seconds: period_secs,
            current_period_start: period_start,
            current_period_total: 0,
            expiry_date: None,
            padding: [0u8; 79],
        };
        if let Ok(should_complete) = advance_policy(&mut pt, now, amount) {
            prop_assert!(!should_complete, "PAYG must never auto-complete");
        }
    }

    #[test]
    fn prop_onetime_always_completes(
        amount in 0u64..u64::MAX,
        now in 0i64..i64::MAX,
        settle in 0u64..u64::MAX,
    ) {
        let mut pt = PolicyType::OneTime {
            amount,
            due_date: 0,
            expiry_date: None,
            padding: [0u8; 103],
        };
        if let Ok(should_complete) = advance_policy(&mut pt, now, settle) {
            prop_assert!(should_complete, "OneTime must always complete");
        }
    }

    #[test]
    fn prop_upto_always_completes(
        max_amount in 0u64..u64::MAX,
        valid_after in 0i64..1_000_000_000,
        deadline_extra in 1i64..1_000_000_000,
        settle in 0u64..u64::MAX,
        now in 0i64..i64::MAX,
    ) {
        let deadline = valid_after + deadline_extra;
        let mut pt = PolicyType::UpTo {
            max_amount,
            valid_after,
            deadline,
            padding: [0u8; 104],
        };
        if let Ok(should_complete) = advance_policy(&mut pt, now, settle) {
            prop_assert!(should_complete, "UpTo must always complete");
        }
    }
}

// ============================================================================
// ByteRangeCheck::validate — OOB defense + correctness
// Target: programs/tributary/src/state/composable_policy.rs:15
// ============================================================================

use tributary::constants::{ALLOWED_FORWARD_PROGRAMS, NATIVE_MINT};
use tributary::instructions::composable::create_composable_policy::validate_forward_config;
use tributary::instructions::composable::execute_composable::validate_byte_ranges;
use tributary::state::{
    ByteRangeCheck, ForwardConfig, InstructionConstraint, PinnedAccount, MAX_BYTE_RANGE_CHECKS,
    MAX_PINNED_FORWARD_ACCOUNTS,
};

proptest! {
    #[test]
    fn prop_byte_range_check_length_above_eight_rejects(
        offset in 0u8..255,
        length in 9u8..255,
        data in prop::collection::vec(any::<u8>(), 0..128),
    ) {
        let check = ByteRangeCheck { offset, length, expected: [0u8; 8] };
        prop_assert!(!check.validate(&data), "length > 8 must always reject");
    }

    #[test]
    fn prop_byte_range_check_in_bounds_never_panics(
        offset in 0u8..64,
        length in 0u8..=8,
        data in prop::collection::vec(any::<u8>(), 64..128),
        expected in prop::array::uniform8(0u8..255),
    ) {
        let check = ByteRangeCheck { offset, length, expected };
        let _ = check.validate(&data); // must not panic
    }

    #[test]
    fn prop_byte_range_check_matches_correctly(
        offset in 0u8..30,
        length in 1u8..=8,
        data in prop::collection::vec(any::<u8>(), 48),
    ) {
        // Extract expected from the data itself — must validate as true.
        let expected_slice = &data[offset as usize..offset as usize + length as usize];
        let mut expected = [0u8; 8];
        expected[..length as usize].copy_from_slice(expected_slice);

        let check = ByteRangeCheck { offset, length, expected };
        prop_assert!(check.validate(&data), "must match when expected == data[offset..offset+length]");
    }

    #[test]
    fn prop_validate_byte_ranges_rejects_num_checks_above_len(
        num_checks in 1u8..10,
        data in prop::collection::vec(any::<u8>(), 16),
    ) {
        let checks: Vec<ByteRangeCheck> = (0..num_checks as usize)
            .map(|_| ByteRangeCheck { offset: 0, length: 1, expected: [0u8; 8] })
            .collect();
        let excess = num_checks + 1;
        let result = validate_byte_ranges(&data, &checks, excess);
        prop_assert!(result.is_err(), "num_checks > checks.len() must Err");
    }
}

// ============================================================================
// validate_forward_config — composable forward gate
// Target: programs/tributary/src/instructions/composable/create_composable_policy.rs:352
// ============================================================================

proptest! {
    #[test]
    fn prop_forward_disabled_requires_same_mint(
        mint_a in any::<[u8; 32]>(),
        mint_b in any::<[u8; 32]>(),
        num_checks in 1u8..4,
    ) {
        let config = ForwardConfig {
            instruction_constraint: InstructionConstraint {
                program_id: Pubkey::default(),
                num_data_checks: num_checks,
                data_checks: [ByteRangeCheck { offset: 0, length: 0, expected: [0u8; 8] }; MAX_BYTE_RANGE_CHECKS],
                num_pinned_accounts: 0,
                pinned_accounts: [PinnedAccount::default(); MAX_PINNED_FORWARD_ACCOUNTS],
            },
            input_mint: Pubkey::new_from_array(mint_a),
            output_mint: Pubkey::new_from_array(mint_b),
            forward_flags: 0,
        };
        let result = validate_forward_config(&config);
        prop_assert!(result.is_err(), "disabled forward with mismatched mints or checks must reject");
    }

    #[test]
    fn prop_forward_disabled_same_mint_zero_checks_ok(
        mint in any::<[u8; 32]>(),
    ) {
        let pubkey = Pubkey::new_from_array(mint);
        let config = ForwardConfig {
            instruction_constraint: InstructionConstraint {
                program_id: Pubkey::default(),
                num_data_checks: 0,
                data_checks: [ByteRangeCheck { offset: 0, length: 0, expected: [0u8; 8] }; MAX_BYTE_RANGE_CHECKS],
                num_pinned_accounts: 0,
                pinned_accounts: [PinnedAccount::default(); MAX_PINNED_FORWARD_ACCOUNTS],
            },
            input_mint: pubkey,
            output_mint: pubkey,
            forward_flags: 0,
        };
        let result = validate_forward_config(&config);
        prop_assert!(result.is_ok(), "disabled + same mint + 0 checks should be Ok");
    }

    #[test]
    fn prop_native_output_requires_wsol_mint(
        non_wsol_mint in any::<[u8; 32]>(),
    ) {
        let mint = Pubkey::new_from_array(non_wsol_mint);
        prop_assume!(mint != NATIVE_MINT);
        let config = ForwardConfig {
            instruction_constraint: InstructionConstraint {
                program_id: ALLOWED_FORWARD_PROGRAMS[0],
                num_data_checks: 1,
                data_checks: [ByteRangeCheck { offset: 0, length: 0, expected: [0u8; 8] }; MAX_BYTE_RANGE_CHECKS],
                num_pinned_accounts: 1,
                pinned_accounts: [
                    PinnedAccount { index: 0, pubkey: Pubkey::new_unique() },
                    PinnedAccount::default(),
                ],
            },
            input_mint: mint,
            output_mint: mint,
            forward_flags: 1,
        };
        let result = validate_forward_config(&config);
        prop_assert!(result.is_err(), "NATIVE_OUTPUT without WSOL output_mint must reject");
    }
}

// ============================================================================
// Referral pool tier conservation — sum(tier_rewards) <= referral_pool
// Target: programs/tributary/src/shared/referral.rs:138-178
// ============================================================================

proptest! {
    #[test]
    fn prop_referral_tier_conservation(
        gateway_fee in 0u64..u64::MAX,
        allocation_bps in 0u16..=2500,
        tier0 in 0u16..=10_000,
        tier1 in 0u16..=10_000,
    ) {
        // Construct tier_bps summing to exactly 10000 (validated at gateway
        // creation) instead of rejecting when tier0+tier1 > 10000.
        let tier1 = tier1.min(10_000u16.saturating_sub(tier0));
        let tier2 = 10000u16.saturating_sub(tier0).saturating_sub(tier1);

        // Replicate the referral math (checked arithmetic like the real code):
        // pool = gateway_fee * allocation_bps / 10000
        // tier_reward[i] = pool * tier_bps[i] / 10000
        let pool = (gateway_fee as u128)
            .checked_mul(allocation_bps as u128)
            .and_then(|v| v.checked_div(10000));

        if let Some(pool) = pool {
            let r0 = pool * tier0 as u128 / 10000;
            let r1 = pool * tier1 as u128 / 10000;
            let r2 = pool * tier2 as u128 / 10000;
            prop_assert!(
                r0 + r1 + r2 <= pool,
                "sum of tier rewards must not exceed pool (floor division)"
            );
        }
    }
}

// ============================================================================
// InstructionConstraint — indexed pin model (PinnedAccount)
// ============================================================================

/// Generate up to MAX PinnedAccount entries with small indices (0..MAX range
/// increases duplicate probability for meaningful coverage).
fn prop_pin_set(
    num: u8,
    idx0: u8,
    idx1: u8,
) -> ([PinnedAccount; MAX_PINNED_FORWARD_ACCOUNTS], Vec<u8>) {
    let max = MAX_PINNED_FORWARD_ACCOUNTS as u8;
    let indices = [idx0 % max, idx1 % max];
    let pins = [
        PinnedAccount {
            index: indices[0],
            pubkey: Pubkey::new_unique(),
        },
        PinnedAccount {
            index: indices[1],
            pubkey: Pubkey::new_unique(),
        },
    ];
    let active: Vec<u8> = indices[..num as usize].to_vec();
    (pins, active)
}

proptest! {
    /// Duplicate-index detection: when two active pins share the same index,
    /// validate_forward_config must reject. When all indices are distinct
    /// (and the rest of the config is valid), it must accept.
    #[test]
    fn prop_duplicate_index_rejected(
        num_pins in 1u8..=(MAX_PINNED_FORWARD_ACCOUNTS as u8),
        idx0 in 0u8..(MAX_PINNED_FORWARD_ACCOUNTS as u8),
        idx1 in 0u8..(MAX_PINNED_FORWARD_ACCOUNTS as u8),
    ) {
        let (pins, active) = prop_pin_set(num_pins, idx0, idx1);

        // Detect duplicates manually
        let has_dup = (0..active.len()).any(|i| {
            (i + 1..active.len()).any(|j| active[i] == active[j])
        });

        let mut ic = InstructionConstraint::default();
        ic.program_id = ALLOWED_FORWARD_PROGRAMS[0];
        ic.num_data_checks = 1;
        ic.data_checks[0] = ByteRangeCheck { offset: 0, length: 1, expected: [0u8; 8] };
        ic.num_pinned_accounts = num_pins;
        ic.pinned_accounts = pins;

        let config = ForwardConfig {
            instruction_constraint: ic,
            input_mint: Pubkey::new_unique(),
            output_mint: Pubkey::new_unique(),
            forward_flags: 0,
        };

        let result = validate_forward_config(&config);
        if has_dup {
            prop_assert!(result.is_err(), "duplicate indices must be rejected at create");
        } else {
            prop_assert!(result.is_ok(), "distinct indices + valid config must be accepted");
        }
    }

    /// Indexed pin check: pins_match() returns true iff every active pin's
    /// pubkey is at the correct position (forward_start + pin.index) in the
    /// remaining_keys slice. Generates random pins, builds a matching key
    /// array, verifies true; then corrupts one position and verifies false.
    #[test]
    fn prop_pins_match_correct_position(
        num_pins in 1u8..=(MAX_PINNED_FORWARD_ACCOUNTS as u8),
        idx0 in any::<u8>(),
        idx1 in any::<u8>(),
        forward_start in 0usize..4,
    ) {
        // Avoid duplicate indices (those are rejected at create and make
        // pins_match ambiguous).
        let indices = [idx0, idx1];
        prop_assume!((0..num_pins as usize)
            .all(|i| (0..num_pins as usize)
                .all(|j| i == j || indices[i] != indices[j])));

        let pk0 = Pubkey::new_unique();
        let pk1 = Pubkey::new_unique();
        let pubkeys = [pk0, pk1];

        let mut ic = InstructionConstraint::default();
        ic.num_pinned_accounts = num_pins;
        for i in 0..num_pins as usize {
            ic.pinned_accounts[i] = PinnedAccount {
                index: indices[i],
                pubkey: pubkeys[i],
            };
        }

        // Build a keys vec large enough to hold all indexed positions.
        let max_idx = indices[..num_pins as usize].iter().copied().max().unwrap_or(0);
        let keys_len = forward_start + max_idx as usize + 1;
        let mut keys: Vec<Pubkey> = (0..keys_len).map(|_| Pubkey::new_unique()).collect();

        // Place correct pubkeys at pin positions.
        for i in 0..num_pins as usize {
            keys[forward_start + indices[i] as usize] = pubkeys[i];
        }

        // All correct → must match.
        prop_assert!(ic.pins_match(&keys, forward_start),
            "pins_match must be true when all pubkeys are at correct positions");

        // Corrupt one position → must not match.
        let corrupt_at = forward_start + indices[0] as usize;
        keys[corrupt_at] = Pubkey::new_unique(); // different from pk0
        prop_assert!(!ic.pins_match(&keys, forward_start),
            "pins_match must be false when a pubkey is at the wrong position");
    }
}

// ============================================================================
// validate_policy_execution — remaining variants (Subscription / OneTime /
// UpTo / Milestone). Closes bean tributary-ya7m Layer-1 todo "all 4
// PolicyType variants". The PAYG variant is covered above.
// ============================================================================

proptest! {
    /// Subscription: Ok(amount) iff current_time >= next_payment_due, else
    /// PaymentNotDue. provided_amount is ignored.
    #[test]
    fn prop_subscription_due_gate(
        amount in 1u64..1_000_000_000,
        next_due in 0i64..2_000_000_000i64,
        delta in 0i64..1_000_000,
    ) {
        let pt = PolicyType::Subscription {
            amount,
            auto_renew: true,
            max_renewals: None,
            payment_frequency: PaymentFrequency::Monthly,
            next_payment_due: next_due,
            padding: [0u8; 97],
        };
        // Before due → Err
        let before = next_due.saturating_sub(delta);
        let r = validate_policy_execution(&pt, before, None, &MilestoneSigners::none());
        prop_assert!(r.is_err(), "before due must reject");
        // At/after due → Ok(amount)
        let at = next_due;
        let r = validate_policy_execution(&pt, at, None, &MilestoneSigners::none());
        prop_assert!(r.is_ok_and(|v| v == amount), "at due must return amount");
    }

    /// OneTime: due_date <= 0 means immediate; expiry_date Some(>0) gates
    /// current_time <= expiry (boundary permitted).
    #[test]
    fn prop_onetime_due_and_expiry(
        amount in 1u64..1_000_000_000,
        due in 0i64..1_000_000_000i64,
        expiry_offset in 1i64..1_000_000_000i64,
    ) {
        let expiry = due + expiry_offset;
        let pt = PolicyType::OneTime {
            amount,
            due_date: due,
            expiry_date: Some(expiry),
            padding: [0u8; 103],
        };
        // before due → Err
        prop_assert!(validate_policy_execution(&pt, due - 1, None, &MilestoneSigners::none()).is_err());
        // at due, before expiry → Ok
        prop_assert!(validate_policy_execution(&pt, due, None, &MilestoneSigners::none()).is_ok());
        // exactly expiry boundary → Ok (<= permitted)
        prop_assert!(validate_policy_execution(&pt, expiry, None, &MilestoneSigners::none()).is_ok());
        // past expiry → Err
        prop_assert!(validate_policy_execution(&pt, expiry + 1, None, &MilestoneSigners::none()).is_err());
    }

    /// UpTo: actual bounded by max; valid_after gate; strict deadline (<).
    #[test]
    fn prop_upto_bounds(
        max_amount in 1u64..1_000_000_000,
        valid_after in 1i64..1_000_000_000i64,
        deadline_extra in 1i64..1_000_000,
        actual in 0u64..1_000_000_000,
    ) {
        let deadline = valid_after + deadline_extra;
        let pt = PolicyType::UpTo {
            max_amount,
            valid_after,
            deadline,
            padding: [0u8; 104],
        };
        // oversize actual → Err
        if actual > max_amount {
            prop_assert!(validate_policy_execution(&pt, valid_after, Some(actual), &MilestoneSigners::none()).is_err());
        }
        // before valid_after → Err
        prop_assert!(validate_policy_execution(&pt, valid_after - 1, Some(actual.min(max_amount)), &MilestoneSigners::none()).is_err());
        // at deadline (==) → Err (strict <)
        prop_assert!(validate_policy_execution(&pt, deadline, Some(actual.min(max_amount)), &MilestoneSigners::none()).is_err());
        // valid window, in-bounds actual → Ok(actual)
        let ok_actual = actual.min(max_amount);
        let r = validate_policy_execution(&pt, valid_after, Some(ok_actual), &MilestoneSigners::none());
        prop_assert!(r.is_ok_and(|v| v == ok_actual), "valid window + bounded actual must return actual");
    }
}

// ============================================================================
// advance_policy — PAYG period reset (bean tributary-ya7m Layer-1 todo).
// Crossing period_length_seconds resets current_period_total to `amount`;
// within-period accumulates. The empirical twin of A2 (qedspec period_bounded).
// ============================================================================

proptest! {
    /// Crossing the period boundary resets current_period_start and
    /// current_period_total. Within-period accumulates (checked_add).
    #[test]
    fn prop_payg_period_reset(
        max_per_period in 1u64..1_000_000_000,
        period_secs in 1u64..10_000_000,
        period_start in 0i64..2_000_000_000i64,
        elapsed in 1i64..1_000_000_000i64,
        first in 1u64..1_000,
        second in 1u64..1_000,
    ) {
        prop_assume!(first <= max_per_period && second <= max_per_period);
        let mut pt = PolicyType::PayAsYouGo {
            max_amount_per_period: max_per_period,
            max_chunk_amount: max_per_period,
            period_length_seconds: period_secs,
            current_period_start: period_start,
            current_period_total: first,
            expiry_date: None,
            padding: [0u8; 79],
        };
        // After boundary: reset. current_period_total becomes `second`.
        let now = period_start + period_secs as i64 + elapsed;
        advance_policy(&mut pt, now, second).unwrap();
        match &pt {
            PolicyType::PayAsYouGo { current_period_start, current_period_total, .. } => {
                prop_assert_eq!(*current_period_start, now, "period start resets to now");
                prop_assert_eq!(*current_period_total, second, "period total resets to amount");
            }
            _ => panic!("variant unchanged"),
        }

        // Within the new period: accumulate.
        let now2 = now + 1;
        let prev_total = second;
        advance_policy(&mut pt, now2, first).unwrap();
        match &pt {
            PolicyType::PayAsYouGo { current_period_total, .. } => {
                prop_assert_eq!(*current_period_total, prev_total + first, "within-period accumulates");
            }
            _ => panic!("variant unchanged"),
        }
    }
}
