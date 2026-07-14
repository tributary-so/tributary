use crate::constants::*;
use crate::error::TributaryError;
use crate::state::{PaymentGateway, ProgramConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateGatewaySchedulerShare<'info> {
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

impl<'info> UpdateGatewaySchedulerShare<'info> {
    pub fn handle_update_gateway_scheduler_share(
        ctx: Context<UpdateGatewaySchedulerShare>,
        scheduler_share_bps: u16,
    ) -> Result<()> {
        require!(scheduler_share_bps <= 10000, TributaryError::InvalidFeeBps);

        let gateway = &mut ctx.accounts.gateway;

        gateway.scheduler_share_bps = scheduler_share_bps;

        gateway.validate_share_constraint(ctx.accounts.config.protocol_share_bps)?;

        msg!(
            "Gateway scheduler share updated: {} bps for gateway: {:?}",
            gateway.scheduler_share_bps,
            gateway.key()
        );

        Ok(())
    }
}
