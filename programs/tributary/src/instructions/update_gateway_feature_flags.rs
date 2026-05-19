use crate::constants::*;
use crate::error::TributaryError;
use crate::state::PaymentGateway;
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

        let protected_bit = gateway.feature_flags & PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
        gateway.feature_flags = (args.feature_flags
            & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
            | protected_bit;

        msg!(
            "Gateway feature flags updated: flags={}",
            gateway.feature_flags
        );

        Ok(())
    }
}
