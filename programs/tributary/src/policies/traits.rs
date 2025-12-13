use crate::state::PaymentPolicy;
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
    ) -> Result<PolicyExecutionResult> {
        // Validate timing first
        self.validate_payment_timing(payment_policy, current_time)?;

        // Calculate payment amount
        let payment_amount = self.calculate_payment_amount(payment_policy, provided_amount)?;

        // Update policy state
        self.update_policy_state(payment_policy, current_time)?;

        // Determine if policy should pause
        let should_pause = self.should_pause_policy(payment_policy);

        Ok(PolicyExecutionResult {
            payment_amount,
            should_pause,
        })
    }
}
