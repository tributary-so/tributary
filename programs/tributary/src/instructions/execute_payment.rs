use crate::{
    constants::*,
    error::TributaryError,
    policies::*,
    state::*,
    utils::{process_referral_rewards, AuthorityMode, ReferralContext},
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TransferChecked};

pub fn token_account_has_delegate(delegate: &COption<Pubkey>, expected_delegate: &Pubkey) -> bool {
    match delegate {
        COption::Some(delegate) => delegate == expected_delegate,
        COption::None => false,
    }
}

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// CHECK: The gateway authority that can trigger payments
    #[account(
        constraint = (
            fee_payer.key() == gateway.signer      // gateway can execute
            || fee_payer.key() == user_payment.owner  // payer can execute
            || fee_payer.key() == payment_policy.recipient // recipient can only execute pay-as-you-go!
        ),
    )]
    pub fee_payer: Signer<'info>,

    #[account(
        seeds = [PAYMENTS_SEED],
        bump
    )]
    /// CHECK: Program-derived delegate authority for token transfers
    pub payments_delegate: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [PAYMENT_POLICY_SEED, payment_policy.user_payment.as_ref(), payment_policy.policy_id.to_le_bytes().as_ref()],
        bump = payment_policy.bump,
        constraint = payment_policy.status == PaymentStatus::Active @ crate::error::TributaryError::PolicyPaused,
    )]
    pub payment_policy: Box<Account<'info, PaymentPolicy>>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, user_payment.owner.as_ref(), user_payment.token_mint.as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.is_active,
    )]
    pub user_payment: Box<Account<'info, UserPayment>>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, gateway.authority.as_ref()],
        bump = gateway.bump,
        constraint = gateway.is_active,
        constraint = gateway.key() == payment_policy.gateway,
    )]
    pub gateway: Box<Account<'info, PaymentGateway>>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause,
    )]
    pub config: Box<Account<'info, ProgramConfig>>,

    #[account(
        mut,
        constraint = user_token_account.key() == user_payment.token_account,
        constraint = user_token_account.mint == user_payment.token_mint,
        constraint = token_account_has_delegate(&user_token_account.delegate, &payments_delegate.key()) @ crate::error::TributaryError::NoDelegateSet,
        constraint = user_token_account.key() != recipient_token_account.key() @ TributaryError::InvalidAmount,
        constraint = user_token_account.key() != gateway_fee_account.key() @ TributaryError::InvalidAmount,
        constraint = user_token_account.key() != protocol_fee_account.key() @ TributaryError::InvalidAmount,
    )]
    pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account()]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        constraint = recipient_token_account.mint == user_payment.token_mint,
        constraint = recipient_token_account.owner == payment_policy.recipient,
        constraint = recipient_token_account.key() != gateway_fee_account.key() @ TributaryError::InvalidAmount,
        constraint = recipient_token_account.key() != protocol_fee_account.key() @ TributaryError::InvalidAmount,
    )]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = gateway_fee_account.mint == user_payment.token_mint,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
        constraint = gateway_fee_account.key() != protocol_fee_account.key() @ TributaryError::InvalidAmount,
    )]
    pub gateway_fee_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = protocol_fee_account.mint == user_payment.token_mint,
        constraint = protocol_fee_account.owner == config.fee_recipient,
    )]
    pub protocol_fee_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> ExecutePayment<'info> {
    pub fn handler(
        ctx: Context<'_, '_, 'info, 'info, ExecutePayment<'info>>,
        payment_amount: Option<u64>,
    ) -> Result<()> {
        let remaining_accounts = ctx.remaining_accounts;
        let accounts = ctx.accounts;
        let payment_policy = &mut accounts.payment_policy;
        let user_payment = &mut accounts.user_payment;
        let gateway = &accounts.gateway;
        let config = &accounts.config;
        let clock = Clock::get()?;
        let payment_policy_key = payment_policy.key();
        let fee_payer_key = accounts.fee_payer.key();
        let user_owner = user_payment.owner;
        let user_token_account_info = accounts.user_token_account.to_account_info();
        let recipient_token_account_info = accounts.recipient_token_account.to_account_info();
        let gateway_fee_account_info = accounts.gateway_fee_account.to_account_info();
        let protocol_fee_account_info = accounts.protocol_fee_account.to_account_info();
        let payments_delegate_info = accounts.payments_delegate.to_account_info();
        let token_program_info = accounts.token_program.to_account_info();
        let mint_info = accounts.mint.to_account_info();
        let mint_decimals = accounts.mint.decimals;
        let payments_delegate_bump = ctx.bumps.payments_delegate;
        let expected_mint = accounts.user_token_account.mint;

        // Get appropriate strategy for policy type
        let mut strategy = crate::policies::get_policy_strategy(payment_policy)?;

        // Execute policy-specific logic
        let execution_result = strategy.execute(
            payment_policy,
            payment_amount,
            clock.unix_timestamp,
            &fee_payer_key,
            &user_owner,
            gateway,
        )?;
        let payment_amount = execution_result.payment_amount;

        // Only in the case of PayAsYouGo can the recipient trigger payments
        if fee_payer_key == payment_policy.recipient {
            if !matches!(&payment_policy.policy_type, PolicyType::PayAsYouGo { .. }) {
                return Err(TributaryError::Unauthorized.into());
            }
        }

        // Additional validation for pay-as-you-go policies
        if let PolicyType::PayAsYouGo { .. } = &payment_policy.policy_type {
            let mut payg_strategy = PayAsYouGoStrategy;
            payg_strategy.validate_payment_constraints(
                payment_policy,
                payment_amount,
                clock.unix_timestamp,
            )?;
            payg_strategy.update_period_total(
                payment_policy,
                payment_amount,
                clock.unix_timestamp,
            )?;
        }

        // Calculate fees (same calculation for both modes)
        let mut gateway_fee = payment_amount
            .checked_mul(gateway.gateway_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let protocol_fee_bps = if gateway.is_custom_protocol_fee_enabled() {
            gateway.custom_protocol_fee_bps
        } else {
            config.protocol_fee_bps
        };

        let protocol_fee = payment_amount
            .checked_mul(protocol_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        // Calculate recipient amount and total based on net/gross mode
        let (recipient_amount, total_amount_from_user) = if gateway.is_amount_net() {
            // Net mode: payment_amount is what recipient receives, fees added on top
            let total = payment_amount
                .checked_add(gateway_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?
                .checked_add(protocol_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            (payment_amount, total)
        } else {
            // Gross mode (default): payment_amount includes fees, recipient gets less
            let recipient = payment_amount
                .checked_sub(gateway_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?
                .checked_sub(protocol_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            (recipient, payment_amount)
        };

        // Validate delegated amount is sufficient
        require!(
            accounts.user_token_account.delegated_amount >= total_amount_from_user,
            TributaryError::InsufficientDelegatedAmount
        );

        // Check if user has sufficient balance
        require!(
            accounts.user_token_account.amount >= total_amount_from_user,
            crate::error::TributaryError::InsufficientBalance
        );

        let seeds = &[PAYMENTS_SEED, &[payments_delegate_bump]];
        let signer_seeds = &[&seeds[..]];

        // Process referral rewards if enabled
        if gateway.is_referral_enabled() && gateway.referral_allocation_bps > 0 {
            let referral_ctx = ReferralContext {
                remaining_accounts,
                source_token_account: user_token_account_info.clone(),
                authority_info: payments_delegate_info.clone(),
                authority_mode: AuthorityMode::PdaSigner(signer_seeds),
                token_program: token_program_info.clone(),
                mint_info: mint_info.clone(),
                mint_decimals,
                expected_mint,
                gateway_key: gateway.key(),
                payment_policy_key,
                payment_amount,
                timestamp: clock.unix_timestamp,
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

        // Transfer to recipient
        if recipient_amount > 0 {
            let cpi_accounts = TransferChecked {
                from: user_token_account_info.clone(),
                mint: mint_info.clone(),
                to: recipient_token_account_info.clone(),
                authority: payments_delegate_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, signer_seeds);
            token_interface::transfer_checked(cpi_ctx, recipient_amount, mint_decimals)?;
        }

        // Transfer gateway fee
        if gateway_fee > 0 {
            let cpi_accounts = TransferChecked {
                from: user_token_account_info.clone(),
                mint: mint_info.clone(),
                to: gateway_fee_account_info.clone(),
                authority: payments_delegate_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, signer_seeds);
            token_interface::transfer_checked(cpi_ctx, gateway_fee, mint_decimals)?;
        }

        // Transfer protocol fee
        if protocol_fee > 0 {
            let cpi_accounts = TransferChecked {
                from: user_token_account_info.clone(),
                mint: mint_info.clone(),
                to: protocol_fee_account_info.clone(),
                authority: payments_delegate_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, signer_seeds);
            token_interface::transfer_checked(cpi_ctx, protocol_fee, mint_decimals)?;
        }

        payment_policy.total_paid = payment_policy
            .total_paid
            .checked_add(total_amount_from_user)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        payment_policy.payment_count = payment_policy
            .payment_count
            .checked_add(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        payment_policy.updated_at = clock.unix_timestamp;

        // Pause policy if needed based on strategy recommendation
        if execution_result.should_pause {
            payment_policy.status = PaymentStatus::Paused;
        }

        // Update user payment account
        user_payment.updated_at = clock.unix_timestamp;

        // Emit payment record event
        emit!(PaymentRecord {
            payment_policy: payment_policy.key(),
            gateway: gateway.key(),
            amount: payment_amount,
            timestamp: clock.unix_timestamp,
            memo: payment_policy.memo,
            record_id: payment_policy.payment_count,
            payer: user_payment.owner,
            recipient: accounts.recipient_token_account.owner.key(),
        });

        msg!(
            "Payment executed: {} -> recipient, {} gateway fee, {} protocol fee",
            recipient_amount,
            gateway_fee,
            protocol_fee
        );

        Ok(())
    }
}
