//! Shared policy advancement + execution-validation helpers, plus the
//! calendar-month arithmetic they depend on.
//!
//! Both `PaymentPolicy` (released) and `ComposablePolicy` (unreleased) embed
//! the same [`PolicyType`] enum. These functions are the single source of
//! truth for *when* a policy may execute and *how* its schedule advances
//! after a successful execution.
//!
//! ## Calendar-month arithmetic
//!
//! [`advance_policy`] for `PolicyType::Subscription` routes through
//! [`calculate_next_payment_due`], which uses real calendar
//! months (Jan 31 + 1 month → Feb 28/29) — the same algorithm used by both
//! the subscription and composable Timed paths. No fixed-seconds lookup is
//! used anywhere. Calendar-month correctness is pinned by a differential
//! proptest against `chrono` (see the `proptest` module at the bottom of the
//! in-file tests).

use crate::error::TributaryError;
use crate::state::{
    PaymentFrequency, PolicyType, RELEASE_GATEWAY, RELEASE_OWNER, RELEASE_RECIPIENT,
};
use anchor_lang::prelude::*;

/// Maximum number of monthly iterations the bounded loop in
/// [`skip_months`] will run before bailing with `ArithmeticOverflow`.
/// 1200 months ≈ 100 years — anything past this is considered abuse / bug.
const MAX_MONTHLY_ITERATIONS: u32 = 1200;

/// Calculate the next payment due date based on payment frequency.
/// Fixed-interval frequencies (Daily, Weekly, Custom) use O(1) arithmetic.
/// Variable-interval frequencies (Monthly, Quarterly, etc.) use a bounded loop.
pub fn calculate_next_payment_due(
    current_due: i64,
    frequency: &PaymentFrequency,
    current_timestamp: i64,
) -> Result<i64> {
    if current_due > current_timestamp {
        return Ok(current_due);
    }

    match frequency {
        PaymentFrequency::Daily => skip_fixed_interval(current_due, current_timestamp, 86400),
        PaymentFrequency::Weekly => skip_fixed_interval(current_due, current_timestamp, 604800),
        PaymentFrequency::Monthly => skip_months(current_due, current_timestamp, 1),
        PaymentFrequency::Quarterly => skip_months(current_due, current_timestamp, 3),
        PaymentFrequency::SemiAnnually => skip_months(current_due, current_timestamp, 6),
        PaymentFrequency::Annually => skip_months(current_due, current_timestamp, 12),
        PaymentFrequency::Custom(interval_seconds) => {
            require!(*interval_seconds > 0, TributaryError::InvalidFrequency);
            require!(
                *interval_seconds <= i64::MAX as u64,
                TributaryError::InvalidFrequency
            );
            skip_fixed_interval(current_due, current_timestamp, *interval_seconds as i64)
        }
    }
}

fn skip_fixed_interval(current_due: i64, current_timestamp: i64, interval: i64) -> Result<i64> {
    let elapsed = current_timestamp.saturating_sub(current_due);
    let intervals_to_skip = (elapsed / interval)
        .checked_add(1)
        .ok_or(TributaryError::ArithmeticOverflow)?;
    current_due
        .checked_add(
            intervals_to_skip
                .checked_mul(interval)
                .ok_or(TributaryError::ArithmeticOverflow)?,
        )
        .ok_or(TributaryError::ArithmeticOverflow.into())
}

fn skip_months(current_due: i64, current_timestamp: i64, months: i32) -> Result<i64> {
    let mut next_due = current_due;
    let mut iterations = 0u32;
    while next_due <= current_timestamp {
        require!(
            iterations < MAX_MONTHLY_ITERATIONS,
            TributaryError::ArithmeticOverflow
        );
        next_due = add_months(next_due, months)?;
        iterations = iterations.saturating_add(1);
    }
    Ok(next_due)
}

/// Add months to a Unix timestamp, maintaining the same day of month
fn add_months(timestamp: i64, months: i32) -> Result<i64> {
    // Convert Unix timestamp to date components
    let days_since_epoch = timestamp / 86400;
    let seconds_in_day = timestamp % 86400;

    // Check for overflow in cast
    if days_since_epoch > i32::MAX as i64 || days_since_epoch < i32::MIN as i64 {
        return err!(TributaryError::ArithmeticOverflow);
    }

    // Calculate year, month, day from days since epoch (1970-01-01)
    let mut year = 1970;
    let mut remaining_days = days_since_epoch as i32;

    // Handle years
    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days >= days_in_year {
            remaining_days = remaining_days
                .checked_sub(days_in_year)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            year = year
                .checked_add(1)
                .ok_or(TributaryError::ArithmeticOverflow)?;
        } else {
            break;
        }
    }

    // Handle months
    let mut month = 1;
    loop {
        let days_in_month = get_days_in_month(year, month);
        if remaining_days >= days_in_month {
            remaining_days = remaining_days
                .checked_sub(days_in_month)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            month = month
                .checked_add(1)
                .ok_or(TributaryError::ArithmeticOverflow)?;
        } else {
            break;
        }
    }

    let day = remaining_days
        .checked_add(1)
        .ok_or(TributaryError::ArithmeticOverflow)?; // Days are 1-indexed

    // Add the requested months
    let mut new_month = month
        .checked_add(months)
        .ok_or(TributaryError::ArithmeticOverflow)?;
    let mut new_year = year;

    // Handle month overflow/underflow
    while new_month > 12 {
        new_month = new_month
            .checked_sub(12)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        new_year = new_year
            .checked_add(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }
    // ponytail: dead in prod — skip_months only ever passes {1,3,6,12}.
    // Retained (not deleted) because the chrono differential proptest below
    // fuzzes only positive n (the production path), and a unit test still
    // exercises this branch directly. Delete this branch only if you also
    // remove its test and tighten add_months to `u32` months.
    while new_month < 1 {
        new_month = new_month
            .checked_add(12)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        new_year = new_year
            .checked_sub(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }

    // Handle day overflow (e.g., Jan 31 + 1 month = Feb 28/29)
    let max_day_in_new_month = get_days_in_month(new_year, new_month);
    let new_day = if day > max_day_in_new_month {
        max_day_in_new_month
    } else {
        day
    };

    // Convert back to Unix timestamp
    let mut new_days_since_epoch: i64 = 0;

    // Add days for complete years
    for y in 1970..new_year {
        let days = if is_leap_year(y) { 366i64 } else { 365i64 };
        new_days_since_epoch = new_days_since_epoch
            .checked_add(days)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }

    // Add days for complete months in the target year
    for m in 1..new_month {
        let days = get_days_in_month(new_year, m) as i64;
        new_days_since_epoch = new_days_since_epoch
            .checked_add(days)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }

    // Add remaining days
    new_days_since_epoch = new_days_since_epoch
        .checked_add((new_day - 1) as i64)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    // Convert to timestamp
    let new_timestamp = new_days_since_epoch
        .checked_mul(86400)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_add(seconds_in_day)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    Ok(new_timestamp)
}

/// Check if a year is a leap year
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

/// Get the number of days in a given month and year
fn get_days_in_month(year: i32, month: i32) -> i32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

/// Signer context required to enforce `Milestone::release_condition`
/// signer bits 1-3 (gateway / owner / recipient). The values are only
/// read for `PolicyType::Milestone` and ignored by the other variants.
///
/// Bits 1-3 are mutually exclusive — enforced at policy creation by
/// [`crate::policies::milestone::validate_milestone_policy`]. Callers that
/// do not have a real signer to check (e.g. unit tests for non-Milestone
/// policies) may pass [`MilestoneSigners::none`].
#[derive(Clone, Copy)]
pub struct MilestoneSigners<'a> {
    pub caller: &'a Pubkey,
    pub gateway_signer: &'a Pubkey,
    pub owner: &'a Pubkey,
    pub recipient: &'a Pubkey,
}

impl<'a> MilestoneSigners<'a> {
    /// Convenience: all-zero placeholder for tests of non-Milestone policies.
    /// Passing this to [`validate_policy_execution`] for a Milestone policy
    /// with any signer bit set will reject the call (bits 1-3 compare
    /// unequal to `Pubkey::default()` unless the caller is also default).
    pub fn none() -> Self {
        // from_str_const is the only const way to materialize a Pubkey.
        const DUMMY: Pubkey = Pubkey::from_str_const("11111111111111111111111111111111");
        Self {
            caller: &DUMMY,
            gateway_signer: &DUMMY,
            owner: &DUMMY,
            recipient: &DUMMY,
        }
    }
}

/// Validate that a policy may execute at `current_time` and return the
/// base amount to transfer.
///
/// * **Subscription** — checks `current_time >= next_payment_due`; returns
///   the configured `amount`.
/// * **Milestone** — checks `current_milestone < total_milestones`; if the
///   `release_condition` bit-0 flag is set, also enforces the milestone's
///   due-date; if any of bits 1-3 is set, enforces that `signers.caller`
///   matches the corresponding authority (gateway signer / owner /
///   recipient). Bits 1-3 are mutually exclusive. Returns
///   `milestone_amounts[current_milestone]`.
/// * **PayAsYouGo** — requires `provided_amount` (the chunk); validates
///   `0 < chunk <= max_chunk_amount` and that the projected period total
///   stays within `max_amount_per_period`; returns the chunk.
/// * **OneTime** — `due_date <= 0` is immediately executable, otherwise
///   requires `current_time >= due_date`; if `expiry_date` is set,
///   requires `current_time <= expiry_date`. Returns the fixed `amount`.
///   The caller-supplied `provided_amount` is ignored (mirrors
///   Subscription).
/// * **UpTo** — single-use, time-bound variable-amount authorization. The
///   settle amount is caller-supplied (`provided_amount`) and MUST satisfy
///   `0 <= actual <= max_amount` (a zero settle is explicitly permitted —
///   no usage means no charge). Requires `current_time >= valid_after`
///   when `valid_after > 0`, and `current_time < deadline` (strict —
///   x402 mandates explicit time bounds). Returns the actual amount.
pub fn validate_policy_execution(
    policy_type: &PolicyType,
    current_time: i64,
    provided_amount: Option<u64>,
    signers: &MilestoneSigners<'_>,
) -> Result<u64> {
    match policy_type {
        PolicyType::Subscription {
            amount,
            next_payment_due,
            ..
        } => {
            require!(
                current_time >= *next_payment_due,
                TributaryError::PaymentNotDue
            );
            Ok(*amount)
        }
        PolicyType::Milestone {
            milestone_amounts,
            milestone_timestamps,
            current_milestone,
            release_condition,
            total_milestones,
            ..
        } => {
            let idx = *current_milestone as usize;
            require!(
                idx < *total_milestones as usize,
                TributaryError::PolicyPaused
            );
            if *release_condition & 0b0001 != 0 {
                require!(
                    current_time >= milestone_timestamps[idx],
                    TributaryError::PaymentNotDue
                );
            }
            // Bits 1-3 (mutually exclusive — see validate_milestone_policy).
            // Mirror the legacy PaymentPolicy path (policies/milestone.rs).
            // Without this check the milestone would release on the due date
            // alone, bypassing the configured signer authorization (H-1).
            if *release_condition & RELEASE_GATEWAY != 0 {
                require!(
                    signers.caller == signers.gateway_signer,
                    TributaryError::Unauthorized
                );
            } else if *release_condition & RELEASE_OWNER != 0 {
                require!(
                    signers.caller == signers.owner,
                    TributaryError::Unauthorized
                );
            } else if *release_condition & RELEASE_RECIPIENT != 0 {
                require!(
                    signers.caller == signers.recipient,
                    TributaryError::Unauthorized
                );
            }
            Ok(milestone_amounts[idx])
        }
        PolicyType::PayAsYouGo {
            max_amount_per_period,
            max_chunk_amount,
            period_length_seconds,
            current_period_start,
            current_period_total,
            padding: _,
        } => {
            let chunk = provided_amount.ok_or(TributaryError::InvalidAmount)?;
            require!(chunk > 0, TributaryError::InvalidAmount);
            require!(chunk <= *max_chunk_amount, TributaryError::InvalidAmount);
            let period_total =
                if current_time >= *current_period_start + *period_length_seconds as i64 {
                    chunk
                } else {
                    current_period_total
                        .checked_add(chunk)
                        .ok_or(TributaryError::ArithmeticOverflow)?
                };
            require!(
                period_total <= *max_amount_per_period,
                TributaryError::InsufficientDelegatedAmount
            );
            Ok(chunk)
        }
        PolicyType::OneTime {
            amount,
            due_date,
            expiry_date,
            ..
        } => {
            if *due_date > 0 {
                require!(current_time >= *due_date, TributaryError::PaymentNotDue);
            }
            if let Some(exp) = expiry_date {
                require!(current_time <= *exp, TributaryError::PolicyExpired);
            }
            Ok(*amount)
        }
        PolicyType::UpTo {
            max_amount,
            valid_after,
            deadline,
            ..
        } => {
            // Settle amount is caller-supplied (determined by the resource
            // server after usage). Unlike Subscription/OneTime (fixed), like
            // PayAsYouGo (chunk). A zero settle is explicitly permitted — the
            // x402 spec allows "no charge if no usage occurred".
            let actual = provided_amount.ok_or(TributaryError::InvalidAmount)?;
            require!(actual <= *max_amount, TributaryError::InvalidAmount);
            if *valid_after > 0 {
                require!(current_time >= *valid_after, TributaryError::PaymentNotDue);
            }
            require!(current_time < *deadline, TributaryError::PolicyExpired);
            Ok(actual)
        }
    }
}

/// Advance a policy's schedule after a successful execution.
/// Returns `true` when the policy should be marked as completed/paused.
///
/// * **Subscription** — advances `next_payment_due` via calendar-month math
///   (see [`calculate_next_payment_due`]); decrements `max_renewals`;
///   completes when `max_renewals` hits zero OR `auto_renew` is false.
/// * **Milestone** — increments `current_milestone`; completes when
///   `current_milestone >= total_milestones`.
/// * **PayAsYouGo** — resets or accumulates `current_period_total` based on
///   whether the period window has elapsed; never auto-completes.
/// * **OneTime** — always completes. A one-time policy fires exactly once;
///   `execute_payment` / `execute_composable` then sets
///   `status = PolicyStatus::Completed`, and re-execution is blocked by the
///   existing `status == Active` constraint.
/// * **UpTo** — always completes after one settlement. Same single-use
///   guarantee as OneTime via the `Active → Completed` transition; the
///   variant is immutable, only the enclosing account's `status` flips.
pub fn advance_policy(
    policy_type: &mut PolicyType,
    current_time: i64,
    amount: u64,
) -> Result<bool> {
    match policy_type {
        PolicyType::Subscription {
            payment_frequency,
            next_payment_due,
            auto_renew,
            max_renewals,
            ..
        } => {
            *next_payment_due =
                calculate_next_payment_due(*next_payment_due, payment_frequency, current_time)?;

            let should_complete = if let Some(ref mut max) = max_renewals {
                *max = max.saturating_sub(1);
                *max == 0 || !*auto_renew
            } else {
                false
            };

            Ok(should_complete)
        }
        PolicyType::Milestone {
            current_milestone,
            total_milestones,
            ..
        } => {
            *current_milestone = current_milestone.saturating_add(1);
            Ok(*current_milestone >= *total_milestones)
        }
        PolicyType::PayAsYouGo {
            period_length_seconds,
            current_period_start,
            current_period_total,
            ..
        } => {
            if current_time >= *current_period_start + *period_length_seconds as i64 {
                *current_period_start = current_time;
                *current_period_total = amount;
            } else {
                *current_period_total = current_period_total
                    .checked_add(amount)
                    .ok_or(TributaryError::ArithmeticOverflow)?;
            }
            Ok(false)
        }
        PolicyType::OneTime { .. } => {
            // Always terminal after one execution. No state to mutate — the
            // variant is immutable; only the enclosing account's `status`
            // field flips to `Completed` in the caller.
            Ok(true)
        }
        PolicyType::UpTo { .. } => {
            // Single-use: always terminal after one settlement. Identical
            // guarantee to OneTime — the variant is immutable; the enclosing
            // account's `status` field flips to `Completed` in the caller.
            Ok(true)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::PaymentFrequency;

    /// Build a `PolicyType::Subscription` for tests.
    fn subscription(
        amount: u64,
        frequency: PaymentFrequency,
        next_due: i64,
        max_renewals: Option<u32>,
        auto_renew: bool,
    ) -> PolicyType {
        PolicyType::Subscription {
            amount,
            auto_renew,
            max_renewals,
            payment_frequency: frequency,
            next_payment_due: next_due,
            padding: [0u8; 97],
        }
    }

    const JAN_31_2024: i64 = 1_706_702_400;
    const FEB_29_2024: i64 = 1_709_208_000;
    const MAR_01_2024: i64 = 1_709_294_400;

    // ── M-04 regression: Subscription uses calendar months ──

    #[test]
    fn subscription_monthly_uses_calendar_months_not_fixed_seconds() {
        let mut pt = subscription(100, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        advance_policy(&mut pt, FEB_29_2024, 100).unwrap();

        let next = match &pt {
            PolicyType::Subscription {
                next_payment_due, ..
            } => *next_payment_due,
            _ => unreachable!(),
        };

        assert_ne!(
            next,
            JAN_31_2024 + 2_592_000,
            "Subscription Monthly must NOT use legacy +2592000s (M-04)"
        );
    }

    #[test]
    fn subscription_monthly_january_clamps_day() {
        let mut pt = subscription(100, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        advance_policy(&mut pt, MAR_01_2024, 100).unwrap();

        let next = match &pt {
            PolicyType::Subscription {
                next_payment_due, ..
            } => *next_payment_due,
            _ => unreachable!(),
        };

        assert!(next > MAR_01_2024);
        assert_ne!(next, JAN_31_2024 + 2_592_000);
    }

    // ── Completion semantics ──

    #[test]
    fn subscription_completes_when_max_renewals_reaches_zero() {
        let mut pt = subscription(100, PaymentFrequency::Monthly, JAN_31_2024, Some(1), true);
        let should = advance_policy(&mut pt, FEB_29_2024, 100).unwrap();
        assert!(should, "max_renewals=1 must complete after one execution");
    }

    #[test]
    fn subscription_completes_when_auto_renew_false() {
        let mut pt = subscription(100, PaymentFrequency::Monthly, JAN_31_2024, Some(10), false);
        let should = advance_policy(&mut pt, FEB_29_2024, 100).unwrap();
        assert!(
            should,
            "auto_renew=false must complete even with max remaining"
        );
    }

    #[test]
    fn subscription_continues_indefinitely_when_no_max_and_auto_renew() {
        let mut pt = subscription(100, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        let should = advance_policy(&mut pt, FEB_29_2024, 100).unwrap();
        assert!(!should, "no max + auto_renew must never auto-complete");
    }

    #[test]
    fn subscription_continues_when_max_remaining_and_auto_renew() {
        let mut pt = subscription(100, PaymentFrequency::Monthly, JAN_31_2024, Some(5), true);
        let should = advance_policy(&mut pt, FEB_29_2024, 100).unwrap();
        assert!(!should, "max=5→4 must not complete");
    }

    // ── validate_policy_execution gating ──

    #[test]
    fn subscription_rejects_execution_before_due() {
        let pt = subscription(100, PaymentFrequency::Monthly, FEB_29_2024, None, true);
        let err = validate_policy_execution(&pt, JAN_31_2024, None, &MilestoneSigners::none())
            .unwrap_err();
        assert!(err == error!(TributaryError::PaymentNotDue));
    }

    #[test]
    fn subscription_returns_configured_amount() {
        let pt = subscription(42, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        let amount =
            validate_policy_execution(&pt, FEB_29_2024, None, &MilestoneSigners::none()).unwrap();
        assert_eq!(amount, 42);
    }

    // ── H-1 regression: Milestone release_condition signer bits 1-3 ──

    /// Build a `PolicyType::Milestone` with a single milestone.
    fn milestone(amount: u64, due: i64, release_condition: u8) -> PolicyType {
        PolicyType::Milestone {
            milestone_amounts: [amount, 0, 0, 0],
            milestone_timestamps: [due, 0, 0, 0],
            current_milestone: 0,
            release_condition,
            total_milestones: 1,
            escrow_amount: amount,
            padding: [0u8; 53],
        }
    }

    /// Distinct pubkeys so a mismatch is unambiguous.
    fn distinct_signers() -> (
        Pubkey,
        Pubkey,
        Pubkey,
        Pubkey,
        Pubkey,
        MilestoneSigners<'static>,
    ) {
        // ponytail: leak to get 'static lifetime — test-only.
        let caller = Box::leak(Box::new(Pubkey::new_unique()));
        let gateway = Box::leak(Box::new(Pubkey::new_unique()));
        let owner = Box::leak(Box::new(Pubkey::new_unique()));
        let recipient = Box::leak(Box::new(Pubkey::new_unique()));
        let other = Box::leak(Box::new(Pubkey::new_unique()));
        let s = MilestoneSigners {
            caller,
            gateway_signer: gateway,
            owner,
            recipient,
        };
        (*caller, *gateway, *owner, *recipient, *other, s)
    }

    #[test]
    fn milestone_release_due_date_only_executes_when_due() {
        // bit0 only — no signer gate. Should succeed once due.
        let pt = milestone(100, JAN_31_2024, 0b0001);
        let (_, _, _, _, _, signers) = distinct_signers();
        let err = validate_policy_execution(&pt, JAN_31_2024 - 1, None, &signers).unwrap_err();
        assert!(err == error!(TributaryError::PaymentNotDue));
        let amount = validate_policy_execution(&pt, JAN_31_2024, None, &signers).unwrap();
        assert_eq!(amount, 100);
    }

    #[test]
    fn milestone_release_gateway_bit_requires_gateway_signer() {
        // bit1 (RELEASE_GATEWAY). Wrong caller is rejected even when due.
        let pt = milestone(100, JAN_31_2024, 0b0010);
        let (caller, gateway, _, _, other, _) = distinct_signers();
        let wrong = MilestoneSigners {
            caller: &other,
            gateway_signer: &gateway,
            owner: &gateway,
            recipient: &gateway,
        };
        let err = validate_policy_execution(&pt, FEB_29_2024, None, &wrong).unwrap_err();
        assert!(err == error!(TributaryError::Unauthorized));

        let ok = MilestoneSigners {
            caller: &gateway,
            gateway_signer: &gateway,
            owner: &caller,
            recipient: &caller,
        };
        let amount = validate_policy_execution(&pt, FEB_29_2024, None, &ok).unwrap();
        assert_eq!(amount, 100);
    }

    #[test]
    fn milestone_release_owner_bit_requires_owner() {
        // bit2 (RELEASE_OWNER)
        let pt = milestone(100, JAN_31_2024, 0b0100);
        let (caller, _, owner, _, other, _) = distinct_signers();
        let wrong = MilestoneSigners {
            caller: &other,
            gateway_signer: &owner,
            owner: &owner,
            recipient: &owner,
        };
        let err = validate_policy_execution(&pt, FEB_29_2024, None, &wrong).unwrap_err();
        assert!(err == error!(TributaryError::Unauthorized));

        let ok = MilestoneSigners {
            caller: &owner,
            gateway_signer: &caller,
            owner: &owner,
            recipient: &caller,
        };
        assert_eq!(
            validate_policy_execution(&pt, FEB_29_2024, None, &ok).unwrap(),
            100
        );
    }

    #[test]
    fn milestone_release_recipient_bit_requires_recipient() {
        // bit3 (RELEASE_RECIPIENT)
        let pt = milestone(100, JAN_31_2024, 0b1000);
        let (caller, _, _, recipient, other, _) = distinct_signers();
        let wrong = MilestoneSigners {
            caller: &other,
            gateway_signer: &recipient,
            owner: &recipient,
            recipient: &recipient,
        };
        let err = validate_policy_execution(&pt, FEB_29_2024, None, &wrong).unwrap_err();
        assert!(err == error!(TributaryError::Unauthorized));

        let ok = MilestoneSigners {
            caller: &recipient,
            gateway_signer: &caller,
            owner: &caller,
            recipient: &recipient,
        };
        assert_eq!(
            validate_policy_execution(&pt, FEB_29_2024, None, &ok).unwrap(),
            100
        );
    }

    #[test]
    fn milestone_release_zero_condition_allows_anyone() {
        // rc=0 → no gates, anyone can fire immediately.
        let pt = milestone(7, JAN_31_2024, 0b0000);
        let (_, _, _, _, _, signers) = distinct_signers();
        assert_eq!(
            validate_policy_execution(&pt, JAN_31_2024, None, &signers).unwrap(),
            7
        );
    }

    #[test]
    fn milestone_release_due_plus_gateway_bit_requires_both() {
        // bit0 | bit1: must be due AND gateway-signed.
        let pt = milestone(100, JAN_31_2024, 0b0011);
        let (_, gateway_k, _, _, _, signers) = distinct_signers();

        // Due, wrong signer → Unauthorized.
        let err = validate_policy_execution(&pt, FEB_29_2024, None, &signers).unwrap_err();
        assert!(err == error!(TributaryError::Unauthorized));

        // Right signer.
        let ok = MilestoneSigners {
            caller: &gateway_k,
            gateway_signer: &gateway_k,
            owner: &gateway_k,
            recipient: &gateway_k,
        };
        // Not due → PaymentNotDue.
        let err = validate_policy_execution(&pt, JAN_31_2024 - 1, None, &ok).unwrap_err();
        assert!(err == error!(TributaryError::PaymentNotDue));
        // Both satisfied → ok.
        assert_eq!(
            validate_policy_execution(&pt, FEB_29_2024, None, &ok).unwrap(),
            100
        );
    }

    // ── PayAsYouGo gating + L-01 regression (unified path) ──
    //
    // These pin the L-01 defense (reject explicit zero chunk) at its single
    // home in `validate_policy_execution`. Both `execute_payment` and
    // `execute_composable` route through this match arm. See
    // reports/L-01-payg-accepts-zero-amount.md.

    /// Build a `PolicyType::PayAsYouGo` with sane test defaults.
    fn payg(
        max_amount_per_period: u64,
        max_chunk_amount: u64,
        period_length_seconds: u64,
        current_period_start: i64,
        current_period_total: u64,
    ) -> PolicyType {
        PolicyType::PayAsYouGo {
            max_amount_per_period,
            max_chunk_amount,
            period_length_seconds,
            current_period_start,
            current_period_total,
            padding: [0u8; 88],
        }
    }

    /// L-01 regression: `validate_policy_execution(Some(0))` must be rejected.
    /// A caller-supplied zero chunk would otherwise let `execute_payment` /
    /// `execute_composable` skip every transfer CPI while still advancing the
    /// schedule and incrementing `payment_count`.
    #[test]
    fn payg_rejects_explicit_zero_chunk() {
        let pt = payg(1000, 100, 3600, 0, 0);
        let err =
            validate_policy_execution(&pt, 100, Some(0), &MilestoneSigners::none()).unwrap_err();
        assert!(
            err == error!(TributaryError::InvalidAmount),
            "Some(0) must be rejected, got {:?}",
            err
        );
    }

    /// L-01 regression: `validate_policy_execution(None)` must be rejected
    /// for PayAsYouGo — unlike Subscription/Milestone, a chunk is mandatory.
    #[test]
    fn payg_rejects_missing_chunk() {
        let pt = payg(1000, 100, 3600, 0, 0);
        let err = validate_policy_execution(&pt, 100, None, &MilestoneSigners::none()).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    /// A positive chunk within chunk + period bounds is accepted and echoed.
    #[test]
    fn payg_accepts_positive_chunk_within_bounds() {
        let pt = payg(1000, 100, 3600, 0, 0);
        let amt = validate_policy_execution(&pt, 100, Some(50), &MilestoneSigners::none()).unwrap();
        assert_eq!(amt, 50);
    }

    /// Chunk above `max_chunk_amount` is rejected.
    #[test]
    fn payg_rejects_chunk_above_max() {
        let pt = payg(1000, 100, 3600, 0, 0);
        let err =
            validate_policy_execution(&pt, 100, Some(101), &MilestoneSigners::none()).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    /// Chunk that would breach `max_amount_per_period` is rejected.
    #[test]
    fn payg_rejects_chunk_breaching_period_cap() {
        // period already at 950/1000; a 100-chunk would total 1050 > 1000.
        let pt = payg(1000, 100, 3600, 0, 950);
        let err =
            validate_policy_execution(&pt, 100, Some(100), &MilestoneSigners::none()).unwrap_err();
        assert!(err == error!(TributaryError::InsufficientDelegatedAmount));
    }

    /// `advance_policy` accumulates within a period and never auto-completes.
    #[test]
    fn payg_advance_accumulates_within_period() {
        let mut pt = payg(1000, 100, 3600, 0, 0);
        // First execution within the period → total becomes the chunk.
        let should = advance_policy(&mut pt, 100, 50).unwrap();
        assert!(!should, "PayAsYouGo never auto-completes");
        match &pt {
            PolicyType::PayAsYouGo {
                current_period_total,
                ..
            } => assert_eq!(
                *current_period_total, 50,
                "first chunk sets the period total"
            ),
            _ => panic!("expected PayAsYouGo"),
        }
        // Second execution within the same period → accumulates.
        let should = advance_policy(&mut pt, 200, 30).unwrap();
        assert!(!should);
        match &pt {
            PolicyType::PayAsYouGo {
                current_period_total,
                ..
            } => assert_eq!(*current_period_total, 80),
            _ => panic!("expected PayAsYouGo"),
        }
    }

    /// `advance_policy` resets the period total when the window has elapsed.
    #[test]
    fn payg_advance_resets_after_period_end() {
        let mut pt = payg(1000, 100, 3600, 0, 900);
        // current_time (4000) >= start (0) + period (3600) → new period.
        let should = advance_policy(&mut pt, 4000, 40).unwrap();
        assert!(!should);
        match &pt {
            PolicyType::PayAsYouGo {
                current_period_start,
                current_period_total,
                ..
            } => {
                assert_eq!(*current_period_start, 4000);
                assert_eq!(*current_period_total, 40);
            }
            _ => panic!("expected PayAsYouGo"),
        }
    }

    // ── OneTime gating + advancement ──

    /// Build a `PolicyType::OneTime` for tests.
    fn one_time(amount: u64, due_date: i64, expiry_date: Option<i64>) -> PolicyType {
        PolicyType::OneTime {
            amount,
            due_date,
            expiry_date,
            padding: [0u8; 103],
        }
    }

    #[test]
    fn onetime_immediate_executes_now() {
        // due_date <= 0 → immediately executable.
        let pt = one_time(100, 0, None);
        let amount = validate_policy_execution(&pt, 0, None, &MilestoneSigners::none()).unwrap();
        assert_eq!(amount, 100);
    }

    #[test]
    fn onetime_negative_due_executes_now() {
        // Negative due_date is also "immediate".
        let pt = one_time(7, -1, None);
        let amount = validate_policy_execution(&pt, 0, None, &MilestoneSigners::none()).unwrap();
        assert_eq!(amount, 7);
    }

    #[test]
    fn onetime_rejects_execution_before_due() {
        let pt = one_time(100, FEB_29_2024, None);
        let err = validate_policy_execution(&pt, JAN_31_2024, None, &MilestoneSigners::none())
            .unwrap_err();
        assert!(err == error!(TributaryError::PaymentNotDue));
    }

    #[test]
    fn onetime_executes_at_due_boundary() {
        let pt = one_time(100, FEB_29_2024, None);
        let amount =
            validate_policy_execution(&pt, FEB_29_2024, None, &MilestoneSigners::none()).unwrap();
        assert_eq!(amount, 100);
    }

    #[test]
    fn onetime_rejects_after_expiry() {
        let pt = one_time(100, 0, Some(JAN_31_2024));
        let err = validate_policy_execution(&pt, FEB_29_2024, None, &MilestoneSigners::none())
            .unwrap_err();
        assert!(err == error!(TributaryError::PolicyExpired));
    }

    #[test]
    fn onetime_executes_at_expiry_boundary() {
        // current_time == expiry is permitted (<=).
        let pt = one_time(100, 0, Some(JAN_31_2024));
        let amount =
            validate_policy_execution(&pt, JAN_31_2024, None, &MilestoneSigners::none()).unwrap();
        assert_eq!(amount, 100);
    }

    #[test]
    fn onetime_ignores_provided_amount() {
        // Caller-supplied amount is ignored — amount is fixed.
        let pt = one_time(100, 0, None);
        let amount =
            validate_policy_execution(&pt, 0, Some(999), &MilestoneSigners::none()).unwrap();
        assert_eq!(amount, 100);
    }

    #[test]
    fn onetime_advance_always_completes() {
        let mut pt = one_time(100, 0, None);
        let should = advance_policy(&mut pt, 0, 100).unwrap();
        assert!(should, "OneTime must always complete after one execution");
        // Variant itself is unchanged.
        match &pt {
            PolicyType::OneTime { amount, .. } => assert_eq!(*amount, 100),
            _ => panic!("expected OneTime"),
        }
    }

    // ── UpTo gating + advancement (ADR-0020) ──

    /// Build a `PolicyType::UpTo` for tests.
    fn up_to(max_amount: u64, valid_after: i64, deadline: i64) -> PolicyType {
        PolicyType::UpTo {
            max_amount,
            valid_after,
            deadline,
            padding: [0u8; 104],
        }
    }

    #[test]
    fn upto_accepts_zero_settle() {
        // actual == 0 is explicitly permitted (no usage → no charge).
        let pt = up_to(100, 0, FEB_29_2024);
        let amount =
            validate_policy_execution(&pt, JAN_31_2024, Some(0), &MilestoneSigners::none())
                .unwrap();
        assert_eq!(amount, 0);
    }

    #[test]
    fn upto_accepts_settle_below_max() {
        let pt = up_to(100, 0, FEB_29_2024);
        let amount =
            validate_policy_execution(&pt, JAN_31_2024, Some(42), &MilestoneSigners::none())
                .unwrap();
        assert_eq!(amount, 42);
    }

    #[test]
    fn upto_accepts_settle_equal_max() {
        let pt = up_to(100, 0, FEB_29_2024);
        let amount =
            validate_policy_execution(&pt, JAN_31_2024, Some(100), &MilestoneSigners::none())
                .unwrap();
        assert_eq!(amount, 100);
    }

    #[test]
    fn upto_rejects_settle_above_max() {
        let pt = up_to(100, 0, FEB_29_2024);
        let err = validate_policy_execution(&pt, JAN_31_2024, Some(101), &MilestoneSigners::none())
            .unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn upto_rejects_missing_settle_amount() {
        // Unlike Subscription/OneTime, UpTo requires a caller-supplied amount.
        let pt = up_to(100, 0, FEB_29_2024);
        let err = validate_policy_execution(&pt, JAN_31_2024, None, &MilestoneSigners::none())
            .unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn upto_immediate_valid_after_executes_now() {
        // valid_after <= 0 → immediately executable.
        let pt = up_to(100, 0, FEB_29_2024);
        let amount =
            validate_policy_execution(&pt, 0, Some(50), &MilestoneSigners::none()).unwrap();
        assert_eq!(amount, 50);
    }

    #[test]
    fn upto_rejects_before_valid_after() {
        let pt = up_to(100, FEB_29_2024, 2_000_000_000);
        let err = validate_policy_execution(&pt, JAN_31_2024, Some(50), &MilestoneSigners::none())
            .unwrap_err();
        assert!(err == error!(TributaryError::PaymentNotDue));
    }

    #[test]
    fn upto_executes_at_valid_after_boundary() {
        let pt = up_to(100, FEB_29_2024, 2_000_000_000);
        let amount =
            validate_policy_execution(&pt, FEB_29_2024, Some(50), &MilestoneSigners::none())
                .unwrap();
        assert_eq!(amount, 50);
    }

    #[test]
    fn upto_rejects_at_deadline_boundary() {
        // Strict `<` — at the deadline the authorization has expired.
        let pt = up_to(100, 0, FEB_29_2024);
        let err = validate_policy_execution(&pt, FEB_29_2024, Some(50), &MilestoneSigners::none())
            .unwrap_err();
        assert!(err == error!(TributaryError::PolicyExpired));
    }

    #[test]
    fn upto_rejects_after_deadline() {
        let pt = up_to(100, 0, JAN_31_2024);
        let err = validate_policy_execution(&pt, FEB_29_2024, Some(50), &MilestoneSigners::none())
            .unwrap_err();
        assert!(err == error!(TributaryError::PolicyExpired));
    }

    #[test]
    fn upto_advance_always_completes() {
        let mut pt = up_to(100, 0, FEB_29_2024);
        let should = advance_policy(&mut pt, JAN_31_2024, 42).unwrap();
        assert!(should, "UpTo must always complete after one settlement");
        // Variant itself is unchanged.
        match &pt {
            PolicyType::UpTo { max_amount, .. } => assert_eq!(*max_amount, 100),
            _ => panic!("expected UpTo"),
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // Calendar-math tests (lifted verbatim from `utils.rs` during the M1
    // extraction — these exercise `calculate_next_payment_due` /
    // `add_months` / `is_leap_year` / `get_days_in_month` and are preserved
    // here so the math stays covered by tests next to its new home).
    // ──────────────────────────────────────────────────────────────────

    use chrono::{DateTime, Datelike, TimeZone, Timelike, Utc};

    /// Convert Unix timestamp to chrono DateTime for testing
    fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_timestamp(timestamp, 0).expect("Invalid timestamp")
    }

    /// Create a timestamp for a specific date/time (UTC)
    fn create_timestamp(year: i32, month: u32, day: u32, hour: u32, min: u32, sec: u32) -> i64 {
        let dt = Utc
            .with_ymd_and_hms(year, month, day, hour, min, sec)
            .single()
            .expect("Invalid date/time");
        dt.timestamp()
    }

    #[test]
    fn test_calculate_next_payment_due_monthly_edge_cases() {
        // Test January 30th -> February (should handle month boundary correctly)
        let jan_30_2024 = create_timestamp(2024, 1, 30, 12, 0, 0);
        let feb_29_2024 = create_timestamp(2024, 2, 29, 12, 0, 0); // 2024 is leap year

        let next_due =
            calculate_next_payment_due(jan_30_2024, &PaymentFrequency::Monthly, feb_29_2024)
                .unwrap();

        // NOTE: A consequence of this is that every year, the day will be capped to 28th once it
        // goes from january -> february!
        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 3);
        assert_eq!(next_dt.day(), 29);

        // Test January 31st -> February (non-leap year)
        let jan_31_2023 = create_timestamp(2023, 1, 31, 12, 0, 0);
        let mar_1_2023 = create_timestamp(2023, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(jan_31_2023, &PaymentFrequency::Monthly, mar_1_2023)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2023);
        assert_eq!(next_dt.month(), 3);
        // NOTE: we see the above mentioned capping in action here!
        assert_eq!(next_dt.day(), 28);

        // Test December 31st -> January next year
        let dec_31_2023 = create_timestamp(2023, 12, 31, 12, 0, 0);
        let jan_15_2024 = create_timestamp(2024, 1, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(dec_31_2023, &PaymentFrequency::Monthly, jan_15_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 1);
        assert_eq!(next_dt.day(), 31);

        // Test February 28th (non-leap year) -> March
        let feb_28_2023 = create_timestamp(2023, 2, 28, 12, 0, 0);
        let mar_15_2023 = create_timestamp(2023, 3, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_28_2023, &PaymentFrequency::Monthly, mar_15_2023)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2023);
        assert_eq!(next_dt.month(), 3);
        assert_eq!(next_dt.day(), 28);

        // Test February 29th (leap year) -> March
        let feb_29_2024 = create_timestamp(2024, 2, 29, 12, 0, 0);
        let mar_15_2024 = create_timestamp(2024, 3, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_29_2024, &PaymentFrequency::Monthly, mar_15_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 3);
        // Since current timestamp is Mar 15, next due should be Apr 29 (one month after Mar 29)
        assert_eq!(next_dt.day(), 29);

        // Test multiple monthly increments
        let jan_15_2024 = create_timestamp(2024, 1, 15, 12, 0, 0);
        let jun_15_2024 = create_timestamp(2024, 6, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(jan_15_2024, &PaymentFrequency::Monthly, jun_15_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 7);
        // Since current timestamp is Jun 15, next due should be Jul 15 (one month after Jun 15)
        assert_eq!(next_dt.day(), 15);
    }

    #[test]
    fn test_calculate_next_payment_due_annual_edge_cases() {
        // Test leap year (2024) -> non-leap year (2025)
        let feb_29_2024 = create_timestamp(2024, 2, 29, 12, 0, 0);
        let mar_1_2025 = create_timestamp(2025, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_29_2024, &PaymentFrequency::Annually, mar_1_2025)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2026);
        assert_eq!(next_dt.month(), 2);
        // Since current timestamp is Mar 1, 2025, next due should be Feb 28, 2026 (one year after Feb 28, 2025)
        assert_eq!(next_dt.day(), 28);

        // Test non-leap year -> leap year
        let feb_28_2023 = create_timestamp(2023, 2, 28, 12, 0, 0);
        let mar_1_2024 = create_timestamp(2024, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_28_2023, &PaymentFrequency::Annually, mar_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2025);
        assert_eq!(next_dt.month(), 2);
        // Since current timestamp is Mar 1, 2024, next due should be Feb 28, 2025 (one year after Feb 28, 2024)
        assert_eq!(next_dt.day(), 28);

        // Test December 31st -> December 31st next year
        let dec_31_2023 = create_timestamp(2023, 12, 31, 12, 0, 0);
        let jan_15_2025 = create_timestamp(2025, 1, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(dec_31_2023, &PaymentFrequency::Annually, jan_15_2025)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2025);
        assert_eq!(next_dt.month(), 12);
        // Since current timestamp is Jan 15, 2025, next due should be Dec 31, 2025 (one year after Dec 31, 2024)
        assert_eq!(next_dt.day(), 31);

        // Test February 29th across multiple leap years
        let feb_29_2020 = create_timestamp(2020, 2, 29, 12, 0, 0);
        let mar_1_2024 = create_timestamp(2024, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_29_2020, &PaymentFrequency::Annually, mar_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2025);
        assert_eq!(next_dt.month(), 2);
        // Since current timestamp is Mar 1, 2024, next due should be Feb 28, 2025 (one year after Feb 29, 2024)
        assert_eq!(next_dt.day(), 28);

        // Test March 1st (day after leap day) -> March 1st
        let mar_1_2020 = create_timestamp(2020, 3, 1, 12, 0, 0);
        let apr_1_2024 = create_timestamp(2024, 4, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(mar_1_2020, &PaymentFrequency::Annually, apr_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2025);
        assert_eq!(next_dt.month(), 3);
        // Since current timestamp is Apr 1, 2024, next due should be Mar 1, 2025 (one year after Mar 1, 2024)
        assert_eq!(next_dt.day(), 1);

        // Test multiple year increments
        let jan_1_2020 = create_timestamp(2020, 1, 1, 12, 0, 0);
        let jan_1_2025 = create_timestamp(2025, 1, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(jan_1_2020, &PaymentFrequency::Annually, jan_1_2025)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2026);
        assert_eq!(next_dt.month(), 1);
        // Since current timestamp is Jan 1, 2025, next due should be Jan 1, 2026 (one year after Jan 1, 2025)
        assert_eq!(next_dt.day(), 1);
    }

    #[test]
    fn test_calculate_next_payment_due_quarterly_edge_cases() {
        // Test quarterly with month boundaries
        let jan_31_2024 = create_timestamp(2024, 1, 31, 12, 0, 0);
        let may_1_2024 = create_timestamp(2024, 5, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(jan_31_2024, &PaymentFrequency::Quarterly, may_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 7);
        // Jan 31 + 3 months = Apr 30, but since Apr 30 <= current timestamp (May 1),
        // we add another 3 months: Apr 30 + 3 months = Jul 30
        assert_eq!(next_dt.day(), 30);

        // Test quarterly across leap year
        let nov_30_2023 = create_timestamp(2023, 11, 30, 12, 0, 0);
        let mar_1_2024 = create_timestamp(2024, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(nov_30_2023, &PaymentFrequency::Quarterly, mar_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 5);
        assert_eq!(next_dt.day(), 29);
    }

    #[test]
    fn test_calculate_next_payment_due_semi_annually_edge_cases() {
        // Test semi-annually with month boundaries
        let aug_31_2023 = create_timestamp(2023, 8, 31, 12, 0, 0);
        let mar_1_2024 = create_timestamp(2024, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(aug_31_2023, &PaymentFrequency::SemiAnnually, mar_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 8);
        // Aug 31 + 6 months = Feb 29 (leap year), but since Feb 29 <= current timestamp (Mar 1),
        // we add another 6 months: Feb 29 + 6 months = Aug 29
        assert_eq!(next_dt.day(), 29);

        // Test semi-annually across year boundary
        let dec_31_2023 = create_timestamp(2023, 12, 31, 12, 0, 0);
        let jul_1_2024 = create_timestamp(2024, 7, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(dec_31_2023, &PaymentFrequency::SemiAnnually, jul_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 12);
        // Since current timestamp is Jul 1, next due should be Dec 31 (6 months after Jun 30)
        assert_eq!(next_dt.day(), 30);
    }

    #[test]
    fn test_calculate_next_payment_due_time_preservation() {
        // Test that time of day is preserved across all frequencies
        let original_time = create_timestamp(2024, 1, 15, 14, 30, 45); // 14:30:45

        // Test Monthly
        let monthly_due = calculate_next_payment_due(
            original_time,
            &PaymentFrequency::Monthly,
            create_timestamp(2024, 2, 15, 15, 0, 0),
        )
        .unwrap();

        let monthly_dt = timestamp_to_datetime(monthly_due);
        assert_eq!(monthly_dt.hour(), 14);
        assert_eq!(monthly_dt.minute(), 30);
        assert_eq!(monthly_dt.second(), 45);

        // Test Annually
        let annual_due = calculate_next_payment_due(
            original_time,
            &PaymentFrequency::Annually,
            create_timestamp(2025, 1, 15, 15, 0, 0),
        )
        .unwrap();

        let annual_dt = timestamp_to_datetime(annual_due);
        assert_eq!(annual_dt.hour(), 14);
        assert_eq!(annual_dt.minute(), 30);
        assert_eq!(annual_dt.second(), 45);

        // Test Quarterly
        let quarterly_due = calculate_next_payment_due(
            original_time,
            &PaymentFrequency::Quarterly,
            create_timestamp(2024, 4, 15, 15, 0, 0),
        )
        .unwrap();

        let quarterly_dt = timestamp_to_datetime(quarterly_due);
        assert_eq!(quarterly_dt.hour(), 14);
        assert_eq!(quarterly_dt.minute(), 30);
        assert_eq!(quarterly_dt.second(), 45);
    }

    #[test]
    fn test_calculate_next_payment_due_multiple_iterations() {
        // Test that the while loop correctly handles multiple iterations
        let start_time = create_timestamp(2024, 1, 15, 12, 0, 0);
        let far_future = create_timestamp(2024, 12, 15, 12, 0, 0);

        // Monthly should handle multiple iterations
        let monthly_due =
            calculate_next_payment_due(start_time, &PaymentFrequency::Monthly, far_future).unwrap();

        let monthly_dt = timestamp_to_datetime(monthly_due);
        assert_eq!(monthly_dt.year(), 2025);
        assert_eq!(monthly_dt.month(), 1);
        // Since current timestamp is Dec 15, next due should be Jan 15, 2025 (one month after Dec 15, 2024)
        assert_eq!(monthly_dt.day(), 15);

        // Annually should handle multiple iterations
        let annual_due = calculate_next_payment_due(
            start_time,
            &PaymentFrequency::Annually,
            create_timestamp(2026, 1, 15, 12, 0, 0),
        )
        .unwrap();

        let annual_dt = timestamp_to_datetime(annual_due);
        assert_eq!(annual_dt.year(), 2027);
        assert_eq!(annual_dt.month(), 1);
        // Since current timestamp is Jan 15, 2026, next due should be Jan 15, 2027 (one year after Jan 15, 2026)
        assert_eq!(annual_dt.day(), 15);
    }

    #[test]
    fn test_add_months_edge_cases() {
        // Test adding months that cross multiple years
        let dec_2023 = create_timestamp(2023, 12, 15, 12, 0, 0);
        let result = add_months(dec_2023, 24).unwrap(); // +24 months = +2 years
        let result_dt = timestamp_to_datetime(result);
        assert_eq!(result_dt.year(), 2025);
        assert_eq!(result_dt.month(), 12);
        assert_eq!(result_dt.day(), 15);

        // Test adding negative months (should work with underflow)
        let jan_2024 = create_timestamp(2024, 1, 15, 12, 0, 0);
        let result = add_months(jan_2024, -12).unwrap(); // -12 months = -1 year
        let result_dt = timestamp_to_datetime(result);
        assert_eq!(result_dt.year(), 2023);
        assert_eq!(result_dt.month(), 1);
        assert_eq!(result_dt.day(), 15);
    }

    #[test]
    fn test_is_leap_year_comprehensive() {
        // Test known leap years
        assert!(is_leap_year(2020));
        assert!(is_leap_year(2024));
        assert!(is_leap_year(2000)); // Divisible by 400

        // Test known non-leap years
        assert!(!is_leap_year(2023));
        assert!(!is_leap_year(2025));
        assert!(!is_leap_year(1900)); // Divisible by 100 but not 400
        assert!(!is_leap_year(2100)); // Divisible by 100 but not 400
    }

    #[test]
    fn test_get_days_in_month_comprehensive() {
        // Test all months in a non-leap year
        assert_eq!(get_days_in_month(2023, 1), 31);
        assert_eq!(get_days_in_month(2023, 2), 28);
        assert_eq!(get_days_in_month(2023, 3), 31);
        assert_eq!(get_days_in_month(2023, 4), 30);
        assert_eq!(get_days_in_month(2023, 5), 31);
        assert_eq!(get_days_in_month(2023, 6), 30);
        assert_eq!(get_days_in_month(2023, 7), 31);
        assert_eq!(get_days_in_month(2023, 8), 31);
        assert_eq!(get_days_in_month(2023, 9), 30);
        assert_eq!(get_days_in_month(2023, 10), 31);
        assert_eq!(get_days_in_month(2023, 11), 30);
        assert_eq!(get_days_in_month(2023, 12), 31);

        // Test February in leap year
        assert_eq!(get_days_in_month(2024, 2), 29);
        assert_eq!(get_days_in_month(2020, 2), 29);
        assert_eq!(get_days_in_month(2000, 2), 29);
    }
}

// ──────────────────────────────────────────────────────────────────
// Differential property tests: prove `add_months` / `calculate_next_payment_due`
// match the `chrono` oracle over the realistic subscription window, and that
// `skip_months` respects the MAX_MONTHLY_ITERATIONS DoS guard. Positive
// months only — the production path. Negative months are exercised by the
// unit test above and marked dead-in-prod at the branch site.
// ──────────────────────────────────────────────────────────────────
#[cfg(test)]
mod proptests {
    use super::*;
    use crate::state::PaymentFrequency;
    use chrono::{Months, TimeZone, Utc};
    use proptest::prelude::*;

    // Production range: ts >= 0 (Solana `Clock::get().unix_timestamp` is
    // always positive, and `next_payment_due` is only ever seeded from `now`
    // then advanced via `add_months`). Our `add_months` decomposes ts via
    // `ts / 86400` and `ts % 86400`; for ts < 0 the remainder takes the
    // dividend's sign (Rust), so seconds_in_day goes negative and the
    // reassembled date diverges from chrono by up to a day. That path is
    // unreachable in production and explicitly out of scope for this proof.
    // Upper bound ~year 2400: covers century/leap-year edges (2000/2024/
    // 2100/2400) and is well inside both our i32-cast guard and chrono's
    // DateTime range.
    const TS_MIN: i64 = 0;
    const TS_MAX: i64 = 13_560_000_000;

    /// The four calendar-month PaymentFrequency variants paired with their
    /// step size in months. Daily/Weekly/Custom are O(1) fixed-interval and
    /// not differential-tested against chrono (they have no calendar math).
    fn calendar_freq() -> impl Strategy<Value = (PaymentFrequency, u32)> {
        prop::sample::select(vec![
            (PaymentFrequency::Monthly, 1u32),
            (PaymentFrequency::Quarterly, 3),
            (PaymentFrequency::SemiAnnually, 6),
            (PaymentFrequency::Annually, 12),
        ])
    }

    // add_months(ts, n) for positive n must equal chrono's
    // checked_add_months, which clamps the day to the new month's last
    // day (the M-04 semantic: Jan 31 + 1 = Feb 28/29).
    proptest! {
        #[test]
        fn add_months_matches_chrono_for_positive_n(
            ts in TS_MIN..TS_MAX,
            n in 1u32..=12u32,
        ) {
            let Some(dt) = Utc.timestamp_opt(ts, 0).single() else {
                return Ok(()); // chrono can't represent — skip, defensive.
            };
            let expected = dt
                .checked_add_months(Months::new(n))
                .expect("chrono overflow — should not happen in range");

            let actual = add_months(ts, n as i32).expect("our add_months overflowed in range");

            prop_assert_eq!(
                actual,
                expected.timestamp(),
                "ts={}, n={}: our add_months disagrees with chrono",
                ts,
                n
            );
        }
    }

    // For every calendar-variant PaymentFrequency, `calculate_next_payment_due`
    // (a) returns a timestamp strictly after `now` (monotonic advance), and
    // (b) lands exactly on the date chrono produces by repeatedly adding
    // `step` months from `due` until past `now` — i.e. our iterative clamp-
    // at-each-step matches chrono's per-call clamp. Gaps that would need more
    // than MAX_MONTHLY_ITERATIONS steps are excluded here (the cap is
    // exercised by `skip_months_respects_max_iterations_cap` below).
    proptest! {
        #[test]
        fn next_due_monotonic_and_lands_on_chrono_date(
            due in TS_MIN..TS_MAX,
            gap_secs in 0i64..(200 * 365 * 86_400), // `now` is 0..~200y after `due`
            freq_and_step in calendar_freq(),
        ) {
            let (freq, step) = freq_and_step;
            let now = due.saturating_add(gap_secs).min(TS_MAX);
            let Some(due_dt) = Utc.timestamp_opt(due, 0).single() else {
                return Ok(()); // chrono can't represent — skip, defensive.
            };

            // Mirror skip_months's iterative add (clamp-at-each-step) with
            // chrono. Bail if it'd need more than MAX_MONTHLY_ITERATIONS steps
            // — that's the cap test's domain, not this one's.
            let mut dt = due_dt;
            let mut steps = 0u32;
            while dt.timestamp() <= now {
                steps = steps.saturating_add(1);
                if steps > MAX_MONTHLY_ITERATIONS {
                    return Ok(()); // over the cap — out of scope here.
                }
                dt = dt.checked_add_months(Months::new(step)).unwrap();
            }

            let result = calculate_next_payment_due(due, &freq, now)
                .expect("gap within cap must not overflow");
            prop_assert!(
                result > now,
                "result ({}) must advance strictly past now ({})",
                result,
                now
            );
            prop_assert_eq!(
                result,
                dt.timestamp(),
                "due={}, now={}, step={}: result not on chrono-derived date",
                due,
                now,
                step
            );
        }
    }

    // `skip_months` bails with `ArithmeticOverflow` when more than
    // MAX_MONTHLY_ITERATIONS (1200) monthly steps would be needed, and
    // succeeds otherwise. Uses day=15 (never clamps) so iteration count is
    // exactly the calendar-month gap.
    proptest! {
        #[test]
        fn skip_months_respects_max_iterations_cap(
            start_year in 1970i32..=2100,
            months_back in 1100u32..=1300, // straddle the 1200 cap
        ) {
            let due_dt = Utc
                .with_ymd_and_hms(start_year, 1, 15, 0, 0, 0)
                .single()
                .unwrap();
            let now_dt = due_dt
                .checked_add_months(Months::new(months_back))
                .unwrap();
            let due = due_dt.timestamp();
            let now = now_dt.timestamp();

            let res = calculate_next_payment_due(due, &PaymentFrequency::Monthly, now);
            // A gap of K months needs K+1 adds to escape (the last add crosses
            // from <=now to >now). The loop allows at most MAX adds, so gaps of
            // MAX months or more (K >= MAX) fail; gaps under MAX succeed.
            if months_back >= MAX_MONTHLY_ITERATIONS {
                prop_assert!(
                    res.is_err(),
                    "gap of {} months must bail (>= {} adds needed, cap {})",
                    months_back,
                    months_back + 1,
                    MAX_MONTHLY_ITERATIONS
                );
            } else {
                let result = res.expect("gap under cap must succeed");
                prop_assert!(result > now);
            }
        }
    }
}
