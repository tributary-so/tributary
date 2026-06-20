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
    /// What percentage of the **gateway fee** funds the referral pool.
    /// Units: basis points of the gateway fee. Range: 0..=2500.
    ///   - 0    = referral program inactive (no pool is carved out)
    ///   - 1000 = 10% of the gateway fee becomes the referral pool
    ///   - 2500 = 25% of the gateway fee (hard cap)
    /// The remaining `(10000 - referral_allocation_bps)` bps of the gateway fee
    /// stays with the gateway fee recipient.
    pub referral_allocation_bps: u16,
    /// How the referral pool is split across the 3 chain levels
    /// `[level1 (direct referrer), level2, level3]`. Units: basis points of the
    /// **referral pool** (NOT of the gateway fee). Must sum to 10000 (100%).
    /// Example: with `referral_allocation_bps = 1000` and
    /// `referral_tiers_bps = [5000, 3000, 2000]`, the actual cut of the gateway
    /// fee is L1 = 5%, L2 = 3%, L3 = 2% (each tier_bps × allocation / 10000).
    /// Misreading these as "bps of gateway fee per level" overpays by 10x.
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
    pub const FEATURE_REFERRAL: u8 = 0x01;
    pub const FEATURE_NET_AMOUNT: u8 = 0x02;
    pub const FEATURE_CUSTOM_PROTOCOL_FEE: u8 = 0x04;

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
        self.feature_flags & Self::FEATURE_REFERRAL != 0
    }

    /// Check if amount is net (recipient receives exactly payment_amount, fees added on top)
    /// Bit 1: Net amount mode (1 = net, 0 = gross/default)
    pub fn is_amount_net(&self) -> bool {
        self.feature_flags & Self::FEATURE_NET_AMOUNT != 0
    }

    /// Check if custom protocol fee feature is enabled
    /// Bit 2: Custom protocol fee enabled (1 = enabled, 0 = disabled)
    pub fn is_custom_protocol_fee_enabled(&self) -> bool {
        self.feature_flags & Self::FEATURE_CUSTOM_PROTOCOL_FEE != 0
    }

    /// Effective protocol fee bps for this gateway: the custom value when the
    /// feature flag is set, otherwise the protocol-wide default.
    pub fn effective_protocol_fee_bps(&self, config_protocol_fee_bps: u16) -> u16 {
        if self.is_custom_protocol_fee_enabled() {
            self.custom_protocol_fee_bps
        } else {
            config_protocol_fee_bps
        }
    }

    /// Validate that gateway_fee_bps + protocol_fee_bps < 10000.
    ///
    /// In gross mode the recipient amount is computed as
    /// `payment_amount - gateway_fee - protocol_fee`. When the combined BPS
    /// exceeds 10000 the subtraction underflows (`ArithmeticOverflow`) and
    /// every payment through the gateway reverts. At exactly 10000 the
    /// recipient receives zero, so the threshold is strictly `<`.
    ///
    /// Call after both fee fields have their final (post-write) values.
    pub fn validate_combined_bps(&self, protocol_fee_bps: u16) -> Result<()> {
        let total = (self.gateway_fee_bps as u32)
            .checked_add(protocol_fee_bps as u32)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        require!(total < 10_000, TributaryError::CombinedFeeBpsExceedsMax);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn gateway_with_fee(bps: u16) -> PaymentGateway {
        PaymentGateway {
            authority: Pubkey::default(),
            fee_recipient: Pubkey::default(),
            gateway_fee_bps: bps,
            is_active: true,
            padding1: 0,
            created_at: 0,
            bump: 0,
            name: [0; 32],
            url: [0; 64],
            signer: Pubkey::default(),
            feature_flags: 0,
            referral_allocation_bps: 0,
            referral_tiers_bps: [0; 3],
            custom_protocol_fee_bps: 0,
            padding: [0; 117],
        }
    }

    #[test]
    fn combined_bps_below_threshold_accepts() {
        // 9899 + 100 == 9999 < 10000
        let gw = gateway_with_fee(9899);
        assert!(gw.validate_combined_bps(100).is_ok());
        // 0 + 0
        let gw = gateway_with_fee(0);
        assert!(gw.validate_combined_bps(0).is_ok());
    }

    #[test]
    fn combined_bps_exactly_10000_rejects() {
        // 9900 + 100 == 10000 → must reject (recipient would be 0)
        let gw = gateway_with_fee(9900);
        assert!(gw.validate_combined_bps(100).is_err());
        // 5000 + 5000
        let gw = gateway_with_fee(5000);
        assert!(gw.validate_combined_bps(5000).is_err());
    }

    #[test]
    fn combined_bps_above_10000_rejects() {
        // 6000 + 5000 == 11000 → underflow territory
        let gw = gateway_with_fee(6000);
        assert!(gw.validate_combined_bps(5000).is_err());
        // 10000 + 100
        let gw = gateway_with_fee(10_000);
        assert!(gw.validate_combined_bps(100).is_err());
    }

    #[test]
    fn effective_protocol_fee_bps_picks_custom_when_enabled() {
        let mut gw = gateway_with_fee(500);
        // Disabled → returns config default
        assert_eq!(gw.effective_protocol_fee_bps(100), 100);
        // Enable custom fee
        gw.feature_flags |= PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
        gw.custom_protocol_fee_bps = 250;
        assert_eq!(gw.effective_protocol_fee_bps(100), 250);
    }
}
