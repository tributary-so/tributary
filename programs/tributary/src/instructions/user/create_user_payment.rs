use crate::{
    error::TributaryError, shared::mint::validate_mint_compatible, state::*, USER_PAYMENT_SEED,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Accounts)]
pub struct CreateUserPayment<'info> {
    /// CHECK: The owner account
    #[account()]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = fee_payer,
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
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub fee_payer: Signer<'info>,
}

impl<'info> CreateUserPayment<'info> {
    /// Create a new user payment account for given owner and token mint.
    pub fn handler_create_user_payment(ctx: Context<CreateUserPayment>) -> Result<()> {
        validate_mint_compatible(&ctx.accounts.token_mint.to_account_info())?;

        let user_payment = &mut ctx.accounts.user_payment;
        let clock = Clock::get()?;

        user_payment.owner = ctx.accounts.owner.key();
        user_payment.token_account = ctx.accounts.token_account.key();
        user_payment.token_mint = ctx.accounts.token_mint.key();
        user_payment.active_policies_count = 0;
        user_payment.created_policies_count = 0;
        user_payment.active_composable_count = 0;
        user_payment.created_composable_count = 0;
        user_payment.created_at = clock.unix_timestamp;
        user_payment.updated_at = clock.unix_timestamp;
        user_payment.is_active = true;
        user_payment.bump = ctx.bumps.user_payment;
        user_payment.rent_payer = ctx.accounts.fee_payer.key();

        emit!(UserPaymentCreated {
            owner: user_payment.owner,
            token_account: user_payment.token_account,
            token_mint: user_payment.token_mint,
        });

        msg!("User payment account created for: {:?}", user_payment.owner);
        Ok(())
    }
}
