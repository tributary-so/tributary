use anchor_lang::prelude::*;

/// Each owner/authority+mint has a unique UserPayment account.
/// The purpose of this account is to be able to identify quickly
/// some statistics that are valid across *all* payment policies
/// for an authority across a mint.
#[account]
pub struct UserPayment {
    /// Owner of this payment account (the user)
    pub owner: Pubkey,
    /// Associated token account for payment token
    pub token_account: Pubkey,
    /// Mint address of token used for payments
    pub token_mint: Pubkey,
    /// Number of active payment policies for this user/mint combination
    pub active_policies_count: u32,
    /// Total number of policies ever created for this user/mint combination
    /// This field only increases and is used to prevent policy ID reuse
    pub created_policies_count: u32,
    /// Unix timestamp when account was created
    pub created_at: i64,
    /// Unix timestamp when account was last updated
    pub updated_at: i64,
    /// Whether this payment account is active
    pub is_active: bool,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Reserved space for future extensions
    pub padding: [u8; 252],
}

impl UserPayment {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner: Pubkey
        32 + // token_account: Pubkey
        32 + // token_mint: Pubkey
        4 + // active_policies_count: u32
        4 + // created_policies_count: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        1 + // is_active: bool
        1 + // bump: u8
        252; // padding: [u8; 252]
}