use crate::{error::TributaryError, state::RELEASE_DUE_DATE};
use anchor_lang::prelude::*;

/// Validate milestone policy parameters at creation time.
///
/// Execute-time gating (due-date check via `RELEASE_DUE_DATE`, signer
/// authorization via `RELEASE_GATEWAY`/`RELEASE_OWNER`/`RELEASE_RECIPIENT`,
/// `current_milestone` advancement) lives in
/// `shared::schedule::{validate_policy_execution, advance_policy}`.
pub fn validate_milestone_policy(
    milestone_amounts: &[u64; 4],
    current_milestone: u8,
    release_condition: u8,
    total_milestones: u8,
    escrow_amount: u64,
    _milestone_timestamps: &[i64; 4],
) -> Result<()> {
    require!(
        (1..=4).contains(&total_milestones),
        TributaryError::InvalidAmount
    );

    require!(
        current_milestone < total_milestones,
        TributaryError::InvalidAmount
    );

    require!(escrow_amount > 0, TributaryError::InvalidAmount);

    for amount in milestone_amounts.iter().take(total_milestones as usize) {
        require!(*amount > 0, TributaryError::InvalidAmount);
    }

    // Validate timestamps are in the future (basic check, mainnet only).
    #[cfg(feature = "mainnet")]
    {
        // only on mainnet, simplifies testing
        let current_time = Clock::get()?.unix_timestamp;
        for timestamp in _milestone_timestamps.iter().take(total_milestones as usize) {
            require!(*timestamp > current_time, TributaryError::InvalidInterval);
        }
    }

    // release_condition: bits 1-3 (signer gates) must be mutually exclusive
    // (at most one set). Bit 0 (RELEASE_DUE_DATE) is independent.
    let signer_bits = release_condition & !RELEASE_DUE_DATE;
    require!(signer_bits.count_ones() <= 1, TributaryError::InvalidAmount);

    Ok(())
}
