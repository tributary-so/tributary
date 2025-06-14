use crate::{error::ErrorCode, state::*, USER_PAYMENT_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Accounts)]
pub struct CreateUserPayment<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = UserPayment::SIZE,
        seeds = [USER_PAYMENT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub user_payment: Account<'info, UserPayment>,

    #[account(
        constraint = token_account.owner == owner.key(),
        constraint = token_account.mint == token_mint.key()
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = !config.emergency_pause @ ErrorCode::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler_create_user_payment(ctx: Context<CreateUserPayment>) -> Result<()> {
    let user_payment = &mut ctx.accounts.user_payment;
    let clock = Clock::get()?;

    user_payment.owner = ctx.accounts.owner.key();
    user_payment.token_account = ctx.accounts.token_account.key();
    user_payment.token_mint = ctx.accounts.token_mint.key();
    user_payment.active_policies_count = 0;
    user_payment.created_at = clock.unix_timestamp;
    user_payment.updated_at = clock.unix_timestamp;
    user_payment.is_active = true;
    user_payment.bump = ctx.bumps.user_payment;

    msg!("User payment account created for: {:?}", user_payment.owner);
    Ok(())
}
