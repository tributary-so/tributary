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
