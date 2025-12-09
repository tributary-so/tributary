use crate::{
    constants::*, error::TributaryError, state::*, utils::calculate_next_payment_due,
};
use anchor_lang::{prelude::*, solana_program::program_option::COption};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// Add this helper function to your program
pub fn token_account_has_delegate(
    token_account: &TokenAccount,
    expected_delegate: &Pubkey,
) -> bool {
    match token_account.delegate {
        COption::Some(delegate) => delegate == *expected_delegate,
        COption::None => false,
    }
}

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// CHECK: The gateway authority that can trigger payments
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
        constraint = gateway.signer == fee_payer.key() || user_payment.owner == fee_payer.key(),
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
        constraint = token_account_has_delegate(&user_token_account, &payments_delegate.key()) @ crate::error::TributaryError::NoDelegateSet,
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

pub fn handler_execute_payment(
    ctx: Context<ExecutePayment>,
    payment_amount: Option<u64>,
) -> Result<()> {
    let payment_policy = &mut ctx.accounts.payment_policy;
    let user_payment = &mut ctx.accounts.user_payment;
    let gateway = &mut ctx.accounts.gateway;
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;

    // Update policy based on type and get payment details
    // This also updates next_payment_due for subscriptions and current_milestone for milestones
    let payment_amount = match &mut payment_policy.policy_type {
        PolicyType::Subscription {
            amount,
            next_payment_due,
            payment_frequency,
            ..
        } => {
            // Validate payment timing for subscriptions
            require!(
                clock.unix_timestamp >= *next_payment_due,
                crate::error::TributaryError::PaymentNotDue
            );

            // Calculate next payment due time based on payment frequency
            let new_next_due = calculate_next_payment_due(
                *next_payment_due,
                payment_frequency,
                clock.unix_timestamp,
            )?;
            *next_payment_due = new_next_due;

            *amount
        }
        PolicyType::Milestone {
            milestone_amounts,
            milestone_timestamps,
            current_milestone,
            release_condition,
            total_milestones,
            ..
        } => {
            let milestone_idx = *current_milestone as usize;
            let amount = milestone_amounts[milestone_idx];
            let next_due = milestone_timestamps[milestone_idx];

            // Validate payment timing for milestones
            match release_condition {
                0 => {
                    // Time-based
                    require!(
                        clock.unix_timestamp >= next_due,
                        crate::error::TributaryError::PaymentNotDue
                    );
                }
                1 => { // Manual approval - always allow (checked by signer)
                     // Manual approval requires specific signer permission
                }
                2 => { // Automatic - always allow
                     // Automatic releases don't check timing
                }
                _ => return err!(crate::error::TributaryError::InvalidAmount),
            }

            // Move to next milestone
            *current_milestone += 1;

            // If we've completed all milestones, pause the policy
            if *current_milestone >= *total_milestones {
                payment_policy.status = PaymentStatus::Paused;
            }

            amount
        }
        PolicyType::PayAsYouGo {
            max_amount_per_period,
            max_chunk_amount,
            period_length_seconds,
            current_period_start,
            current_period_total,
            ..
        } => {
            // Check if we need to reset the period
            let period_end = *current_period_start + *period_length_seconds as i64;
            if clock.unix_timestamp >= period_end {
                // Reset period
                *current_period_start = clock.unix_timestamp;
                *current_period_total = 0;
            }

            // For pay-as-you-go, payment amount is specified by the gateway/provider
            let payment_amount = payment_amount.unwrap_or(*max_chunk_amount);

            // Validate chunk amount doesn't exceed max_chunk_amount
            require!(
                payment_amount <= *max_chunk_amount,
                crate::error::TributaryError::InvalidAmount
            );

            // Validate period limit won't be exceeded
            require!(
                *current_period_total + payment_amount <= *max_amount_per_period,
                crate::error::TributaryError::InvalidAmount
            );

            // Update period total
            *current_period_total += payment_amount;

            payment_amount
        }
    };

    // Validate delegated amount is sufficient
    require!(
        ctx.accounts.user_token_account.delegated_amount >= payment_amount,
        TributaryError::InsufficientDelegatedAmount
    );

    // Check if user has sufficient balance
    require!(
        ctx.accounts.user_token_account.amount >= payment_amount,
        crate::error::TributaryError::InsufficientBalance
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

    // Update payment policy
    payment_policy.total_paid = payment_policy
        .total_paid
        .checked_add(payment_amount)
        .unwrap();
    payment_policy.payment_count = payment_policy.payment_count.checked_add(1).unwrap();
    payment_policy.updated_at = clock.unix_timestamp;

    // Check if payment should be paused based on policy type
    match &payment_policy.policy_type {
        PolicyType::Subscription { max_renewals, .. } => {
            if let Some(max_renewal) = max_renewals {
                if payment_policy.payment_count >= *max_renewal {
                    payment_policy.status = PaymentStatus::Paused;
                }
            }
        }
        PolicyType::Milestone { .. } => {
            // Milestone completion check is handled above when updating current_milestone
        }
        PolicyType::PayAsYouGo { .. } => {
            // Pay-as-you-go policies don't pause based on payment count
            // They continue until manually paused or period limits are reached
        }
    }

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
