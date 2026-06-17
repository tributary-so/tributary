use crate::state::{PaymentGateway, PaymentPolicy};
use anchor_lang::prelude::*;

/// Result type for policy operations containing payment amount and state updates
pub struct PolicyExecutionResult {
    pub payment_amount: u64,
    pub should_pause: bool,
}

/// Trait for handling policy-specific payment execution logic
pub trait PolicyStrategy: std::fmt::Debug {
    /// Validate payment timing and conditions for this policy type
    fn validate_payment_timing(
        &self,
        payment_policy: &PaymentPolicy,
        current_time: i64,
        signer: &Pubkey,
        user_payment_owner: &Pubkey,
        gateway: &PaymentGateway,
    ) -> Result<()>;

    /// Calculate the payment amount for this execution
    fn calculate_payment_amount(
        &self,
        payment_policy: &PaymentPolicy,
        provided_amount: Option<u64>,
    ) -> Result<u64>;

    /// Update policy state after successful payment execution
    fn update_policy_state(
        &mut self,
        payment_policy: &mut PaymentPolicy,
        current_time: i64,
    ) -> Result<()>;

    /// Determine if policy should be paused based on current state
    fn should_pause_policy(&self, payment_policy: &PaymentPolicy) -> bool;

    /// Execute the complete policy-specific logic and return execution result
    fn execute(
        &mut self,
        payment_policy: &mut PaymentPolicy,
        provided_amount: Option<u64>,
        current_time: i64,
        signer: &Pubkey,
        user_payment_owner: &Pubkey,
        gateway: &PaymentGateway,
    ) -> Result<PolicyExecutionResult> {
        // Validate timing first
        self.validate_payment_timing(
            payment_policy,
            current_time,
            signer,
            user_payment_owner,
            gateway,
        )?;

        // Calculate payment amount
        let payment_amount = self.calculate_payment_amount(payment_policy, provided_amount)?;

        // Update policy state
        self.update_policy_state(payment_policy, current_time)?;

        // Increment the payment counter BEFORE evaluating should_pause_policy so
        // ceilings (e.g. Subscription::max_renewals) are honored exactly.
        payment_policy.payment_count = payment_policy
            .payment_count
            .checked_add(1)
            .ok_or(crate::error::TributaryError::ArithmeticOverflow)?;

        // Determine if policy should pause
        let should_pause = self.should_pause_policy(payment_policy);

        Ok(PolicyExecutionResult {
            payment_amount,
            should_pause,
        })
    }
}
