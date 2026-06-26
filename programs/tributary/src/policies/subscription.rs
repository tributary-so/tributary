use crate::{error::TributaryError, state::PaymentFrequency};
use anchor_lang::prelude::*;

/// Validate subscription policy parameters at creation time.
///
/// Execute-time gating (due-date check, `next_payment_due` advancement,
/// `max_renewals` exhaustion) lives in
/// `shared::schedule::{validate_policy_execution, advance_policy}`.
pub fn validate_subscription_policy(
    amount: u64,
    payment_frequency: &PaymentFrequency,
    max_renewals: &Option<u32>,
) -> Result<()> {
    require!(amount > 0, TributaryError::InvalidAmount);

    // Custom intervals must fit i64 (the cast boundary enforced at
    // execute-time in calculate_next_payment_due).
    if let PaymentFrequency::Custom(interval) = payment_frequency {
        require!(*interval > 0, TributaryError::InvalidFrequency);
        require!(
            *interval <= i64::MAX as u64,
            TributaryError::InvalidFrequency
        );
    }

    if let Some(renewals) = max_renewals {
        require!(*renewals > 0, TributaryError::InvalidInterval);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::TributaryError;

    // Regression for tributary-q8x9: Custom(u64) intervals are now fully
    // validated at create-time (both > 0 AND <= i64::MAX), closing the gap
    // where calculate_next_payment_due was the only boundary check.

    #[test]
    fn custom_frequency_rejects_zero() {
        let err =
            validate_subscription_policy(100, &PaymentFrequency::Custom(0), &None).unwrap_err();
        assert!(err == error!(TributaryError::InvalidFrequency));
    }

    #[test]
    fn custom_frequency_rejects_u64_max() {
        let err = validate_subscription_policy(100, &PaymentFrequency::Custom(u64::MAX), &None)
            .unwrap_err();
        assert!(err == error!(TributaryError::InvalidFrequency));
    }

    #[test]
    fn custom_frequency_accepts_valid_interval() {
        assert!(validate_subscription_policy(100, &PaymentFrequency::Custom(86400), &None).is_ok());
    }

    #[test]
    fn predefined_frequency_skips_interval_check() {
        assert!(validate_subscription_policy(100, &PaymentFrequency::Monthly, &None).is_ok());
    }
}
