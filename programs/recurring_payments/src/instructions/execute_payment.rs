use crate::{constants::*, state::*};
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
        constraint = gateway.authority == gateway_authority.key() || user_payment.owner == gateway_authority.key(),
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
        constraint = token_account_has_delegate(&user_token_account, &payments_delegate.key()) @ crate::error::RecurringPaymentsError::NoDelegateSet,
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

    // Calculate next payment due time based on payment frequency
    payment_policy.next_payment_due = calculate_next_payment_due(
        payment_policy.next_payment_due,
        &payment_policy.payment_frequency,
        clock.unix_timestamp,
    )?;

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

/// Calculate the next payment due date based on payment frequency
fn calculate_next_payment_due(
    current_due: i64,
    frequency: &PaymentFrequency,
    current_timestamp: i64,
) -> Result<i64> {
    let mut next_due = current_due;

    match frequency {
        PaymentFrequency::Daily => {
            // Add 24 hours (86400 seconds)
            while next_due <= current_timestamp {
                next_due += 86400;
            }
        }
        PaymentFrequency::Weekly => {
            // Add 7 days (604800 seconds)
            while next_due <= current_timestamp {
                next_due += 604800;
            }
        }
        PaymentFrequency::Monthly => {
            // Add one month, maintaining the same day
            while next_due <= current_timestamp {
                next_due = add_months(next_due, 1)?;
            }
        }
        PaymentFrequency::Quarterly => {
            // Add 3 months, maintaining the same day
            while next_due <= current_timestamp {
                next_due = add_months(next_due, 3)?;
            }
        }
        PaymentFrequency::SemiAnnually => {
            // Add 6 months, maintaining the same day
            while next_due <= current_timestamp {
                next_due = add_months(next_due, 6)?;
            }
        }
        PaymentFrequency::Annually => {
            // Add 12 months, maintaining the same day
            while next_due <= current_timestamp {
                next_due = add_months(next_due, 12)?;
            }
        }
        PaymentFrequency::Custom(interval_seconds) => {
            // Add custom interval in seconds
            while next_due <= current_timestamp {
                next_due += *interval_seconds as i64;
            }
        }
    }

    Ok(next_due)
}

/// Add months to a Unix timestamp, maintaining the same day of month
fn add_months(timestamp: i64, months: i32) -> Result<i64> {
    // Convert Unix timestamp to date components
    let days_since_epoch = timestamp / 86400;
    let seconds_in_day = timestamp % 86400;

    // Calculate year, month, day from days since epoch (1970-01-01)
    let mut year = 1970;
    let mut remaining_days = days_since_epoch as i32;

    // Handle years
    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days >= days_in_year {
            remaining_days -= days_in_year;
            year += 1;
        } else {
            break;
        }
    }

    // Handle months
    let mut month = 1;
    loop {
        let days_in_month = get_days_in_month(year, month);
        if remaining_days >= days_in_month {
            remaining_days -= days_in_month;
            month += 1;
        } else {
            break;
        }
    }

    let day = remaining_days + 1; // Days are 1-indexed

    // Add the requested months
    let mut new_month = month + months;
    let mut new_year = year;

    // Handle month overflow/underflow
    while new_month > 12 {
        new_month -= 12;
        new_year += 1;
    }
    while new_month < 1 {
        new_month += 12;
        new_year -= 1;
    }

    // Handle day overflow (e.g., Jan 31 + 1 month = Feb 28/29)
    let max_day_in_new_month = get_days_in_month(new_year, new_month);
    let new_day = if day > max_day_in_new_month {
        max_day_in_new_month
    } else {
        day
    };

    // Convert back to Unix timestamp
    let mut new_days_since_epoch = 0i64;

    // Add days for complete years
    for y in 1970..new_year {
        new_days_since_epoch += if is_leap_year(y) { 366 } else { 365 };
    }

    // Add days for complete months in the target year
    for m in 1..new_month {
        new_days_since_epoch += get_days_in_month(new_year, m) as i64;
    }

    // Add remaining days
    new_days_since_epoch += (new_day - 1) as i64;

    // Convert to timestamp
    let new_timestamp = new_days_since_epoch * 86400 + seconds_in_day;

    Ok(new_timestamp)
}

/// Check if a year is a leap year
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

/// Get the number of days in a given month and year
fn get_days_in_month(year: i32, month: i32) -> i32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}
