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
    // We disable this check on localnet so we can run our testsuite. There is no way to advance the
    // slots on our setup yet.
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

#[cfg(test)]
mod tests {
    // Cross-package parity (milestone tributary-f6yh / testing epic). Every
    // case mirrors a fixture in
    // packages/payments/src/__tests__/fixtures/policy-configs.ts so drift
    // between the TS encoder-validators and the on-chain validators is caught
    // by CI on either side. Names are snake_case of the TS fixture names.
    use super::*;
    use crate::error::TributaryError;

    const DUE_DATE: u8 = RELEASE_DUE_DATE; // 0b0001

    fn cfg(amounts: [u64; 4], total: u8, release: u8, escrow: u64) -> Result<()> {
        validate_milestone_policy(
            &amounts,
            0, // current_milestone (fresh)
            release,
            total,
            escrow,
            &[1_700_000_000, 1_710_000_000, 1_720_000_000, 1_730_000_000],
        )
    }

    #[test]
    fn accepts_two_milestones() {
        assert!(cfg([100, 200, 0, 0], 2, DUE_DATE, 300).is_ok());
    }

    #[test]
    fn accepts_four_milestones() {
        assert!(cfg([1, 2, 3, 4], 4, DUE_DATE, 10).is_ok());
    }

    #[test]
    fn accepts_gateway_signer_with_due_date() {
        // bit0 (due) + bit1 (gateway) = 0b0011 — single signer bit set, OK.
        assert!(cfg([100, 200, 0, 0], 2, 0b0011, 300).is_ok());
    }

    #[test]
    fn accepts_no_restrictions() {
        assert!(cfg([100, 200, 0, 0], 2, 0b0000, 300).is_ok());
    }

    #[test]
    fn rejects_total_milestones_zero() {
        let err = cfg([100, 200, 0, 0], 0, DUE_DATE, 300).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn rejects_total_milestones_five() {
        let err = cfg([1, 2, 3, 4], 5, DUE_DATE, 10).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn rejects_zero_milestone_amount() {
        let err = cfg([0, 200, 0, 0], 2, DUE_DATE, 200).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }

    #[test]
    fn rejects_multiple_signer_bits() {
        // bits 1 (gateway) + 2 (owner) = 0b0110 — mutually exclusive violation.
        let err = cfg([100, 200, 0, 0], 2, 0b0110, 300).unwrap_err();
        assert!(err == error!(TributaryError::InvalidAmount));
    }
}
