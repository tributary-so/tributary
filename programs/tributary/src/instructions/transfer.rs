use crate::state::events::PaymentRecord;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = from.mint == to.mint @ crate::error::TributaryError::TokenMintMismatch,
    )]
    pub to: Account<'info, TokenAccount>,

    #[account(
        constraint = from.owner == authority.key() @ crate::error::TributaryError::Unauthorized,
    )]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

impl<'info> TransferTokens<'info> {
    pub fn handler(ctx: Context<TransferTokens>, amount: u64, memo: [u8; 64]) -> Result<()> {
        require!(amount > 0, crate::error::TributaryError::InvalidAmount);

        require!(
            ctx.accounts.from.amount >= amount,
            crate::error::TributaryError::InsufficientBalance
        );

        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        let clock = Clock::get()?;

        emit!(PaymentRecord {
            payment_policy: Pubkey::default(), // unused
            gateway: Pubkey::default(),        // unused
            amount,
            timestamp: clock.unix_timestamp,
            memo,
            record_id: 0,
            payer: ctx.accounts.from.key(),
            recipient: ctx.accounts.to.key(),
        });

        msg!(
            "Transfer executed: {} tokens from {} to {}",
            amount,
            ctx.accounts.from.key(),
            ctx.accounts.to.key()
        );

        Ok(())
    }
}
