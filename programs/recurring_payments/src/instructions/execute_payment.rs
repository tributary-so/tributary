use crate::{constants::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// CHECK: The gateway authority that can trigger payments
    pub gateway_authority: Signer<'info>,

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
        constraint = payment_policy.status == PaymentStatus::Active,
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
        constraint = gateway.authority == gateway_authority.key(),
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
        constraint = user_token_account.delegate.unwrap() == payments_delegate.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = recipient_token_account.mint == user_payment.token_mint,
        constraint = recipient_token_account.owner == payment_policy.recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = gateway_fee_account.mint == user_payment.token_mint,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
    )]
    pub gateway_fee_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = protocol_fee_account.mint == user_payment.token_mint,
        constraint = protocol_fee_account.owner == config.fee_recipient,
    )]
    pub protocol_fee_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler_execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
    let payment_policy = &mut ctx.accounts.payment_policy;
    let user_payment = &mut ctx.accounts.user_payment;
    let gateway = &mut ctx.accounts.gateway;
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;

    // Validate payment timing
    require!(
        clock.unix_timestamp >= payment_policy.next_payment_due,
        crate::error::RecurringPaymentsError::PaymentNotDue
    );

    // Get payment amount from policy
    let payment_amount = match &payment_policy.policy_type {
        PolicyType::Subscription { amount, .. } => *amount,
    };

    // Check if user has sufficient balance
    require!(
        ctx.accounts.user_token_account.amount >= payment_amount,
        crate::error::RecurringPaymentsError::InsufficientBalance
    );

    // Calculate fees
    let gateway_fee = payment_amount
        .checked_mul(gateway.gateway_fee_bps as u64)
        .unwrap()
        .checked_div(10000)
        .unwrap();

    let protocol_fee = payment_amount
        .checked_mul(config.protocol_fee_bps as u64)
        .unwrap()
        .checked_div(10000)
        .unwrap();

    let recipient_amount = payment_amount
        .checked_sub(gateway_fee)
        .unwrap()
        .checked_sub(protocol_fee)
        .unwrap();

    // Transfer to recipient
    if recipient_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.payments_delegate.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds = &[PAYMENTS_SEED, &[ctx.bumps.payments_delegate]];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, recipient_amount)?;
    }

    // Transfer gateway fee
    if gateway_fee > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.gateway_fee_account.to_account_info(),
            authority: ctx.accounts.payments_delegate.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds = &[PAYMENTS_SEED, &[ctx.bumps.payments_delegate]];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, gateway_fee)?;
    }

    // Transfer protocol fee
    if protocol_fee > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.protocol_fee_account.to_account_info(),
            authority: ctx.accounts.payments_delegate.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds = &[PAYMENTS_SEED, &[ctx.bumps.payments_delegate]];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, protocol_fee)?;
    }

    // Calculate next payment due time
    let interval = match &payment_policy.policy_type {
        PolicyType::Subscription {
            interval_seconds, ..
        } => *interval_seconds,
    };
    payment_policy.next_payment_due = clock.unix_timestamp + interval as i64;

    // Update payment policy
    payment_policy.total_paid = payment_policy
        .total_paid
        .checked_add(payment_amount)
        .unwrap();
    payment_policy.payment_count = payment_policy.payment_count.checked_add(1).unwrap();
    payment_policy.updated_at = clock.unix_timestamp;

    // Update gateway
    gateway.total_processed = gateway.total_processed.checked_add(payment_amount).unwrap();

    // Update user payment account
    user_payment.updated_at = clock.unix_timestamp;

    // Emit payment record event
    emit!(PaymentRecord {
        payment_policy: payment_policy.key(),
        gateway: gateway.key(),
        amount: payment_amount,
        timestamp: clock.unix_timestamp,
        transaction_signature: "".to_string(), // This would be populated by the client
        payment_type: "subscription".to_string(),
        success: true,
        failure_reason: None,
        memo: payment_policy.memo,
        record_id: payment_policy.payment_count,
    });

    msg!(
        "Payment executed: {} tokens transferred to recipient, {} gateway fee, {} protocol fee",
        recipient_amount,
        gateway_fee,
        protocol_fee
    );

    Ok(())
}
