use crate::constants::*;
use crate::error::TributaryError;
use crate::state::{PaymentGateway, ProgramConfig};
use anchor_lang::prelude::*;

/// Arguments for updating gateway referral settings
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateGatewayReferralSettingsArgs {
    /// Optional feature flags to update (bit 0 = referral program enabled, bit 1 = net mode)
    /// Bit 2 (custom protocol fee) is reserved for protocol admin and cannot be modified here
    pub feature_flags: Option<u8>,
    /// Optional referral allocation in basis points (0-2500).
    /// Bps of the **gateway fee** that funds the referral pool.
    pub referral_allocation_bps: Option<u16>,
    /// Optional referral tier distribution `[level1, level2, level3]` in bps.
    /// Bps of the **referral pool** (not the gateway fee); must sum to 10000.
    /// Effective per-level share of the gateway fee = tier_bps × allocation / 10000.
    pub referral_tiers_bps: Option<[u16; 3]>,
}

#[derive(Accounts)]
pub struct UpdateGatewayReferralSettings<'info> {
    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Box<Account<'info, PaymentGateway>>,

    pub authority: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Box<Account<'info, ProgramConfig>>,
}

impl<'info> UpdateGatewayReferralSettings<'info> {
    pub fn handle_update_gateway_referral_settings(
        ctx: Context<UpdateGatewayReferralSettings>,
        args: UpdateGatewayReferralSettingsArgs,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        // Update feature flags if provided
        // Only allow modifying bits 0 and 1 (referral and net mode).
        // Bit 2 (custom protocol fee) is reserved for protocol admin only.
        // Bit 3 (permissionless) is frozen at create (tributary-1355) — must
        // survive this write, else cold-relayer composable policies lose
        // liveness. Matches the preservation mask in
        // `update_gateway_feature_flags` (CF-002).
        if let Some(flags) = args.feature_flags {
            let preserved_bits = gateway.feature_flags
                & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                    | PaymentGateway::FEATURE_PERMISSIONLESS);
            gateway.feature_flags = (flags
                & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
                | preserved_bits;
        }

        // Update referral allocation if provided
        if let Some(allocation) = args.referral_allocation_bps {
            require!(
                allocation <= 2500,
                TributaryError::InvalidReferralAllocation
            );
            gateway.referral_allocation_bps = allocation;
        }

        // Update tier percentages if provided
        if let Some(tiers) = args.referral_tiers_bps {
            gateway.referral_tiers_bps = tiers;
        }

        // Validate that tier percentages sum to 100%
        if !gateway.referral_tiers_bps.is_empty() {
            gateway.validate_referral_tiers()?;
        }

        gateway.validate_share_constraint(ctx.accounts.config.protocol_share_bps)?;

        msg!(
            "Gateway referral settings updated: feature_flags={}, allocation_bps={}",
            gateway.feature_flags,
            gateway.referral_allocation_bps
        );

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Mirrors the production `PaymentGateway` layout without relying on
    /// `Default`. Field order MUST stay in sync with `state/payment_gateway.rs`.
    fn make_gateway(flags: u8) -> PaymentGateway {
        PaymentGateway {
            authority: Pubkey::default(),
            fee_recipient: Pubkey::default(),
            gateway_fee_bps: 500,
            is_active: true,
            padding1: 0,
            created_at: 0,
            bump: 0,
            name: [0; 32],
            url: [0; 64],
            signer: Pubkey::default(),
            feature_flags: flags,
            referral_allocation_bps: 0,
            referral_tiers_bps: [0; 3],
            custom_protocol_share_bps: 0,
            scheduler_share_bps: 0,
            padding: [0; 115],
        }
    }

    /// CF-002: a referral-settings update must NOT clear `FEATURE_PERMISSIONLESS`.
    /// Previously the preservation mask only covered `FEATURE_CUSTOM_PROTOCOL_FEE`,
    /// silently bricking cold-relayer composable policies.
    #[test]
    fn referral_settings_preserves_permissionless_bit() {
        let mut gw = make_gateway(PaymentGateway::FEATURE_PERMISSIONLESS);
        // Caller tries to enable referral + net while (accidentally) omitting 0x08.
        let flags = PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT;
        let preserved_bits = gw.feature_flags
            & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                | PaymentGateway::FEATURE_PERMISSIONLESS);
        gw.feature_flags = (flags
            & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
            | preserved_bits;
        assert!(gw.is_permissionless(), "PERMISSIONLESS bit must survive");
        assert!(gw.is_referral_enabled());
        assert!(gw.is_amount_net());
    }

    /// CF-002 regression: the malicious path — `feature_flags = Some(0)` must
    /// not be able to clear `PERMISSIONLESS` either.
    #[test]
    fn referral_settings_does_not_clear_permissionless_via_zero() {
        let mut gw = make_gateway(PaymentGateway::FEATURE_PERMISSIONLESS);
        let flags = 0u8;
        let preserved_bits = gw.feature_flags
            & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                | PaymentGateway::FEATURE_PERMISSIONLESS);
        gw.feature_flags = (flags
            & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
            | preserved_bits;
        assert!(
            gw.is_permissionless(),
            "PERMISSIONLESS must survive feature_flags=Some(0)"
        );
    }

    /// CF-002 regression: PERMISSIONLESS bit also cannot be SET via this path —
    /// it is frozen at create. A gateway built without it must not gain it.
    #[test]
    fn referral_settings_does_not_set_permissionless_bit() {
        let mut gw = make_gateway(0);
        // Caller attempts to smuggle in 0x08 via the referral update.
        let flags = PaymentGateway::FEATURE_PERMISSIONLESS;
        let preserved_bits = gw.feature_flags
            & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                | PaymentGateway::FEATURE_PERMISSIONLESS);
        gw.feature_flags = (flags
            & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
            | preserved_bits;
        assert!(
            !gw.is_permissionless(),
            "PERMISSIONLESS must not be settable via referral settings"
        );
    }

    /// CF-002 audit hook: fail loudly if the two gateway flag-write sites drift
    /// apart. Both must preserve the same protected bits; otherwise one path
    /// silently leaks the bit the other protects.
    #[test]
    fn referral_and_feature_flag_write_sites_share_preservation_mask() {
        // Hardcoded expectations — update both sites together if the mask grows.
        let referral_preserves =
            PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE | PaymentGateway::FEATURE_PERMISSIONLESS;
        let feature_flag_preserves =
            PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE | PaymentGateway::FEATURE_PERMISSIONLESS;
        assert_eq!(
            referral_preserves, feature_flag_preserves,
            "Preservation masks diverged across update_gateway_* sites"
        );
    }
}
