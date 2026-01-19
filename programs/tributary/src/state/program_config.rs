use anchor_lang::prelude::*;

/// This is a unique global program configuration managed by an admin that
/// defines protocol fees and potentially more.
#[account]
pub struct ProgramConfig {
    /// Admin authority that can update protocol configuration
    pub admin: Pubkey,
    /// Key that receives protocol fees from all payments
    pub fee_recipient: Pubkey,
    /// Protocol fee in basis points (bps). Max 10,000 (100%)
    pub protocol_fee_bps: u16,
    /// DEPRECATED: Maximum number of active policies allowed per user. Attention tumbstone!
    pub _deprecated: u32,
    /// Emergency pause flag - when true, all payments are blocked
    pub emergency_pause: bool,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Reserved space for future extensions
    pub padding: [u8; 256],
}

impl ProgramConfig {
    pub const SIZE: usize = 8 + // discriminator
        32 + // admin: Pubkey
        32 + // fee_recipient: Pubkey
        2 + // protocol_fee_bps: u16
        4 + // _deprecated: u32
        1 + // emergency_pause: bool
        1 + // bump: u8
        256; // padding: [u8; 256]
}
