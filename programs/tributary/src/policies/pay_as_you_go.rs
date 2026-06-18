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
                // or defaults to max_chunk_amount.
                //
                // L-01: reject explicit zero. `validate_payg_policy` guarantees
                // `max_chunk_amount > 0` at policy creation, so the default
                // branch is always positive — but a caller-supplied `Some(0)`
                // would otherwise pass through and let `execute_payment` skip
                // every transfer CPI (each gated by `if amount > 0`) while
                // still incrementing `payment_count` and emitting a zero-amount
                // `PaymentRecord` event. See reports/L-01-payg-accepts-zero-amount.md
                // and shared-base §19.
                let amt = provided_amount.unwrap_or(*max_chunk_amount);
                require!(amt > 0, TributaryError::InvalidAmount);
                Ok(amt)
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

                // L-01 defense-in-depth: reject zero before the chunk/period
                // bounds check. `calculate_payment_amount` already rejects
                // `Some(0)`, but a future caller or a serialized malformed
                // account could bypass that path; the runtime constraint must
                // hold regardless. See reports/L-01-payg-accepts-zero-amount.md.
                require!(payment_amount > 0, TributaryError::InvalidAmount);

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::PaymentStatus;
    use anchor_lang::solana_program::pubkey::Pubkey;

    /// Build a `PaymentPolicy` whose `policy_type` is `PayAsYouGo` with
    /// sane test defaults: 1000 max/period, 100 max_chunk, 3600s period,
    /// starting at t=0 with 0 already claimed.
    fn payg_policy(
        max_amount_per_period: u64,
        max_chunk_amount: u64,
        period_length_seconds: u64,
        current_period_start: i64,
        current_period_total: u64,
    ) -> PaymentPolicy {
        PaymentPolicy {
            user_payment: Pubkey::default(),
            recipient: Pubkey::default(),
            gateway: Pubkey::default(),
            policy_type: PolicyType::PayAsYouGo {
                max_amount_per_period,
                max_chunk_amount,
                period_length_seconds,
                current_period_start,
                current_period_total,
                padding: [0u8; 88],
            },
            status: PaymentStatus::Active,
            memo: [0u8; 64],
            total_paid: 0,
            payment_count: 0,
            created_at: 0,
            updated_at: 0,
            policy_id: 0,
            bump: 0,
            rent_payer: Pubkey::default(),
            padding: [0u8; 223],
        }
    }

    /// L-01 regression: `calculate_payment_amount(Some(0))` must be rejected.
    /// Previously, the strategy returned `provided_amount.unwrap_or(max_chunk_amount)`
    /// verbatim, so a caller could pass `Some(0)`, bypass every transfer CPI
    /// (each gated by `if amount > 0`), yet still increment `payment_count`
    /// and emit a `PaymentRecord` event with `amount = 0`.
    ///
    /// See reports/L-01-payg-accepts-zero-amount.md.
    #[test]
    fn calculate_payment_amount_rejects_explicit_zero() {
        let policy = payg_policy(1000, 100, 3600, 0, 0);
        let strategy = PayAsYouGoStrategy;

        let res = strategy.calculate_payment_amount(&policy, Some(0));
        assert!(res.is_err(), "Some(0) must be rejected, got {:?}", res);
    }

    /// L-01 regression: `validate_payment_constraints(0)` must be rejected
    /// as defense-in-depth, even if the caller never goes through
    /// `calculate_payment_amount`.
    #[test]
    fn validate_payment_constraints_rejects_zero() {
        let policy = payg_policy(1000, 100, 3600, 0, 0);
        let strategy = PayAsYouGoStrategy;

        let res = strategy.validate_payment_constraints(&policy, 0, 100);
        assert!(
            res.is_err(),
            "payment_amount = 0 must be rejected, got {:?}",
            res
        );
    }

    /// Sanity: a positive chunk inside the bounds is accepted.
    #[test]
    fn accepts_positive_chunk_within_bounds() {
        let policy = payg_policy(1000, 100, 3600, 0, 0);
        let strategy = PayAsYouGoStrategy;

        let amt = strategy
            .calculate_payment_amount(&policy, Some(50))
            .expect("positive chunk within bounds must be accepted");
        assert_eq!(amt, 50);

        strategy
            .validate_payment_constraints(&policy, 50, 100)
            .expect("positive chunk within bounds must validate");
    }

    /// Sanity: when no chunk is provided, the strategy falls back to
    /// `max_chunk_amount`, which is itself validated to be > 0 at policy
    /// creation (`validate_payg_policy`). This must keep working.
    #[test]
    fn none_provided_defaults_to_max_chunk_amount() {
        let policy = payg_policy(1000, 100, 3600, 0, 0);
        let strategy = PayAsYouGoStrategy;

        let amt = strategy
            .calculate_payment_amount(&policy, None)
            .expect("None must fall back to max_chunk_amount");
        assert_eq!(amt, 100);
    }
}
