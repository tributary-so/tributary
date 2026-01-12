use anchor_lang::prelude::*;

/// A referral account that tracks referral codes and chain relationships for reward distribution.
/// Each referral account is scoped to a specific gateway to enable gateway-specific referral ecosystems.
///
/// The PDA derivation uses gateway pubkey to ensure uniqueness per gateway:
/// PDA seeds: ["referral", gateway_pubkey, owner_pubkey]
#[account]
pub struct ReferralAccount {
    /// The gateway this referral account belongs to (for PDA derivation and scoping)
    pub gateway: Pubkey,
    /// Authority who owns this referral code and can earn rewards
    pub owner: Pubkey,
    /// 6-character alphanumeric referral code
    pub referral_code: [u8; 6],
    /// Referrer who brought this user (for chain traversal), None if no referrer
    pub referrer: Option<Pubkey>,
    /// Unix timestamp when account was created
    pub created_at: i64,
    /// Total rewards earned by this referrer (in smallest token units)
    pub total_earned: u64,
    /// PDA bump seed
    pub bump: u8,
    pub padding: [u64; 8],
}

impl ReferralAccount {
    pub const SIZE: usize = 8 + // discriminator
        32 + // gateway: Pubkey
        32 + // owner: Pubkey
        6 + // referral_code: [u8; 6]
        33 + // referrer: Option<Pubkey>
        8 + // created_at: i64
        8 + // total_earned: u64
        1 + // bump: u8
        (8*8); // padding
}

/// Helper function to get the referral PDA address
/// PDA seeds: ["referral", gateway_pubkey, owner_pubkey]
pub fn get_referral_pda(gateway: &Pubkey, owner: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    let seeds = [b"referral", gateway.as_ref(), owner.as_ref()];
    Pubkey::find_program_address(&seeds, program_id)
}
