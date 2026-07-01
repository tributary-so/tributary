use crate::error::TributaryError;
use anchor_lang::prelude::*;

/// Validate `upto` policy parameters at creation time.
///
/// `upto` is a single-use, time-bound authorization to transfer up to
/// `max_amount`, where the actual settled amount is caller-supplied at
/// execute time (determined by the resource server after usage). See
/// ADR-0020 and `shared::schedule::validate_policy_execution` for the
/// execute-time gating (max check, time window).
///
/// * `max_amount` MUST be > 0 (a zero-max authorization is meaningless).
/// * `deadline` is mandatory and MUST be > 0 (x402 spec mandates explicit
///   time bounds — unlike OneTime's optional `expiry_date`).
/// * When `valid_after > 0`, `deadline` MUST be > `valid_after`. When
///   `valid_after <= 0` (immediate), there is no lower bound to clamp
///   against at create time — the execute-time gate enforces the window.
pub fn validate_up_to_policy(max_amount: u64, valid_after: i64, deadline: i64) -> Result<()> {
    require!(max_amount > 0, TributaryError::InvalidAmount);
    require!(deadline > 0, TributaryError::InvalidPaymentDueDate);
    if valid_after > 0 {
        require!(
            deadline > valid_after,
            TributaryError::InvalidPaymentDueDate
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::TributaryError;

    #[test]
    fn rejects_zero_max_amount() {
        let err = validate_up_to_policy(0, 0, 1_800_000_000).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn rejects_zero_deadline() {
        let err = validate_up_to_policy(100, 0, 0).unwrap_err();
        assert!(err == error!(TributaryError::InvalidPaymentDueDate));
    }

    #[test]
    fn rejects_negative_deadline() {
        let err = validate_up_to_policy(100, 0, -1).unwrap_err();
        assert!(err == error!(TributaryError::InvalidPaymentDueDate));
    }

    #[test]
    fn accepts_immediate_valid_after() {
        // valid_after <= 0 → "immediate"; any positive deadline is accepted.
        assert!(validate_up_to_policy(100, 0, 1_800_000_000).is_ok());
        assert!(validate_up_to_policy(100, -1, 1_800_000_000).is_ok());
    }

    #[test]
    fn accepts_future_valid_after_with_later_deadline() {
        assert!(validate_up_to_policy(100, 1_700_000_000, 1_800_000_000).is_ok());
    }

    #[test]
    fn rejects_deadline_before_valid_after() {
        let err = validate_up_to_policy(100, 1_800_000_000, 1_700_000_000).unwrap_err();
        assert!(err == error!(TributaryError::InvalidPaymentDueDate));
    }

    #[test]
    fn rejects_deadline_equal_valid_after() {
        // Strict inequality — a zero-length window is meaningless.
        let err = validate_up_to_policy(100, 1_700_000_000, 1_700_000_000).unwrap_err();
        assert!(err == error!(TributaryError::InvalidPaymentDueDate));
    }
}
