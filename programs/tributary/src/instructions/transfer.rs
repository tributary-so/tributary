use crate::state::events::PaymentRecord;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub from: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = from.mint == to.mint @ crate::error::TributaryError::TokenMintMismatch,
        constraint = from.mint == mint.key() @ crate::error::TributaryError::TokenMintMismatch,
    )]
    pub to: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = from.owner == authority.key() @ crate::error::TributaryError::Unauthorized,
    )]
    pub authority: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> TransferTokens<'info> {
    pub fn handler(ctx: Context<TransferTokens>, amount: u64, memo: [u8; 64]) -> Result<()> {
        require!(amount > 0, crate::error::TributaryError::InvalidAmount);

        require!(
            ctx.accounts.from.amount >= amount,
            crate::error::TributaryError::InsufficientBalance
        );

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.from.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        let clock = Clock::get()?;

        emit!(PaymentRecord {
            payment_policy: Pubkey::default(),
            gateway: Pubkey::default(),
            amount,
            timestamp: clock.unix_timestamp,
            memo,
            record_id: 0,
            payer: ctx.accounts.from.owner.key(),
            recipient: ctx.accounts.to.owner.key(),
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
