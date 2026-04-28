use crate::{
    error::TributaryError,
    policies::traits::PolicyStrategy,
    state::{
        PaymentGateway, PaymentPolicy, PolicyType, RELEASE_DUE_DATE, RELEASE_GATEWAY,
        RELEASE_OWNER, RELEASE_RECIPIENT,
    },
};
use anchor_lang::prelude::*;

/// Validate milestone policy parameters
pub fn validate_milestone_policy(
    milestone_amounts: &[u64; 4],
    current_milestone: u8,
    release_condition: u8,
    total_milestones: u8,
    escrow_amount: u64,
    _milestone_timestamps: &[i64; 4],
) -> Result<()> {
    // Validate total_milestones is between 1 and 4
    require!(
        (1..=4).contains(&total_milestones),
        TributaryError::InvalidAmount
    );

    // Validate current_milestone is within bounds
    require!(
        current_milestone < total_milestones,
        TributaryError::InvalidAmount
    );

    // Validate escrow_amount is greater than zero
    require!(escrow_amount > 0, TributaryError::InvalidAmount);

    // Validate milestone amounts are greater than zero
    for amount in milestone_amounts.iter().take(total_milestones as usize) {
        require!(*amount > 0, TributaryError::InvalidAmount);
    }

    // Validate timestamps are in the future (basic check)
    #[cfg(feature = "mainnet")]
    {
        // only on mainnet, simplifies testing
        let current_time = Clock::get()?.unix_timestamp;
        for timestamp in _milestone_timestamps.iter().take(total_milestones as usize) {
            require!(*timestamp > current_time, TributaryError::InvalidInterval);
        }
    }

    // Validate release_condition is valid bitmap format
    // Bits 1-3 must be mutually exclusive (at most one may be set)
    let signer_bits = release_condition & 0b1110;
    require!(signer_bits.count_ones() <= 1, TributaryError::InvalidAmount);

    Ok(())
}

/// Strategy for handling milestone-based payment policies
#[derive(Debug)]
pub struct MilestoneStrategy;

impl PolicyStrategy for MilestoneStrategy {
    fn validate_payment_timing(
        &self,
        payment_policy: &PaymentPolicy,
        current_time: i64,
        signer: &Pubkey,
        user_payment_owner: &Pubkey,
        gateway: &PaymentGateway,
    ) -> Result<()> {
        match &payment_policy.policy_type {
            PolicyType::Milestone {
                milestone_timestamps,
                current_milestone,
                release_condition,
                ..
            } => {
                let milestone_idx = *current_milestone as usize;
                let next_due = milestone_timestamps[milestone_idx];

                // Check due date if bit 0 is set
                if (release_condition & RELEASE_DUE_DATE) != 0 {
                    require!(current_time >= next_due, TributaryError::PaymentNotDue);
                }

                // Check signer if any signer bit is set (bits 1-3 are mutually exclusive)
                if (release_condition & RELEASE_GATEWAY) != 0 {
                    require!(gateway.signer == *signer, TributaryError::Unauthorized);
                } else if (release_condition & RELEASE_OWNER) != 0 {
                    require!(*signer == *user_payment_owner, TributaryError::Unauthorized);
                } else if (release_condition & RELEASE_RECIPIENT) != 0 {
                    require!(
                        *signer == payment_policy.recipient,
                        TributaryError::Unauthorized
                    );
                }
                // If no signer bits set, anyone can trigger
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
            PolicyType::Milestone {
                milestone_amounts,
                current_milestone,
                ..
            } => {
                let milestone_idx = *current_milestone as usize;
                Ok(milestone_amounts[milestone_idx])
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }

    fn update_policy_state(
        &mut self,
        payment_policy: &mut PaymentPolicy,
        _current_time: i64,
    ) -> Result<()> {
        match &mut payment_policy.policy_type {
            PolicyType::Milestone {
                current_milestone,
                total_milestones,
                ..
            } => {
                // Move to next milestone
                *current_milestone = current_milestone
                    .checked_add(1)
                    .ok_or(TributaryError::ArithmeticOverflow)?;

                // If we've completed all milestones, pause policy
                if *current_milestone >= *total_milestones {
                    payment_policy.status = crate::state::PaymentStatus::Paused;
                }
                Ok(())
            }
            _ => err!(TributaryError::InvalidAmount),
        }
    }

    fn should_pause_policy(&self, payment_policy: &PaymentPolicy) -> bool {
        match &payment_policy.policy_type {
            PolicyType::Milestone {
                current_milestone,
                total_milestones,
                ..
            } => *current_milestone >= *total_milestones,
            _ => false,
        }
    }
}
