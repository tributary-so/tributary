use crate::constants::*;
use crate::error::TributaryError;
use crate::state::PaymentGateway;
use anchor_lang::prelude::*;

/// Arguments for updating gateway referral settings
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateGatewayReferralSettingsArgs {
    /// Optional feature flags to update (bit 0 = referral program enabled)
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
        if let Some(flags) = args.feature_flags {
            gateway.feature_flags = flags;
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
