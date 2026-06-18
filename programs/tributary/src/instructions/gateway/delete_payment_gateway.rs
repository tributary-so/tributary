use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct DeletePaymentGateway<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: The authority that owns the gateway
    pub authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        close = admin
    )]
    pub gateway: Account<'info, PaymentGateway>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key(),
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> DeletePaymentGateway<'info> {
    /// Delete a payment gateway and close account.
    pub fn handler_delete_payment_gateway(ctx: Context<DeletePaymentGateway>) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        emit!(PaymentGatewayDeleted {
            gateway: gateway.key(),
            authority: gateway.authority,
            name: gateway.name,
        });

        msg!(
            "Payment gateway deleted with authority: {:?}, name: {:?}",
            gateway.authority,
            String::from_utf8_lossy(&gateway.name)
        );

        Ok(())
    }
}
