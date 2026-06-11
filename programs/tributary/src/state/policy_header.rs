use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PolicyStatus {
    Active,
    Paused,
    Completed,
}

impl Default for PolicyStatus {
    fn default() -> Self {
        Self::Active
    }
}

pub struct PolicyHeader {
    pub discriminator: u8,
    pub version: u8,
    pub bump: u8,
    pub user_payment: Pubkey,
    pub gateway: Pubkey,
    pub status: PolicyStatus,
    pub rent_payer: Pubkey,
}

impl PolicyHeader {
    pub const SIZE: usize = 1 + // discriminator: u8
        1 + // version: u8
        1 + // bump: u8
        32 + // user_payment: Pubkey
        32 + // gateway: Pubkey
        1 + // status: PolicyStatus
        32; // rent_payer: Pubkey
            // = 100 bytes
}
