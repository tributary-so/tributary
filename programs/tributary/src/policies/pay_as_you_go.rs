use crate::error::TributaryError;
use anchor_lang::prelude::*;

/// Validate pay-as-you-go policy parameters at creation time.
///
/// Execute-time gating (chunk > 0, chunk <= max_chunk_amount, period cap
/// projection, period-total accumulation/reset) lives in
/// `shared::schedule::{validate_policy_execution, advance_policy}` — the
/// L-01 regression (reject explicit zero chunk) is pinned by tests there.
pub fn validate_payg_policy(
    max_amount_per_period: u64,
    max_chunk_amount: u64,
    period_length_seconds: u64,
) -> Result<()> {
    require!(max_amount_per_period > 0, TributaryError::InvalidAmount);
    require!(max_chunk_amount > 0, TributaryError::InvalidAmount);
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

#[cfg(test)]
mod tests {
    // Cross-package parity (milestone tributary-f6yh / testing epic). Mirrors
    // the payAsYouGo fixtures in
    // packages/payments/src/__tests__/fixtures/policy-configs.ts.
    use super::*;
    use crate::error::TributaryError;

    #[test]
    fn accepts_valid_payg() {
        assert!(validate_payg_policy(1000, 100, 86400).is_ok());
    }

    #[test]
    fn accepts_chunk_equal_to_period_cap() {
        assert!(validate_payg_policy(100, 100, 86400).is_ok());
    }

    #[test]
    fn rejects_zero_period_cap() {
        let err = validate_payg_policy(0, 1, 60).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn rejects_zero_chunk() {
        let err = validate_payg_policy(1000, 0, 60).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn rejects_chunk_above_period_cap() {
        let err = validate_payg_policy(100, 101, 60).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn rejects_zero_period() {
        let err = validate_payg_policy(1000, 100, 0).unwrap_err();
        assert!(err == error!(TributaryError::InvalidInterval));
    }
}
