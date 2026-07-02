use crate::{
    constants::*,
    error::TributaryError,
    shared::mint::validate_mint_compatible,
    shared::referral::{process_referral_rewards, AuthorityMode},
    state::events::PaymentRecord,
    state::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TransferChecked};
use qedgen_macros::qed;

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
    #[qed(
        verified,
        spec = "../../tributary.qedspec",
        handler = "transfer",
        hash = "85195375ee7ac9aa",
        spec_hash = "f538239f9190a8bd"
    )]
    pub fn handler(
        ctx: Context<'_, '_, 'info, 'info, TransferTokens<'info>>,
        amount: u64,
        memo: [u8; 64],
    ) -> Result<()> {
        require!(amount > 0, TributaryError::InvalidAmount);

        let remaining_accounts = ctx.remaining_accounts;
        let accounts = &ctx.accounts;

        // Reject mints with dangerous Token-2022 extensions (e.g. PermanentDelegate,
        // NonTransferable) that would corrupt this transfer's accounting.
        validate_mint_compatible(&accounts.mint.to_account_info())?;
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

        // Transfer is always gross-mode (recipient_amount = amount - fees),
        // so total_from_user == amount and is not used here.
        let fee_breakdown = crate::shared::fees::calculate_fees(
            amount,
            gateway.gateway_fee_bps,
            gateway.effective_protocol_share_bps(config.protocol_share_bps),
            gateway.scheduler_share_bps,
            gateway.referral_allocation_bps,
            gateway.is_referral_enabled(),
            false,
        )?;
        let protocol_cut = fee_breakdown.protocol_cut;
        let scheduler_cut = fee_breakdown.scheduler_cut;
        let recipient_amount = fee_breakdown.recipient_amount;

        require!(
            accounts.from.amount >= amount,
            TributaryError::InsufficientBalance
        );

        // Process referral rewards if enabled (helper short-circuits when off).
        // NOTE: payment_policy_key = Pubkey::default() is a sentinel for
        // "no policy" — see audit finding L2. Not fixed here per M2 scope.
        let _referral_pool = process_referral_rewards(
            gateway,
            fee_breakdown.total_fee,
            remaining_accounts,
            from_info.clone(),
            authority_info.clone(),
            AuthorityMode::Direct,
            token_program_info.clone(),
            mint_info.clone(),
            mint_decimals,
            expected_mint,
            gateway.key(),
            Pubkey::default(),
            amount,
            clock.unix_timestamp,
            accounts.from.owner,
        )?;

        let gateway_amount = fee_breakdown
            .gateway_residual
            .checked_add(scheduler_cut)
            .ok_or(TributaryError::ArithmeticOverflow)?;

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

        if gateway_amount > 0 {
            let cpi_accounts = TransferChecked {
                from: from_info.clone(),
                mint: mint_info.clone(),
                to: gateway_fee_info,
                authority: authority_info.clone(),
            };
            let cpi_ctx = CpiContext::new(token_program_info.clone(), cpi_accounts);
            token_interface::transfer_checked(cpi_ctx, gateway_amount, mint_decimals)?;
        }

        if protocol_cut > 0 {
            let cpi_accounts = TransferChecked {
                from: from_info,
                mint: mint_info,
                to: protocol_fee_info,
                authority: authority_info,
            };
            let cpi_ctx = CpiContext::new(token_program_info, cpi_accounts);
            token_interface::transfer_checked(cpi_ctx, protocol_cut, mint_decimals)?;
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
            gateway_amount,
            protocol_cut
        );

        Ok(())
    }
}
