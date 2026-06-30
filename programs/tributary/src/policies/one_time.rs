use crate::error::TributaryError;
use anchor_lang::prelude::*;

/// Validate one-time policy parameters at creation time.
///
/// Execute-time gating (`due_date` check, `expiry_date` check) and the
/// always-terminal `advance_policy` arm live in
/// `shared::schedule::{validate_policy_execution, advance_policy}`.
///
/// `due_date <= 0` means "immediately executable" — the execute-time gate
/// treats any `due_date <= 0` as already due, so both create paths (direct
/// `create_payment_policy` and `create_composable_policy`) store the
/// variant as-is with no per-variant clamp.
pub fn validate_one_time_policy(
    amount: u64,
    due_date: i64,
    expiry_date: Option<i64>,
) -> Result<()> {
    require!(amount > 0, TributaryError::InvalidAmount);

    // Only validate expiry-vs-due ordering when BOTH are meaningful
    // (expiry present and due_date in the future). A `due_date <= 0`
    // (immediate) policy has no lower bound to clamp expiry against here —
    // the execute-time gate handles it.
    if let Some(exp) = expiry_date {
        if due_date > 0 {
            require!(exp > due_date, TributaryError::InvalidPaymentDueDate);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::TributaryError;

    #[test]
    fn rejects_zero_amount() {
        let err = validate_one_time_policy(0, 0, None).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn accepts_immediate_no_expiry() {
        assert!(validate_one_time_policy(100, 0, None).is_ok());
        assert!(validate_one_time_policy(100, -1, None).is_ok());
    }

    #[test]
    fn accepts_future_due_no_expiry() {
        assert!(validate_one_time_policy(100, 1_700_000_000, None).is_ok());
    }

    #[test]
    fn rejects_expiry_before_due() {
        let err = validate_one_time_policy(100, 1_700_000_000, Some(1_600_000_000)).unwrap_err();
        assert!(err == error!(TributaryError::InvalidPaymentDueDate));
    }

    #[test]
    fn accepts_expiry_after_due() {
        assert!(validate_one_time_policy(100, 1_700_000_000, Some(1_800_000_000)).is_ok());
    }

    #[test]
    fn skips_expiry_check_when_due_immediate() {
        // due_date <= 0 → no lower bound for expiry; any expiry is accepted.
        // The execute-time gate enforces expiry on its own.
        assert!(validate_one_time_policy(100, 0, Some(1)).is_ok());
    }
}
