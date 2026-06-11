use crate::error::TributaryError;
use crate::state::composable_policy::*;
use crate::state::payment_policy::PaymentFrequency;
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
            let secs = match frequency {
                PaymentFrequency::Daily => 86400,
                PaymentFrequency::Weekly => 604800,
                PaymentFrequency::Monthly => 2592000,
                PaymentFrequency::Quarterly => 7776000,
                PaymentFrequency::SemiAnnually => 15552000,
                PaymentFrequency::Annually => 31536000,
                PaymentFrequency::Custom(secs) => *secs,
            };
            *next_execution_due = next_execution_due
                .checked_add(secs as i64)
                .ok_or(TributaryError::ArithmeticOverflow)?;

            if let Some(ref mut max) = max_executions {
                *max = max.saturating_sub(1);
                if *max == 0 {
                    return Ok(true); // should complete
                }
            }
            if !*auto_renew && max_executions.is_none() {
                return Ok(true);
            }
            Ok(false)
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
