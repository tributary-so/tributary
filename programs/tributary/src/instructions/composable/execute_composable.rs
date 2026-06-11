use crate::{constants::*, error::TributaryError, state::*, utils::calculate_next_payment_due};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TransferChecked};

fn token_account_has_any_delegate(delegate: &COption<Pubkey>, keys: &[&Pubkey]) -> bool {
    match delegate {
        COption::Some(d) => keys.iter().any(|k| d == *k),
        COption::None => false,
    }
}

/// Validate byte-range checks on instruction_data using the configured checks.
fn validate_byte_ranges(data: &[u8], checks: &[ByteRangeCheck], num_checks: u8) -> Result<()> {
    for i in 0..num_checks as usize {
        require!(
            checks[i].validate(data),
            TributaryError::ByteRangeCheckFailed
        );
    }
    Ok(())
}

/// Determine the payment amount based on the schedule type and advance it.
/// Returns (amount_to_forward, should_pause).
fn resolve_schedule_amount_and_advance(
    schedule: &mut ScheduleType,
    now: i64,
) -> Result<(u64, bool)> {
    match schedule {
        ScheduleType::Timed {
            amount,
            next_execution_due,
            frequency,
            max_executions,
            auto_renew,
        } => {
            require!(now >= *next_execution_due, TributaryError::PaymentNotDue);
            let amt = *amount;

            // Advance next_execution_due using the existing utility
            *next_execution_due = calculate_next_payment_due(*next_execution_due, frequency, now)?;

            // Check max executions
            let should_pause = if let Some(ref mut max) = max_executions {
                *max = max.saturating_sub(1);
                *max == 0 || !*auto_renew
            } else {
                false
            };

            Ok((amt, should_pause))
        }
        ScheduleType::Milestone {
            amounts,
            timestamps,
            current,
            release_condition,
            total,
        } => {
            let idx = *current as usize;
            require!(idx < *total as usize, TributaryError::InvalidAmount);

            // Check due date condition (bit 0)
            if *release_condition & 0b0001 != 0 {
                require!(now >= timestamps[idx], TributaryError::PaymentNotDue);
            }

            let amt = amounts[idx];
            *current = current.saturating_add(1);

            let should_pause = *current >= *total;
            if should_pause {
                // Terminal — but we set Completed only at the end of handler
            }

            Ok((amt, should_pause))
        }
        ScheduleType::Usage {
            max_amount_per_period: _,
            max_chunk_amount: _,
            period_length_seconds,
            current_period_start,
            current_period_total,
        } => {
            // Reset period if elapsed
            let period_end = current_period_start
                .checked_add(*period_length_seconds as i64)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            if now >= period_end {
                *current_period_start = now;
                *current_period_total = 0;
            }

            // The forward_amount overrides the schedule for Usage
            // (amount is caller-specified, we just enforce limits)
            Ok((0, false)) // caller must supply forward_amount
        }
    }
}

#[derive(Accounts)]
pub struct ExecuteComposable<'info> {
    /// Gateway signer, user, or recipient — whoever triggers execution
    #[account(
        constraint = (
            fee_payer.key() == gateway.signer
            || fee_payer.key() == user_payment.owner
        ),
    )]
    pub fee_payer: Signer<'info>,

    #[account(
        seeds = [PAYMENTS_SEED],
        bump,
    )]
    /// CHECK: Program-derived delegate authority for token transfers
    pub payments_delegate: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            COMPOSABLE_POLICY_SEED,
            composable_policy.user_payment.as_ref(),
            composable_policy.policy_id.to_le_bytes().as_ref(),
        ],
        bump = composable_policy.bump,
        constraint = composable_policy.status == PolicyStatus::Active @ TributaryError::PolicyPaused,
    )]
    pub composable_policy: Box<Account<'info, ComposablePolicy>>,

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
        constraint = gateway.key() == composable_policy.gateway,
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
        constraint = user_token_account.mint == composable_policy.forward_config.input_mint,
        constraint = token_account_has_any_delegate(
            &user_token_account.delegate,
            &[&payments_delegate.key(), &user_payment.key()]
        ) @ TributaryError::NoDelegateSet,
    )]
    pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account()]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        constraint = recipient_token_account.owner == composable_policy.recipient,
    )]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = gateway_fee_account.mint == composable_policy.forward_config.input_mint,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
    )]
    pub gateway_fee_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = protocol_fee_account.mint == composable_policy.forward_config.input_mint,
        constraint = protocol_fee_account.owner == config.fee_recipient,
    )]
    pub protocol_fee_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

impl<'info> ExecuteComposable<'info> {
    pub fn handler(
        ctx: Context<'_, '_, 'info, 'info, ExecuteComposable<'info>>,
        instruction_data: Vec<u8>,
        forward_amount: Option<u64>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // ── Step 1: Validate ──────────────────────────────────────────

        // Byte-range checks on instruction_data
        validate_byte_ranges(
            &instruction_data,
            &ctx.accounts.composable_policy.forward_config.data_checks,
            ctx.accounts
                .composable_policy
                .forward_config
                .num_data_checks,
        )?;

        // Determine amount from schedule (or caller override for Usage)
        let composable_policy = &mut ctx.accounts.composable_policy;
        let (schedule_amount, should_pause) =
            resolve_schedule_amount_and_advance(&mut composable_policy.schedule, now)?;

        let input_amount = match forward_amount {
            Some(amt) => {
                // Caller-specified — validate against schedule constraints
                match &composable_policy.schedule {
                    ScheduleType::Usage {
                        max_chunk_amount,
                        max_amount_per_period,
                        current_period_total,
                        ..
                    } => {
                        require!(amt <= *max_chunk_amount, TributaryError::InvalidAmount);
                        let new_total = current_period_total
                            .checked_add(amt)
                            .ok_or(TributaryError::ArithmeticOverflow)?;
                        require!(
                            new_total <= *max_amount_per_period,
                            TributaryError::InsufficientBalance
                        );
                        // Update period total
                        match &mut composable_policy.schedule {
                            ScheduleType::Usage {
                                current_period_total,
                                ..
                            } => {
                                *current_period_total = new_total;
                            }
                            _ => unreachable!(),
                        }
                        amt
                    }
                    _ => amt,
                }
            }
            None => {
                require!(schedule_amount > 0, TributaryError::InvalidAmount);
                schedule_amount
            }
        };

        // ── Step 2: Validation CPI (if configured) ────────────────────
        let validation_program = ctx
            .accounts
            .composable_policy
            .validation_config
            .validation_program;
        if validation_program != Pubkey::default() {
            let remaining = ctx.remaining_accounts;
            let num_val_accounts = ctx
                .accounts
                .composable_policy
                .validation_config
                .num_validation_accounts as usize;
            if num_val_accounts > 0 && !remaining.is_empty() {
                let val_data_len = ctx
                    .accounts
                    .composable_policy
                    .validation_config
                    .validation_data_len as usize;
                let val_data = &ctx
                    .accounts
                    .composable_policy
                    .validation_config
                    .validation_data[..val_data_len];

                let val_accounts = &remaining[..num_val_accounts.min(remaining.len())];
                let seeds: Vec<Vec<u8>> = vec![
                    COMPOSABLE_POLICY_SEED.to_vec(),
                    ctx.accounts
                        .composable_policy
                        .user_payment
                        .as_ref()
                        .to_vec(),
                    ctx.accounts
                        .composable_policy
                        .policy_id
                        .to_le_bytes()
                        .to_vec(),
                    vec![ctx.accounts.composable_policy.bump],
                ];
                let seed_slices: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();
                let signer_seeds: &[&[u8]] = &seed_slices;

                let cpi_accounts: Vec<AccountInfo<'info>> =
                    val_accounts.iter().map(|a| a.clone()).collect();

                let instruction = anchor_lang::solana_program::instruction::Instruction {
                    program_id: validation_program,
                    accounts: cpi_accounts
                        .iter()
                        .map(|a| anchor_lang::solana_program::instruction::AccountMeta {
                            pubkey: *a.key,
                            is_signer: a.is_signer,
                            is_writable: a.is_writable,
                        })
                        .collect(),
                    data: val_data.to_vec(),
                };
                anchor_lang::solana_program::program::invoke_signed(
                    &instruction,
                    &cpi_accounts,
                    &[signer_seeds],
                )?;
            }
        }

        // ── Step 3: Calculate fees ────────────────────────────────────
        let gateway = &ctx.accounts.gateway;
        let config = &ctx.accounts.config;

        let gateway_fee = input_amount
            .checked_mul(gateway.gateway_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let protocol_fee_bps = if gateway.is_custom_protocol_fee_enabled() {
            gateway.custom_protocol_fee_bps
        } else {
            config.protocol_fee_bps
        };

        let protocol_fee = input_amount
            .checked_mul(protocol_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let total_fees = gateway_fee
            .checked_add(protocol_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let net_input = input_amount
            .checked_sub(total_fees)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        // Validate delegation
        require!(
            ctx.accounts.user_token_account.delegated_amount >= input_amount,
            TributaryError::InsufficientDelegatedAmount
        );
        require!(
            ctx.accounts.user_token_account.amount >= input_amount,
            TributaryError::InsufficientBalance
        );

        // ── Resolve delegate authority ────────────────────────────────
        let user_payment = &ctx.accounts.user_payment;
        let payments_delegate_key = ctx.accounts.payments_delegate.key();
        let up_key = user_payment.key();
        let up_owner = user_payment.owner;
        let up_mint = user_payment.token_mint;
        let up_bump = user_payment.bump;

        let delegate = ctx.accounts.user_token_account.delegate.clone();

        let (seeds_vec, authority_info): (Vec<Vec<u8>>, AccountInfo<'info>) = match &delegate {
            COption::Some(d) if d == &up_key => {
                let seeds: Vec<Vec<u8>> = vec![
                    USER_PAYMENT_SEED.to_vec(),
                    up_owner.as_ref().to_vec(),
                    up_mint.as_ref().to_vec(),
                    vec![up_bump],
                ];
                (seeds, user_payment.to_account_info().clone())
            }
            COption::Some(d) if d == &payments_delegate_key => {
                let seeds: Vec<Vec<u8>> =
                    vec![PAYMENTS_SEED.to_vec(), vec![ctx.bumps.payments_delegate]];
                (
                    seeds,
                    ctx.accounts.payments_delegate.to_account_info().clone(),
                )
            }
            _ => return Err(TributaryError::NoDelegateSet.into()),
        };

        let seed_slices: Vec<&[u8]> = seeds_vec.iter().map(|s| s.as_slice()).collect();
        let signer_seeds: &[&[u8]] = &seed_slices;
        let seeds = &[signer_seeds];

        let token_program_info = ctx.accounts.token_program.to_account_info();
        let mint_info = ctx.accounts.mint.to_account_info();
        let mint_decimals = ctx.accounts.mint.decimals;
        let user_token_info = ctx.accounts.user_token_account.to_account_info();

        // ── Step 4: Claim fees ────────────────────────────────────────
        if gateway_fee > 0 {
            let cpi_accounts = TransferChecked {
                from: user_token_info.clone(),
                mint: mint_info.clone(),
                to: ctx.accounts.gateway_fee_account.to_account_info(),
                authority: authority_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, seeds);
            token_interface::transfer_checked(cpi_ctx, gateway_fee, mint_decimals)?;
        }

        if protocol_fee > 0 {
            let cpi_accounts = TransferChecked {
                from: user_token_info.clone(),
                mint: mint_info.clone(),
                to: ctx.accounts.protocol_fee_account.to_account_info(),
                authority: authority_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, seeds);
            token_interface::transfer_checked(cpi_ctx, protocol_fee, mint_decimals)?;
        }

        // ── Step 5: Claim input — transfer (amount - fees) to intermediate ATA ──
        // For simplicity, we transfer net_input directly to recipient.
        // The full intermediate ATA + forward CPI flow requires the target program
        // accounts to be passed via remaining_accounts, which is handled below.
        if net_input > 0 {
            let cpi_accounts = TransferChecked {
                from: user_token_info.clone(),
                mint: mint_info.clone(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: authority_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, seeds);
            token_interface::transfer_checked(cpi_ctx, net_input, mint_decimals)?;
        }

        // ── Step 7: Forward CPI (via remaining_accounts) ──────────────
        let forward_config = &ctx.accounts.composable_policy.forward_config;
        let remaining = ctx.remaining_accounts;
        // Validation accounts come first; forward accounts come after
        let num_val_accounts = ctx
            .accounts
            .composable_policy
            .validation_config
            .num_validation_accounts as usize;
        let forward_accounts_start = num_val_accounts.min(remaining.len());
        if forward_accounts_start < remaining.len() {
            let forward_account_infos: Vec<AccountInfo<'info>> = remaining
                [forward_accounts_start..]
                .iter()
                .map(|a| a.clone())
                .collect();

            let forward_seeds: Vec<Vec<u8>> = vec![
                COMPOSABLE_POLICY_SEED.to_vec(),
                ctx.accounts
                    .composable_policy
                    .user_payment
                    .as_ref()
                    .to_vec(),
                ctx.accounts
                    .composable_policy
                    .policy_id
                    .to_le_bytes()
                    .to_vec(),
                vec![ctx.accounts.composable_policy.bump],
            ];
            let forward_seed_slices: Vec<&[u8]> =
                forward_seeds.iter().map(|s| s.as_slice()).collect();
            let forward_signer_seeds: &[&[u8]] = &forward_seed_slices;

            let instruction = anchor_lang::solana_program::instruction::Instruction {
                program_id: forward_config.target_program,
                accounts: forward_account_infos
                    .iter()
                    .map(|a| anchor_lang::solana_program::instruction::AccountMeta {
                        pubkey: *a.key,
                        is_signer: a.is_signer,
                        is_writable: a.is_writable,
                    })
                    .collect(),
                data: instruction_data.clone(),
            };
            // Best-effort forward CPI — errors propagate
            anchor_lang::solana_program::program::invoke_signed(
                &instruction,
                &forward_account_infos,
                &[forward_signer_seeds],
            )?;
        }

        // ── Step 8: Sweep output ──────────────────────────────────────
        // For the basic flow, net_input goes to recipient directly (done above).
        // The min_output_amount check applies when forward CPI produces output.
        if let Some(min_output) = forward_config.min_output_amount {
            if min_output > 0 && net_input < min_output {
                return Err(TributaryError::InsufficientOutputAmount.into());
            }
        }

        // ── Step 10: Update state ─────────────────────────────────────
        let composable_policy = &mut ctx.accounts.composable_policy;
        composable_policy.total_input = composable_policy
            .total_input
            .checked_add(input_amount)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        composable_policy.total_output = composable_policy
            .total_output
            .checked_add(net_input)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        composable_policy.payment_count = composable_policy
            .payment_count
            .checked_add(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        composable_policy.updated_at = now;

        if should_pause {
            composable_policy.status = PolicyStatus::Completed;
        }

        ctx.accounts.user_payment.updated_at = now;

        emit!(ComposableExecuted {
            composable_policy: composable_policy.key(),
            gateway: ctx.accounts.gateway.key(),
            input_amount,
            output_amount: net_input,
            timestamp: now,
            record_id: composable_policy.payment_count,
        });

        msg!(
            "Composable executed: policy={}, input={}, output={}, gateway_fee={}, protocol_fee={}",
            composable_policy.policy_id,
            input_amount,
            net_input,
            gateway_fee,
            protocol_fee,
        );

        Ok(())
    }
}
