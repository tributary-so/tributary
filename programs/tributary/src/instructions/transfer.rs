use crate::{
    constants::*,
    error::TributaryError,
    state::events::PaymentRecord,
    state::*,
    utils::{process_referral_rewards, AuthorityMode, ReferralContext},
};
use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(
        constraint = from.owner == authority.key() @ TributaryError::Unauthorized,
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause,
    )]
    pub config: Box<Account<'info, ProgramConfig>>,

    #[account(
        seeds = [GATEWAY_SEED, gateway.authority.as_ref()],
        bump = gateway.bump,
        constraint = gateway.is_active,
    )]
    pub gateway: Box<Account<'info, PaymentGateway>>,

    #[account(
        mut,
        constraint = from.mint == mint.key() @ TributaryError::TokenMintMismatch,
    )]
    pub from: InterfaceAccount<'info, TokenAccount>,

    #[account()]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = from.mint == to.mint @ TributaryError::TokenMintMismatch,
        constraint = to.key() != from.key() @ TributaryError::DistinctPubKeysRequired,
    )]
    pub to: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = gateway_fee_account.mint == from.mint @ TributaryError::TokenMintMismatch,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
    )]
    pub gateway_fee_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = protocol_fee_account.mint == from.mint @ TributaryError::TokenMintMismatch,
        constraint = protocol_fee_account.owner == config.fee_recipient,
    )]
    pub protocol_fee_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> TransferTokens<'info> {
    pub fn handler(
        ctx: Context<'_, '_, 'info, 'info, TransferTokens<'info>>,
        amount: u64,
        memo: [u8; 64],
    ) -> Result<()> {
        require!(amount > 0, TributaryError::InvalidAmount);

        let remaining_accounts = ctx.remaining_accounts;
        let accounts = &ctx.accounts;
        let config = &accounts.config;
        let gateway = &accounts.gateway;
        let clock = Clock::get()?;
        let mint_decimals = accounts.mint.decimals;
        let mint_key = accounts.mint.key();

        let from_info = accounts.from.to_account_info();
        let mint_info = accounts.mint.to_account_info();
        let to_info = accounts.to.to_account_info();
        let gateway_fee_info = accounts.gateway_fee_account.to_account_info();
        let protocol_fee_info = accounts.protocol_fee_account.to_account_info();
        let authority_info = accounts.authority.to_account_info();
        let token_program_info = accounts.token_program.to_account_info();
        let expected_mint = accounts.from.mint;

        let mut gateway_fee = amount
            .checked_mul(gateway.gateway_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let protocol_fee_bps = if gateway.is_custom_protocol_fee_enabled() {
            gateway.custom_protocol_fee_bps
        } else {
            config.protocol_fee_bps
        };

        let protocol_fee = amount
            .checked_mul(protocol_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let recipient_amount = amount
            .checked_sub(gateway_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_sub(protocol_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        require!(
            accounts.from.amount >= amount,
            TributaryError::InsufficientBalance
        );

        if gateway.is_referral_enabled() && gateway.referral_allocation_bps > 0 {
            let referral_ctx = ReferralContext {
                remaining_accounts,
                source_token_account: from_info.clone(),
                authority_info: authority_info.clone(),
                authority_mode: AuthorityMode::Direct,
                token_program: token_program_info.clone(),
                mint_info: mint_info.clone(),
                mint_decimals,
                expected_mint,
                gateway_key: gateway.key(),
                payment_policy_key: Pubkey::default(),
                payment_amount: amount,
                timestamp: clock.unix_timestamp,
                payer_wallet: accounts.from.owner,
            };
            let referral_pool = process_referral_rewards(
                referral_ctx,
                gateway_fee,
                gateway.referral_allocation_bps,
                &gateway.referral_tiers_bps,
            )?;

            gateway_fee = gateway_fee
                .checked_sub(referral_pool)
                .ok_or(TributaryError::ArithmeticOverflow)?;
        }

        if recipient_amount > 0 {
            let cpi_accounts = TransferChecked {
                from: from_info.clone(),
                mint: mint_info.clone(),
                to: to_info,
                authority: authority_info.clone(),
            };
            let cpi_ctx = CpiContext::new(token_program_info.clone(), cpi_accounts);
            token_interface::transfer_checked(cpi_ctx, recipient_amount, mint_decimals)?;
        }

        if gateway_fee > 0 {
            let cpi_accounts = TransferChecked {
                from: from_info.clone(),
                mint: mint_info.clone(),
                to: gateway_fee_info,
                authority: authority_info.clone(),
            };
            let cpi_ctx = CpiContext::new(token_program_info.clone(), cpi_accounts);
            token_interface::transfer_checked(cpi_ctx, gateway_fee, mint_decimals)?;
        }

        if protocol_fee > 0 {
            let cpi_accounts = TransferChecked {
                from: from_info,
                mint: mint_info,
                to: protocol_fee_info,
                authority: authority_info,
            };
            let cpi_ctx = CpiContext::new(token_program_info, cpi_accounts);
            token_interface::transfer_checked(cpi_ctx, protocol_fee, mint_decimals)?;
        }

        emit!(PaymentRecord {
            payment_policy: Pubkey::default(),
            gateway: gateway.key(),
            amount,
            timestamp: clock.unix_timestamp,
            memo,
            record_id: 0,
            payer: accounts.from.owner,
            recipient: accounts.to.owner.key(),
            token_mint: mint_key,
        });

        msg!(
            "Transfer executed: {} (recipient: {}, gateway fee: {}, protocol fee: {})",
            recipient_amount,
            accounts.to.key(),
            gateway_fee,
            protocol_fee
        );

        Ok(())
    }
}
