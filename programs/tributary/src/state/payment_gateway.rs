use crate::error::TributaryError;
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
    /// No-longer-used, take care of tumbstone
    pub padding1: u64,
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
    /// Gateway-scoped feature flags (bit-vector)
    /// Bit 0: Referral program enabled (1 = enabled, 0 = disabled)
    /// Bit 1: Net amount mode (1 = net, 0 = gross/default)
    /// Bit 2: Custom protocol fee enabled (1 = enabled, 0 = disabled)
    pub feature_flags: u8,
    /// Gateway-scoped referral program allocation (in basis points)
    /// 0 = no referral program, 2500 = 25% of gateway fee can be used for referrals
    pub referral_allocation_bps: u16,
    /// Gateway-scoped referral tier distribution as [level1, level2, level3]
    /// Values are in basis points (e.g., 6000 = 60%). Must sum to 10000 = 100%
    pub referral_tiers_bps: [u16; 3],
    /// Custom protocol fee in basis points (bps). Only used if use_custom_protocol_fee flag is set.
    /// When enabled, this overrides the default 100 bps protocol fee.
    pub custom_protocol_fee_bps: u16,
    /// Padding for future fields
    pub padding: [u8; 117],
}

impl PaymentGateway {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority: Pubkey
        32 + // fee_recipient: Pubkey
        2 + // gateway_fee_bps: u16
        1 + // is_active: bool
        8 + // padding1: u64
        8 + // created_at: i64
        1 + // bump: u8
        32 + // name: [u8; 32]
        64 + // url: [u8; 64]
        32 + // signer: Pubkey
        1 + // feature_flags: u8
        2 + // referral_allocation_bps: u16
        6 + // referral_tiers_bps: [u16; 3] = 2*3 = 6
        2 + // custom_protocol_fee_bps: u16
        117; // padding
}

impl PaymentGateway {
    /// Validate that referral tier percentages sum to 100% (10000 bps)
    pub fn validate_referral_tiers(&self) -> Result<()> {
        if self.referral_tiers_bps.len() != 3 {
            return Err(TributaryError::InvalidReferralTiers.into());
        }

        let total: u16 = self.referral_tiers_bps.iter().sum();
        require!(total == 10000, TributaryError::InvalidReferralTiers);

        Ok(())
    }

    /// Check if the referral program feature is enabled
    pub fn is_referral_enabled(&self) -> bool {
        self.feature_flags & 0x01 != 0
    }

    /// Check if amount is net (recipient receives exactly payment_amount, fees added on top)
    /// Bit 1: Net amount mode (1 = net, 0 = gross/default)
    pub fn is_amount_net(&self) -> bool {
        self.feature_flags & 0x02 != 0
    }

    /// Check if custom protocol fee feature is enabled
    /// Bit 2: Custom protocol fee enabled (1 = enabled, 0 = disabled)
    pub fn is_custom_protocol_fee_enabled(&self) -> bool {
        self.feature_flags & 0x04 != 0
    }
}
