use crate::{constants::*, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreatePaymentGateway<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: The authority that will own the gateway
    pub authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        space = PaymentGateway::SIZE,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump
    )]
    pub gateway: Account<'info, PaymentGateway>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key()
    )]
    pub config: Account<'info, ProgramConfig>,

    /// CHECK: This is the fee recipient account that will receive gateway fees
    pub fee_recipient: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler_create_payment_gateway(
    ctx: Context<CreatePaymentGateway>,
    gateway_fee_bps: u16,
) -> Result<()> {
    let gateway = &mut ctx.accounts.gateway;
    let clock = Clock::get()?;

    gateway.authority = ctx.accounts.authority.key();
    gateway.fee_recipient = ctx.accounts.fee_recipient.key();
    gateway.gateway_fee_bps = gateway_fee_bps;
    gateway.is_active = true;
    gateway.total_processed = 0;
    gateway.created_at = clock.unix_timestamp;
    gateway.bump = ctx.bumps.gateway;

    msg!(
        "Payment gateway created with authority: {:?}, fee: {} bps",
        gateway.authority,
        gateway.gateway_fee_bps
    );

    Ok(())
}
