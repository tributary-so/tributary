use anchor_lang::prelude::*;

/// A referral account that tracks referral codes and chain relationships for reward distribution.
/// Each referral account is scoped to a specific gateway to enable gateway-specific referral ecosystems.
///
/// The PDA derivation uses gateway pubkey to ensure uniqueness per gateway:
/// PDA seeds: ["referral", gateway_pubkey, owner_pubkey]
///
/// Uses zero_copy for efficient mutable access during payment execution.
#[account(zero_copy)]
#[repr(C)]
pub struct ReferralAccount {
    /// The gateway this referral account belongs to (for PDA derivation and scoping)
    pub gateway: Pubkey,
    /// Authority who owns this referral code and can earn rewards
    pub owner: Pubkey,
    /// 6-character alphanumeric referral code
    pub referral_code: [u8; 6],
    /// Padding for alignment (referrer is 32 bytes, needs 8-byte alignment)
    pub _padding_code: [u8; 2],
    /// Referrer who brought this user (for chain traversal). Might be the default Pubkey
    pub referrer: Pubkey,
    /// Unix timestamp when account was created
    pub created_at: i64,
    /// Total rewards earned by this referrer (in smallest token units)
    pub total_earned: u64,
    /// PDA bump seed
    pub bump: u8,
    pub _padding_bump: [u8; 7],
    pub _padding: [u64; 8],
}

impl ReferralAccount {
    pub const SIZE: usize = 8 + // discriminator
        32 + // gateway: Pubkey
        32 + // owner: Pubkey
        6 + // referral_code: [u8; 6]
        2 + // _padding_code: [u8; 2]
        32 + // referrer: Pubkey
        8 + // created_at: i64
        8 + // total_earned: u64
        1 + // bump: u8
        7 + // _padding_bump: [u8; 7]
        (8 * 8); // _padding: [u64; 8]
}

/// Helper function to get the referral PDA address
/// PDA seeds: ["referral", gateway_pubkey, owner_pubkey]
pub fn get_referral_pda(gateway: &Pubkey, owner: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    let seeds = [b"referral", gateway.as_ref(), owner.as_ref()];
    Pubkey::find_program_address(&seeds, program_id)
}
