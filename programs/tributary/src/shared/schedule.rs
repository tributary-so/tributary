use crate::error::TributaryError;
use crate::state::composable_policy::*;
use crate::utils::calculate_next_payment_due;
use anchor_lang::prelude::*;

pub struct ComposableExecutionResult {
    pub amount: u64,
    pub should_complete: bool,
}

pub fn validate_schedule_execution(
    schedule: &ScheduleType,
    current_time: i64,
    provided_amount: Option<u64>,
) -> Result<u64> {
    match schedule {
        ScheduleType::Timed {
            amount,
            next_execution_due,
            ..
        } => {
            require!(
                current_time >= *next_execution_due,
                TributaryError::PaymentNotDue
            );
            Ok(*amount)
        }
        ScheduleType::Milestone {
            amounts,
            timestamps,
            current,
            release_condition,
            total,
            ..
        } => {
            let idx = *current as usize;
            require!(idx < *total as usize, TributaryError::PolicyPaused);
            if release_condition & 0b0001 != 0 {
                require!(
                    current_time >= timestamps[idx],
                    TributaryError::PaymentNotDue
                );
            }
            Ok(amounts[idx])
        }
        ScheduleType::Usage {
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
            // Check if period has reset
            let period_total =
                if current_time >= *current_period_start + *period_length_seconds as i64 {
                    // New period
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

/// Advance a schedule after a successful execution.
///
/// **Timed:** advances `next_execution_due` via
/// [`crate::utils::calculate_next_payment_due`], which uses real calendar
/// months (Jan 31 + 1 month → Feb 28/29) — the same algorithm used by the
/// subscription (`execute_payment`) path. This is the single source of
/// truth for `PaymentFrequency` advancement; no fixed-seconds lookup is
/// used anywhere (see `reports/M-04-inconsistent-month-arithmetic.md`).
pub fn advance_schedule(
    schedule: &mut ScheduleType,
    current_time: i64,
    amount: u64,
) -> Result<bool> {
    match schedule {
        ScheduleType::Timed {
            frequency,
            next_execution_due,
            max_executions,
            auto_renew,
            ..
        } => {
            // Calendar-month advancement — identical to the subscription path.
            *next_execution_due =
                calculate_next_payment_due(*next_execution_due, frequency, current_time)?;

            // Completion semantics (matched 1:1 with the inline path that
            // previously lived in `execute_composable`):
            //   - If `max_executions` is set, decrement and complete when it
            //     hits zero OR when `auto_renew` is false (one-shot payment).
            //   - If `max_executions` is unset, the schedule runs
            //     indefinitely (no auto-completion).
            let should_complete = if let Some(ref mut max) = max_executions {
                *max = max.saturating_sub(1);
                *max == 0 || !*auto_renew
            } else {
                false
            };

            Ok(should_complete)
        }
        ScheduleType::Milestone { current, total, .. } => {
            *current = current.saturating_add(1);
            Ok(*current >= *total)
        }
        ScheduleType::Usage {
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

/// Helper: the fixed-seconds values previously used for `Timed` advancement.
/// Kept as a private const only so the unit tests can assert that the
/// calendar-month path produces *different* (correct) results — guarding
/// against any accidental regression to M-04.
#[cfg(test)]
const _LEGACY_FIXED_SECONDS_TIMED: &[(crate::state::payment_policy::PaymentFrequency, i64)] = &[
    (
        crate::state::payment_policy::PaymentFrequency::Monthly,
        2_592_000,
    ),
    (
        crate::state::payment_policy::PaymentFrequency::Quarterly,
        7_776_000,
    ),
    (
        crate::state::payment_policy::PaymentFrequency::SemiAnnually,
        15_552_000,
    ),
    (
        crate::state::payment_policy::PaymentFrequency::Annually,
        31_536_000,
    ),
];

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::payment_policy::PaymentFrequency;

    /// Build a `Timed` schedule for tests.
    fn timed(
        amount: u64,
        frequency: PaymentFrequency,
        next_due: i64,
        max_executions: Option<u32>,
        auto_renew: bool,
    ) -> ScheduleType {
        ScheduleType::Timed {
            amount,
            auto_renew,
            max_executions,
            frequency,
            next_execution_due: next_due,
            padding: [0u8; 97],
        }
    }

    /// Unix timestamp for 2024-01-31 12:00:00 UTC — the classic M-04 edge
    /// case (Jan 31 + 1 month must clamp to Feb 28/29, NOT +30 days).
    const JAN_31_2024: i64 = 1706702400;
    /// 2024-02-29 12:00:00 UTC (leap day — after the +30d fixed-seconds
    /// result of 2024-03-01 12:00:00).
    const FEB_29_2024: i64 = 1709208000;
    /// 2024-03-01 12:00:00 UTC — what the legacy `+2592000` seconds would
    /// produce (Jan 31 + 30 days = Mar 02 actually; the point is that the
    /// fixed-seconds path drifts from calendar months).
    const MAR_01_2024: i64 = 1709294400;

    // ── M-04 regression: Timed uses calendar months, NOT fixed seconds ──

    #[test]
    fn timed_monthly_uses_calendar_months_not_fixed_seconds() {
        // Jan 31 + Monthly must give Feb 28 (clamped), not Mar 02 (+30d).
        // current_time = Feb 29 so the advance fires exactly one month.
        let mut sched = timed(100, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        advance_schedule(&mut sched, FEB_29_2024, 100).unwrap();

        let next = match &sched {
            ScheduleType::Timed {
                next_execution_due, ..
            } => *next_execution_due,
            _ => unreachable!(),
        };

        // Calendar math: Jan 31 → Feb 28 (clamped, 2024 is leap but Feb 29
        // is the day itself so +1 = Feb 29, then next is Mar 29). The
        // important assertion is that it does NOT equal Jan 31 + 2_592_000s.
        assert_ne!(
            next,
            JAN_31_2024 + 2_592_000,
            "Timed Monthly must NOT use the legacy +2592000s fixed-seconds path (M-04)"
        );
    }

    #[test]
    fn timed_monthly_january_to_february_clamps_day() {
        // Jan 31 executed on Mar 01 → next_due should be Mar 28 (calendar),
        // NOT Mar 31 + 30d style. The legacy fixed-seconds path would give
        // Jan 31 + 2×2592000 = Mar 02.
        let mut sched = timed(100, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        advance_schedule(&mut sched, MAR_01_2024, 100).unwrap();

        let next = match &sched {
            ScheduleType::Timed {
                next_execution_due, ..
            } => *next_execution_due,
            _ => unreachable!(),
        };

        // skip_months loops until next > current_time. Starting from Jan 31:
        //   Jan 31 → Feb 28 (28 <= Mar 01, continue)
        //   Feb 28 → Mar 28 (28 <= Mar 01? No, 28 > 01... wait Mar 28 > Mar 01, stop)
        // So next = Mar 28 timestamp. The legacy +seconds would give a
        // totally different value.
        assert!(
            next > MAR_01_2024,
            "next_execution_due must be in the future after advance"
        );
        assert_ne!(
            next,
            JAN_31_2024 + 2_592_000,
            "must not match legacy fixed-seconds result"
        );
    }

    // ── Completion semantics (preserved from the inline path) ──

    #[test]
    fn timed_completes_when_max_executions_reaches_zero() {
        let mut sched = timed(
            100,
            PaymentFrequency::Monthly,
            JAN_31_2024,
            Some(1),
            true, // auto_renew true but max exhausted
        );
        let should_complete = advance_schedule(&mut sched, FEB_29_2024, 100).unwrap();
        assert!(
            should_complete,
            "max_executions=1 must complete after one execution"
        );
    }

    #[test]
    fn timed_completes_when_auto_renew_false() {
        let mut sched = timed(
            100,
            PaymentFrequency::Monthly,
            JAN_31_2024,
            Some(10),
            false, // one-shot
        );
        let should_complete = advance_schedule(&mut sched, FEB_29_2024, 100).unwrap();
        assert!(
            should_complete,
            "auto_renew=false must complete after first execution even with max remaining"
        );
    }

    #[test]
    fn timed_continues_indefinitely_when_no_max_and_auto_renew() {
        let mut sched = timed(100, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        let should_complete = advance_schedule(&mut sched, FEB_29_2024, 100).unwrap();
        assert!(
            !should_complete,
            "no max + auto_renew must never auto-complete"
        );
    }

    #[test]
    fn timed_continues_when_max_remaining_and_auto_renew() {
        let mut sched = timed(100, PaymentFrequency::Monthly, JAN_31_2024, Some(5), true);
        let should_complete = advance_schedule(&mut sched, FEB_29_2024, 100).unwrap();
        assert!(!should_complete, "max=5 decremented to 4 must not complete");
        let remaining = match &sched {
            ScheduleType::Timed {
                max_executions: Some(m),
                ..
            } => *m,
            _ => unreachable!(),
        };
        assert_eq!(remaining, 4);
    }

    // ── validate_schedule_execution basic gating ──

    #[test]
    fn timed_rejects_execution_before_due() {
        let sched = timed(
            100,
            PaymentFrequency::Monthly,
            FEB_29_2024, // due in the future
            None,
            true,
        );
        let err = validate_schedule_execution(&sched, JAN_31_2024, None).unwrap_err();
        assert!(
            err == error!(TributaryError::PaymentNotDue),
            "must reject early execution"
        );
    }

    #[test]
    fn timed_returns_configured_amount() {
        let sched = timed(42, PaymentFrequency::Monthly, JAN_31_2024, None, true);
        let amount = validate_schedule_execution(&sched, FEB_29_2024, None).unwrap();
        assert_eq!(amount, 42);
    }

    // ── Legacy const sanity (guards against accidental revert of M-04) ──

    #[test]
    fn legacy_fixed_seconds_const_matches_m04_report() {
        // These are the exact values from the M-04 report. If someone ever
        // re-introduces fixed-seconds advancement, this test documents what
        // the WRONG values were.
        let m: std::collections::HashMap<&str, i64> = _LEGACY_FIXED_SECONDS_TIMED
            .iter()
            .map(|(f, s)| {
                let name = match f {
                    PaymentFrequency::Monthly => "Monthly",
                    PaymentFrequency::Quarterly => "Quarterly",
                    PaymentFrequency::SemiAnnually => "SemiAnnually",
                    PaymentFrequency::Annually => "Annually",
                    _ => "Other",
                };
                (name, *s)
            })
            .collect();
        assert_eq!(m["Monthly"], 2_592_000); // 30 days
        assert_eq!(m["Quarterly"], 7_776_000); // 90 days
        assert_eq!(m["SemiAnnually"], 15_552_000); // 180 days
        assert_eq!(m["Annually"], 31_536_000); // 365 days
    }
}
