use crate::constants::*;
use crate::error::TributaryError;
use crate::state::{PaymentGateway, ProgramConfig};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateGatewayProtocolFeeArgs {
    pub feature_flags: Option<u8>,
    pub custom_protocol_fee_bps: Option<u16>,
}

#[derive(Accounts)]
pub struct UpdateGatewayProtocolFee<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: The authority that owns the gateway
    pub authority: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Box<Account<'info, PaymentGateway>>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TributaryError::Unauthorized
    )]
    pub config: Box<Account<'info, ProgramConfig>>,
}

impl<'info> UpdateGatewayProtocolFee<'info> {
    pub fn handle_update_gateway_protocol_fee(
        ctx: Context<UpdateGatewayProtocolFee>,
        args: UpdateGatewayProtocolFeeArgs,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        if let Some(flags) = args.feature_flags {
            gateway.feature_flags = flags;
        }

        if let Some(fee_bps) = args.custom_protocol_fee_bps {
            require!(fee_bps <= 10000, TributaryError::InvalidProtocolFee);
            gateway.custom_protocol_fee_bps = fee_bps;
        }

        msg!(
            "Gateway protocol fee updated: feature_flags={}, custom_protocol_fee_bps={}",
            gateway.feature_flags,
            gateway.custom_protocol_fee_bps
        );

        Ok(())
    }
}
