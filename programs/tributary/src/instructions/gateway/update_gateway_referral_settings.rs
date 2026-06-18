use crate::constants::*;
use crate::error::TributaryError;
use crate::state::PaymentGateway;
use anchor_lang::prelude::*;

/// Arguments for updating gateway referral settings
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateGatewayReferralSettingsArgs {
    /// Optional feature flags to update (bit 0 = referral program enabled, bit 1 = net mode)
    /// Bit 2 (custom protocol fee) is reserved for protocol admin and cannot be modified here
    pub feature_flags: Option<u8>,
    /// Optional referral allocation in basis points (0-2500)
    pub referral_allocation_bps: Option<u16>,
    /// Optional referral tier distribution [level1, level2, level3] in bps (must sum to 10000)
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
}

impl<'info> UpdateGatewayReferralSettings<'info> {
    pub fn handle_update_gateway_referral_settings(
        ctx: Context<UpdateGatewayReferralSettings>,
        args: UpdateGatewayReferralSettingsArgs,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        // Update feature flags if provided
        // Only allow modifying bits 0 and 1 (referral and net mode)
        // Bit 2 (custom protocol fee) is reserved for protocol admin only
        if let Some(flags) = args.feature_flags {
            let protected_bit = gateway.feature_flags & PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
            gateway.feature_flags = (flags
                & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
                | protected_bit;
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

        msg!(
            "Gateway referral settings updated: feature_flags={}, allocation_bps={}",
            gateway.feature_flags,
            gateway.referral_allocation_bps
        );

        Ok(())
    }
}
