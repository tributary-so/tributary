use crate::{
    error::TributaryError,
    policies::traits::PolicyStrategy,
    shared::schedule::calculate_next_payment_due,
    state::{PaymentGateway, PaymentPolicy, PolicyType},
};
use anchor_lang::prelude::*;

/// Validate subscription policy parameters
pub fn validate_subscription_policy(
    amount: u64,
    payment_frequency: &crate::state::PaymentFrequency,
    max_renewals: &Option<u32>,
) -> Result<()> {
    // Validate amount is greater than zero
    require!(amount > 0, TributaryError::InvalidAmount);

    // Validate payment frequency
    payment_frequency.validate()?;

    // Validate max_renewals if set (must be greater than 0)
    if let Some(renewals) = max_renewals {
        require!(*renewals > 0, TributaryError::InvalidInterval);
    }

    Ok(())
}

/// Strategy for handling subscription-based payment policies
#[derive(Debug)]
pub struct SubscriptionStrategy;

impl PolicyStrategy for SubscriptionStrategy {
    fn validate_payment_timing(
        &self,
        payment_policy: &PaymentPolicy,
        current_time: i64,
        _signer: &Pubkey,
        _user_payment_owner: &Pubkey,
        _gateway: &PaymentGateway,
    ) -> Result<()> {
        match &payment_policy.policy_type {
            PolicyType::Subscription {
                next_payment_due, ..
            } => {
                require!(
                    current_time >= *next_payment_due,
                    TributaryError::PaymentNotDue
                );
                Ok(())
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }

    fn calculate_payment_amount(
        &self,
        payment_policy: &PaymentPolicy,
        _provided_amount: Option<u64>,
    ) -> Result<u64> {
        match &payment_policy.policy_type {
            PolicyType::Subscription { amount, .. } => Ok(*amount),
            _ => err!(TributaryError::InvalidAmount),
        }
    }

    fn update_policy_state(
        &mut self,
        payment_policy: &mut PaymentPolicy,
        current_time: i64,
    ) -> Result<()> {
        match &mut payment_policy.policy_type {
            PolicyType::Subscription {
                next_payment_due,
                payment_frequency,
                ..
            } => {
                let new_next_due =
                    calculate_next_payment_due(*next_payment_due, payment_frequency, current_time)?;
                *next_payment_due = new_next_due;
                Ok(())
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }

    fn should_pause_policy(&self, payment_policy: &PaymentPolicy) -> bool {
        match &payment_policy.policy_type {
            PolicyType::Subscription { max_renewals, .. } => {
                max_renewals.is_some_and(|max_renewal| payment_policy.payment_count >= max_renewal)
            }
            _ => false,
        }
    }
}
