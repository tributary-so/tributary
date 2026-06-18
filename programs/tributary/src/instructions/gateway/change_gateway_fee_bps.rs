use crate::constants::*;
use crate::error::TributaryError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ChangeGatewayFeeBps<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Account<'info, PaymentGateway>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> ChangeGatewayFeeBps<'info> {
    pub fn handler_change_gateway_fee_bps(
        ctx: Context<ChangeGatewayFeeBps>,
        new_fee_bps: u16,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;
        let old_fee_bps = gateway.gateway_fee_bps;

        require!(new_fee_bps <= 10000, TributaryError::InvalidFeeBps);

        gateway.gateway_fee_bps = new_fee_bps;

        // H-01: combined BPS (gateway + effective protocol fee) must stay < 10000.
        // Use the gateway's effective protocol fee — if the custom-fee flag is
        // set, the custom value overrides the global default at execution time.
        let effective_protocol_bps =
            gateway.effective_protocol_fee_bps(ctx.accounts.config.protocol_fee_bps);
        gateway.validate_combined_bps(effective_protocol_bps)?;

        emit!(GatewayFeeBpsChanged {
            gateway: gateway.key(),
            old_fee_bps,
            new_fee_bps,
        });

        msg!(
            "Gateway fee BPS changed from {} to {} for gateway: {:?}",
            old_fee_bps,
            new_fee_bps,
            gateway.key()
        );

        Ok(())
    }
}
