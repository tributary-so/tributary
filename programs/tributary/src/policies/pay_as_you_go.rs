use crate::{
    error::TributaryError,
    policies::traits::PolicyStrategy,
    state::{PaymentPolicy, PolicyType},
};
use anchor_lang::prelude::*;

/// Validate pay-as-you-go policy parameters
pub fn validate_payg_policy(
    max_amount_per_period: u64,
    max_chunk_amount: u64,
    period_length_seconds: u64,
) -> Result<()> {
    // Validate max_amount_per_period is greater than zero
    require!(max_amount_per_period > 0, TributaryError::InvalidAmount);

    // Validate max_chunk_amount is greater than zero
    require!(max_chunk_amount > 0, TributaryError::InvalidAmount);

    // Validate max_chunk_amount is not greater than max_amount_per_period
    require!(
        max_chunk_amount <= max_amount_per_period,
        TributaryError::InvalidAmount
    );

    // Validate period_length_seconds is greater than zero
    require!(period_length_seconds > 0, TributaryError::InvalidInterval);

    Ok(())
}

/// Strategy for handling pay-as-you-go payment policies
#[derive(Debug)]
pub struct PayAsYouGoStrategy;

impl PolicyStrategy for PayAsYouGoStrategy {
    fn validate_payment_timing(
        &self,
        _payment_policy: &PaymentPolicy,
        _current_time: i64,
    ) -> Result<()> {
        // Pay-as-you-go doesn't have timing restrictions - always allowed
        Ok(())
    }

    fn calculate_payment_amount(
        &self,
        payment_policy: &PaymentPolicy,
        provided_amount: Option<u64>,
    ) -> Result<u64> {
        match &payment_policy.policy_type {
            PolicyType::PayAsYouGo {
                max_chunk_amount, ..
            } => {
                // For pay-as-you-go, payment amount is specified by gateway/provider
                // or defaults to max_chunk_amount
                Ok(provided_amount.unwrap_or(*max_chunk_amount))
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }

    fn update_policy_state(
        &mut self,
        payment_policy: &mut PaymentPolicy,
        current_time: i64,
    ) -> Result<()> {
        match &mut payment_policy.policy_type {
            PolicyType::PayAsYouGo {
                period_length_seconds,
                current_period_start,
                current_period_total,
                ..
            } => {
                // Check if we need to reset period
                let period_end = *current_period_start + *period_length_seconds as i64;
                if current_time >= period_end {
                    // Reset period
                    *current_period_start = current_time;
                    *current_period_total = 0;
                }
                Ok(())
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }

    fn should_pause_policy(&self, _payment_policy: &PaymentPolicy) -> bool {
        // Pay-as-you-go policies don't pause based on payment count
        // They continue until manually paused or period limits are reached
        false
    }
}

impl PayAsYouGoStrategy {
    /// Validate pay-as-you-go specific constraints before payment execution
    pub fn validate_payment_constraints(
        &self,
        payment_policy: &PaymentPolicy,
        payment_amount: u64,
        current_time: i64,
    ) -> Result<()> {
        match &payment_policy.policy_type {
            PolicyType::PayAsYouGo {
                max_amount_per_period,
                max_chunk_amount,
                period_length_seconds,
                current_period_start,
                current_period_total,
                ..
            } => {
                // Check if we need to reset period
                let period_end = *current_period_start + *period_length_seconds as i64;
                let current_period_total = if current_time >= period_end {
                    // Period has expired, reset to 0 for this payment
                    0
                } else {
                    *current_period_total
                };

                // Validate chunk amount doesn't exceed max_chunk_amount
                require!(
                    payment_amount <= *max_chunk_amount,
                    TributaryError::InvalidAmount
                );

                // Validate period limit won't be exceeded
                require!(
                    current_period_total + payment_amount <= *max_amount_per_period,
                    TributaryError::InvalidAmount
                );

                Ok(())
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }

    /// Update period total after successful payment
    pub fn update_period_total(
        &mut self,
        payment_policy: &mut PaymentPolicy,
        payment_amount: u64,
        current_time: i64,
    ) -> Result<()> {
        match &mut payment_policy.policy_type {
            PolicyType::PayAsYouGo {
                period_length_seconds,
                current_period_start,
                current_period_total,
                ..
            } => {
                // Check if we need to reset period
                let period_end = *current_period_start + *period_length_seconds as i64;
                if current_time >= period_end {
                    // Reset period
                    *current_period_start = current_time;
                    *current_period_total = payment_amount;
                } else {
                    // Update period total
                    *current_period_total += payment_amount;
                }
                Ok(())
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }
}
