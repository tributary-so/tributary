use crate::{
    error::TributaryError,
    policies::traits::PolicyStrategy,
    state::{PaymentGateway, PaymentPolicy, PolicyType},
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

    require!(period_length_seconds > 0, TributaryError::InvalidInterval);

    require!(
        period_length_seconds <= i64::MAX as u64,
        TributaryError::InvalidInterval
    );

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
        _signer: &Pubkey,
        _user_payment_owner: &Pubkey,
        _gateway: &PaymentGateway,
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
        _payment_policy: &mut PaymentPolicy,
        _current_time: i64,
    ) -> Result<()> {
        // Period management handled entirely by validate_payment_constraints
        // + update_period_total to avoid duplicated reset logic.
        Ok(())
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
                require!(
                    *period_length_seconds <= i64::MAX as u64,
                    TributaryError::InvalidInterval
                );

                let period_end = current_period_start
                    .checked_add(*period_length_seconds as i64)
                    .ok_or(TributaryError::ArithmeticOverflow)?;
                let current_period_total = if current_time >= period_end {
                    0
                } else {
                    *current_period_total
                };

                require!(
                    payment_amount <= *max_chunk_amount,
                    TributaryError::InvalidAmount
                );

                let new_total = current_period_total
                    .checked_add(payment_amount)
                    .ok_or(TributaryError::ArithmeticOverflow)?;
                require!(
                    new_total <= *max_amount_per_period,
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
                require!(
                    *period_length_seconds <= i64::MAX as u64,
                    TributaryError::InvalidInterval
                );

                let period_end = current_period_start
                    .checked_add(*period_length_seconds as i64)
                    .ok_or(TributaryError::ArithmeticOverflow)?;
                if current_time >= period_end {
                    *current_period_start = current_time;
                    *current_period_total = payment_amount;
                } else {
                    *current_period_total = current_period_total
                        .checked_add(payment_amount)
                        .ok_or(TributaryError::ArithmeticOverflow)?;
                }
                Ok(())
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }
}
