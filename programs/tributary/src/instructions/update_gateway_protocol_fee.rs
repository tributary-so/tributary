use crate::constants::*;
use crate::error::TributaryError;
use crate::state::{PaymentGateway, ProgramConfig};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateGatewayProtocolFeeArgs {
    /// Optional: Enable or disable custom protocol fee feature (bit 2)
    pub use_custom_protocol_fee: bool,
    /// Optional custom protocol fee in basis points (bps). Only used if feature is enabled.
    pub custom_protocol_fee_bps: u16,
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

        if args.use_custom_protocol_fee {
            gateway.feature_flags |= PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
        } else {
            gateway.feature_flags &= !PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
        }

        require!(
            args.custom_protocol_fee_bps <= 10000,
            TributaryError::InvalidFeeBps
        );
        gateway.custom_protocol_fee_bps = args.custom_protocol_fee_bps;

        msg!(
            "Gateway protocol fee updated: use_custom_protocol_fee={}, custom_protocol_fee_bps={}",
            gateway.feature_flags & PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE != 0,
            gateway.custom_protocol_fee_bps
        );

        Ok(())
    }
}
