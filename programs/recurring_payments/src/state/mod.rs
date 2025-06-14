use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentPolicy {
    Subscription {
        amount: u64,
        interval_seconds: u64,
        auto_renew: bool,
        max_renewals: Option<u32>,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentStatus {
    Active,
    Paused,
    Cancelled,
    Completed,
    Overdue,
    PendingActivation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    SemiAnnually,
    Annually,
    Custom(u64),
}

#[account]
pub struct UserPayment {
    pub owner: Pubkey,
    pub token_account: Pubkey,
    pub token_mint: Pubkey,
    pub active_policies_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_active: bool,
    pub bump: u8,
    pub padding: [u8; 256],
}

impl UserPayment {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner: Pubkey
        32 + // token_account: Pubkey
        32 + // token_mint: Pubkey
        4 + // active_policies_count: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        1 + // is_active: bool
        1 + // bump: u8
        256; // padding: [u8; 256]
}

#[account]
pub struct PaymentPolicyAccount {
    pub user_payment_account: Pubkey,
    pub recipient: Pubkey,
    pub policy_type: PaymentPolicy,
    pub status: PaymentStatus,
    pub payment_frequency: PaymentFrequency,
    pub next_payment_due: i64,
    pub total_paid: u64,
    pub payment_count: u32,
    pub failed_payment_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub policy_id: u32,
    pub bump: u8,
    pub padding: [u8; 256],
}

#[account]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
    pub protocol_fee_bps: u16,
    pub max_policies_per_user: u32,
    pub emergency_pause: bool,
    pub bump: u8,
    pub padding: [u8; 256],
}

impl ProgramConfig {
    pub const SIZE: usize = 8 + // discriminator
        32 + // admin: Pubkey
        32 + // fee_recipient: Pubkey
        2 + // protocol_fee_bps: u16
        4 + // max_policies_per_user: u32
        1 + // emergency_pause: bool
        1 + // bump: u8
        256; // padding: [u8; 256]
}

#[event]
pub struct PaymentRecord {
    pub policy_account: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub transaction_signature: String,
    pub payment_type: String,
    pub success: bool,
    pub failure_reason: Option<String>,
    pub record_id: u32,
}
