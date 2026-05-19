use crate::constants::*;
use crate::error::TributaryError;
use crate::state::{PaymentGateway, ProgramConfig};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateGatewayFeatureFlagsArgs {
    pub feature_flags: u8,
}

#[derive(Accounts)]
pub struct UpdateGatewayFeatureFlags<'info> {
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
        constraint = config.admin == admin.key() @ TributaryError::Unauthorized
    )]
    pub config: Box<Account<'info, ProgramConfig>>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

impl<'info> UpdateGatewayFeatureFlags<'info> {
    pub fn handle_update_gateway_feature_flags(
        ctx: Context<UpdateGatewayFeatureFlags>,
        args: UpdateGatewayFeatureFlagsArgs,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        require!(
            args.feature_flags
                <= (PaymentGateway::FEATURE_REFERRAL
                    | PaymentGateway::FEATURE_NET_AMOUNT
                    | PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE),
            TributaryError::InvalidFeatureFlags
        );

        gateway.feature_flags = args.feature_flags;

        msg!(
            "Gateway feature flags updated: flags={}",
            gateway.feature_flags
        );

        Ok(())
    }
}
