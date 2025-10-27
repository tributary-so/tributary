use crate::{constants::*, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ChangeGatewaySigner<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key()
    )]
    pub gateway: Account<'info, PaymentGateway>,

    /// CHECK: The new signer that will be authorized to execute payments
    pub new_signer: UncheckedAccount<'info>,
}

pub fn handler_change_gateway_signer(ctx: Context<ChangeGatewaySigner>) -> Result<()> {
    let gateway = &mut ctx.accounts.gateway;

    let old_signer = gateway.signer;
    gateway.signer = ctx.accounts.new_signer.key();

    emit!(GatewaySignerChanged {
        gateway: gateway.key(),
        old_signer,
        new_signer: gateway.signer,
    });

    msg!(
        "Gateway signer changed from {:?} to {:?} for gateway: {:?}",
        old_signer,
        gateway.signer,
        gateway.key()
    );

    Ok(())
}
