use anchor_lang::prelude::*;

/// A payment gateway operated by a service provider that executes recurring payments.
/// Gateway operators can charge fees for their service and are responsible for
/// triggering payment execution. Each gateway has an authority (owner), fee recipient,
/// and signer key used to execute payments on behalf of users.
#[account]
pub struct PaymentGateway {
    /// Authority key that owns this gateway. Cannot be changed after creation.
    pub authority: Pubkey,
    /// Key that receives gateway fees from processed payments
    pub fee_recipient: Pubkey,
    /// Gateway fee in basis points (bps). Max 10,000 (100%)
    pub gateway_fee_bps: u16,
    /// Whether this gateway is active and can process payments
    pub is_active: bool,
    /// Total amount processed by this gateway (cumulative)
    pub total_processed: u64,
    /// Unix timestamp when gateway was created
    pub created_at: i64,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Human-readable gateway name (32 bytes max)
    pub name: [u8; 32],
    /// Gateway service URL (64 bytes max)
    pub url: [u8; 64],
    /// Signer key authorized to execute payments for this gateway
    pub signer: Pubkey,
    pub padding: [u8; 128],
}

impl PaymentGateway {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority: Pubkey
        32 + // fee_recipient: Pubkey
        2 + // gateway_fee_bps: u16
        1 + // is_active: bool
        8 + // total_processed: u64
        8 + // created_at: i64
        1 + // bump: u8
        32 + // name: [u8; 32]
        64 + // url: [u8; 64]
        32 + // signer: Pubkey
        128; // padding: [u8; 160]
}