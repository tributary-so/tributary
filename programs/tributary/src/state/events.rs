use super::composable_policy::{ForwardConfig, ValidationConfig};
use super::payment_policy::PolicyType;
use super::policy_status::PolicyStatus;
use anchor_lang::prelude::*;

/// An event that is thrown when a payment takes place
#[event]
pub struct PaymentRecord {
    pub payment_policy: Pubkey,
    pub gateway: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub memo: [u8; 64],
    /// Post-increment payment counter. For the Nth execution of a policy,
    /// `record_id == N` (starts at 1, not 0). The increment happens inside
    /// `strategy.execute()` (`policies/traits.rs`) before `should_pause_policy`
    /// runs, so `Subscription::max_renewals` ceilings are honored exactly.
    /// Indexers that assumed 0-indexed records must add 1 to historical data
    /// or use `payment_count - 1` for backward display.
    pub record_id: u32,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub token_mint: Pubkey,
}

/// An event that is thrown when program is initialized
#[event]
pub struct ProgramConfigCreated {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
    pub protocol_fee_bps: u16,
}

/// An event that is thrown when a user payment account is created
#[event]
pub struct UserPaymentCreated {
    pub owner: Pubkey,
    pub token_account: Pubkey,
    pub token_mint: Pubkey,
}

/// An event that is thrown when a payment gateway is created
#[event]
pub struct PaymentGatewayCreated {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub gateway_fee_bps: u16,
    pub name: [u8; 32],
    pub url: [u8; 64],
}

/// An event that is thrown when a payment policy is created
#[event]
pub struct PaymentPolicyCreated {
    pub user_payment: Pubkey,
    pub recipient: Pubkey,
    pub gateway: Pubkey,
    pub policy_id: u32,
    pub policy_type: PolicyType,
    pub memo: [u8; 64],
    pub created_policies_count: u32,
}

/// An event that is thrown when a gateway signer is changed
#[event]
pub struct GatewaySignerChanged {
    pub gateway: Pubkey,
    pub old_signer: Pubkey,
    pub new_signer: Pubkey,
}

/// An event that is thrown when a gateway fee recipient is changed
#[event]
pub struct GatewayFeeRecipientChanged {
    pub gateway: Pubkey,
    pub old_fee_recipient: Pubkey,
    pub new_fee_recipient: Pubkey,
}

/// An event that is thrown when a gateway fee bps is changed
#[event]
pub struct GatewayFeeBpsChanged {
    pub gateway: Pubkey,
    pub old_fee_bps: u16,
    pub new_fee_bps: u16,
}

/// An event that is thrown when a payment policy status is changed
#[event]
pub struct PaymentPolicyStatusChanged {
    pub payment_policy: Pubkey,
    pub old_status: PolicyStatus,
    pub new_status: PolicyStatus,
}

/// An event that is thrown when a payment policy is deleted
#[event]
pub struct PaymentPolicyDeleted {
    pub payment_policy: Pubkey,
    pub owner: Pubkey,
    pub policy_id: u32,
}

/// An event that is thrown when a payment gateway is deleted
#[event]
pub struct PaymentGatewayDeleted {
    pub gateway: Pubkey,
    pub authority: Pubkey,
    pub name: [u8; 32],
}

/// An event that is thrown when a user payment account is deleted
#[event]
pub struct UserPaymentDeleted {
    pub user_payment: Pubkey,
    pub owner: Pubkey,
    pub rent_payer: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub struct ReferralReward {
    pub pubkey: Pubkey,
    pub reward: u64,
}

/// An event that is thrown when referral rewards are distributed
#[event]
pub struct ReferralRewardDistributedRecord {
    pub payment_policy: Pubkey,
    pub gateway: Pubkey,
    pub payment_amount: u64,
    pub timestamp: i64,
    pub rewards: [Option<ReferralReward>; 3],
}

/// An event that is thrown when a composable policy is created
#[event]
pub struct ComposablePolicyCreated {
    pub composable_policy: Pubkey,
    pub user_payment: Pubkey,
    pub gateway: Pubkey,
    pub recipient: Pubkey,
    pub policy_id: u32,
    pub policy_type: PolicyType,
    pub memo: [u8; 64],
    pub forward_config: ForwardConfig,
    pub validation_config: ValidationConfig,
    pub has_validation_pda: bool,
}

/// An event that is thrown when a composable policy is executed
#[event]
pub struct ComposableExecuted {
    pub composable_policy: Pubkey,
    pub gateway: Pubkey,
    pub target_program: Pubkey,
    pub input_amount: u64,
    pub output_amount: u64,
    pub gateway_fee: u64,
    pub protocol_fee: u64,
    pub recipient: Pubkey,
    pub timestamp: i64,
    pub record_id: u32,
}

/// An event that is thrown when a composable policy status is changed
#[event]
pub struct ComposablePolicyStatusChanged {
    pub composable_policy: Pubkey,
    pub old_status: PolicyStatus,
    pub new_status: PolicyStatus,
}

/// An event that is thrown when a composable policy is deleted
#[event]
pub struct ComposablePolicyDeleted {
    pub composable_policy: Pubkey,
    pub user_payment: Pubkey,
    pub policy_id: u32,
}
