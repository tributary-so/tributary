//! Shared policy advancement + execution-validation helpers.
//!
//! Both `PaymentPolicy` (released) and `ComposablePolicy` (unreleased) embed
//! the same [`PolicyType`] enum. These functions are the single source of
//! truth for *when* a policy may execute and *how* its schedule advances
//! after a successful execution.
//!
//! ## Calendar-month arithmetic
//!
//! [`advance_policy`] for `PolicyType::Subscription` routes through
//! [`crate::utils::calculate_next_payment_due`], which uses real calendar
//! months (Jan 31 + 1 month → Feb 28/29) — the same algorithm used by both
//! the subscription and composable Timed paths. No fixed-seconds lookup is
//! used anywhere (see `reports/M-04-inconsistent-month-arithmetic.md`).

use crate::error::TributaryError;
use crate::state::PolicyType;
use crate::utils::calculate_next_payment_due;
use anchor_lang::prelude::*;

/// Validate that a policy may execute at `current_time` and return the
/// base amount to transfer.
///
/// * **Subscription** — checks `current_time >= next_payment_due`; returns
///   the configured `amount`.
/// * **Milestone** — checks `current_milestone < total_milestones`; if the
///   `release_condition` bit-0 flag is set, also enforces the milestone's
///   due-date; returns `milestone_amounts[current_milestone]`.
/// * **PayAsYouGo** — requires `provided_amount` (the chunk); validates
///   `0 < chunk <= max_chunk_amount` and that the projected period total
///   stays within `max_amount_per_period`; returns the chunk.
pub fn validate_policy_execution(
    policy_type: &PolicyType,
    current_time: i64,
    provided_amount: Option<u64>,
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
        let err = validate_policy_execution(&pt, JAN_31_2024, None).unwrap_err();
        assert!(err == error!(TributaryError::PaymentNotDue));
    }

    #[test]
    fn subscription_returns_configured_amount() {
        let pt = subscription(42, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        let amount = validate_policy_execution(&pt, FEB_29_2024, None).unwrap();
        assert_eq!(amount, 42);
    }
}
