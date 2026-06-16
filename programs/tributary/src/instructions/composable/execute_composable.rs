use crate::{
    constants::*, error::TributaryError,
    instructions::execute_payment::token_account_has_any_delegate,
    shared::delegation::resolve_delegate, state::*, utils::calculate_next_payment_due,
};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::{
    create_idempotent, get_associated_token_address_with_program_id, AssociatedToken, Create,
};
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TransferChecked};

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
            padding: _,
        } => {
            require!(now >= *next_execution_due, TributaryError::PaymentNotDue);
            let amt = *amount;

            *next_execution_due = calculate_next_payment_due(*next_execution_due, frequency, now)?;

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
            padding: _,
        } => {
            let idx = *current as usize;
            require!(idx < *total as usize, TributaryError::InvalidAmount);

            if *release_condition & 0b0001 != 0 {
                require!(now >= timestamps[idx], TributaryError::PaymentNotDue);
            }

            let amt = amounts[idx];
            *current = current.saturating_add(1);

            let should_pause = *current >= *total;

            Ok((amt, should_pause))
        }
        ScheduleType::Usage {
            max_amount_per_period: _,
            max_chunk_amount: _,
            period_length_seconds,
            current_period_start,
            current_period_total,
            padding: _,
        } => {
            let period_end = current_period_start
                .checked_add(*period_length_seconds as i64)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            if now >= period_end {
                *current_period_start = now;
                *current_period_total = 0;
            }

            Ok((0, false))
        }
    }
}

/// Read the SPL Token `amount` field (offset 64, 8 bytes LE) from a raw
/// AccountInfo. Used for `UncheckedAccount` intermediates that cannot be
/// deserialized by Anchor at struct-validation time (they may not exist yet).
///
/// The Solana runtime keeps the underlying data buffer live across CPIs; a
/// fresh `try_borrow_data()` after a CPI observes the post-CPI state as long
/// as no prior borrow is still outstanding.
fn read_token_amount(account_info: &AccountInfo) -> Result<u64> {
    let data = account_info.try_borrow_data()?;
    require!(data.len() >= 72, TributaryError::InvalidTokenAccount);
    Ok(u64::from_le_bytes(
        data[64..72].try_into().unwrap_or([0u8; 8]),
    ))
}

/// Build the UserPayment PDA signer seeds. The returned Vec owns the bytes;
/// callers must keep it alive for the duration of any `invoke_signed` call.
fn build_user_payment_seeds(user_payment: &Account<UserPayment>) -> Vec<Vec<u8>> {
    vec![
        USER_PAYMENT_SEED.to_vec(),
        user_payment.owner.as_ref().to_vec(),
        user_payment.token_mint.as_ref().to_vec(),
        vec![user_payment.bump],
    ]
}

/// Run the optional validation CPI (Step 2). Returns the index into
/// `remaining_accounts` where forward-program accounts begin.
fn run_validation_cpi<'info>(
    remaining: &[AccountInfo<'info>],
    program_id: &Pubkey,
    policy_key: Pubkey,
    validation_program: Pubkey,
    num_val_accounts: usize,
    up_seeds: &[&[u8]],
) -> Result<usize> {
    require!(!remaining.is_empty(), TributaryError::ValidationPdaMismatch);

    let val_pda_key =
        Pubkey::find_program_address(&[VALIDATION_PDA_SEED, policy_key.as_ref()], program_id);
    require!(
        remaining[0].key() == val_pda_key.0,
        TributaryError::ValidationPdaMismatch
    );

    // Read assertion data (scope the borrow).
    let val_data = {
        let val_pda_info = &remaining[0];
        let data = val_pda_info.try_borrow_data()?;
        let data_len = u16::from_le_bytes([data[8], data[9]]) as usize;
        data[10..10 + data_len].to_vec()
    };

    let val_accounts_end = 1 + num_val_accounts;
    require!(
        remaining.len() >= val_accounts_end,
        TributaryError::ValidationPdaMismatch
    );

    let val_accounts: Vec<AccountInfo<'info>> = remaining[1..val_accounts_end]
        .iter()
        .map(|a| a.clone())
        .collect();

    let instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: validation_program,
        accounts: val_accounts
            .iter()
            .map(|a| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *a.key,
                is_signer: a.is_signer,
                is_writable: a.is_writable,
            })
            .collect(),
        data: val_data,
    };
    anchor_lang::solana_program::program::invoke_signed(&instruction, &val_accounts, &[up_seeds])?;

    Ok(val_accounts_end)
}

/// Create (idempotent) an intermediate ATA owned by the UserPayment PDA.
fn create_intermediate_ata<'info>(
    ata: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    ata_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
) -> Result<()> {
    let create_accounts = Create {
        payer: payer.clone(),
        associated_token: ata.clone(),
        authority: authority.clone(),
        mint: mint.clone(),
        system_program: system_program.clone(),
        token_program: token_program.clone(),
    };
    let cpi_ctx = CpiContext::new(ata_program.clone(), create_accounts);
    create_idempotent(cpi_ctx)
}

/// Invoke the forward program (Step 5). Signs with UserPayment PDA seeds.
fn run_forward_cpi<'info>(
    remaining: &[AccountInfo<'info>],
    forward_accounts_start: usize,
    target_program: Pubkey,
    instruction_data: &[u8],
    up_seeds: &[&[u8]],
) -> Result<()> {
    require!(
        forward_accounts_start < remaining.len(),
        TributaryError::MissingForwardAccounts
    );

    let forward_account_infos: Vec<AccountInfo<'info>> = remaining[forward_accounts_start..]
        .iter()
        .map(|a| a.clone())
        .collect();

    let instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: target_program,
        accounts: forward_account_infos
            .iter()
            .map(|a| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *a.key,
                is_signer: a.is_signer,
                is_writable: a.is_writable,
            })
            .collect(),
        data: instruction_data.to_vec(),
    };
    anchor_lang::solana_program::program::invoke_signed(
        &instruction,
        &forward_account_infos,
        &[up_seeds],
    )?;
    Ok(())
}

/// Process the forward program's output: verify > 0, check min_output,
/// calculate fees, deduct fees, sweep remainder to recipient.
/// Returns `(output_amount, gateway_fee, protocol_fee, sweep_amount)`.
fn process_output_and_sweep<'info>(
    intermediate_output: &AccountInfo<'info>,
    output_mint: &AccountInfo<'info>,
    output_mint_decimals: u8,
    user_payment_info: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    gateway_fee_account: &AccountInfo<'info>,
    protocol_fee_account: &AccountInfo<'info>,
    recipient_token_account: &AccountInfo<'info>,
    gateway_fee_bps: u16,
    use_custom_protocol_fee: bool,
    custom_protocol_fee_bps: u16,
    default_protocol_fee_bps: u16,
    min_output_amount: Option<u64>,
    seeds: &[&[&[u8]]],
) -> Result<(u64, u64, u64, u64)> {
    // ── Reload + verify output ──────────────────────────────────────
    let output_amount = read_token_amount(intermediate_output)?;
    require!(output_amount > 0, TributaryError::ForwardProducedNoOutput);

    // min_output_amount check runs BEFORE fee deduction.
    if let Some(min_output) = min_output_amount {
        if min_output > 0 {
            require!(
                output_amount >= min_output,
                TributaryError::InsufficientOutputAmount
            );
        }
    }

    // ── Calculate fees (output-based) ───────────────────────────────
    let gateway_fee = output_amount
        .checked_mul(gateway_fee_bps as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let protocol_fee_bps = if use_custom_protocol_fee {
        custom_protocol_fee_bps
    } else {
        default_protocol_fee_bps
    };

    let protocol_fee = output_amount
        .checked_mul(protocol_fee_bps as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let total_fees = gateway_fee
        .checked_add(protocol_fee)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    require!(
        total_fees <= output_amount,
        TributaryError::InsufficientOutputAmount
    );

    let sweep_amount = output_amount
        .checked_sub(total_fees)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    // ── Claim gateway fee ───────────────────────────────────────────
    if gateway_fee > 0 {
        let cpi_accounts = TransferChecked {
            from: intermediate_output.clone(),
            mint: output_mint.clone(),
            to: gateway_fee_account.clone(),
            authority: user_payment_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(token_program.clone(), cpi_accounts, seeds);
        token_interface::transfer_checked(cpi_ctx, gateway_fee, output_mint_decimals)?;
    }

    // ── Claim protocol fee ──────────────────────────────────────────
    if protocol_fee > 0 {
        let cpi_accounts = TransferChecked {
            from: intermediate_output.clone(),
            mint: output_mint.clone(),
            to: protocol_fee_account.clone(),
            authority: user_payment_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(token_program.clone(), cpi_accounts, seeds);
        token_interface::transfer_checked(cpi_ctx, protocol_fee, output_mint_decimals)?;
    }

    // ── Sweep remainder → recipient ─────────────────────────────────
    if sweep_amount > 0 {
        let cpi_accounts = TransferChecked {
            from: intermediate_output.clone(),
            mint: output_mint.clone(),
            to: recipient_token_account.clone(),
            authority: user_payment_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(token_program.clone(), cpi_accounts, seeds);
        token_interface::transfer_checked(cpi_ctx, sweep_amount, output_mint_decimals)?;
    }

    Ok((output_amount, gateway_fee, protocol_fee, sweep_amount))
}

#[derive(Accounts)]
pub struct ExecuteComposable<'info> {
    /// Gateway signer, user, or recipient — whoever triggers execution
    #[account(
        constraint = (
            fee_payer.key() == gateway.signer
            || fee_payer.key() == user_payment.owner
            || fee_payer.key() == composable_policy.recipient
        ),
    )]
    pub fee_payer: Signer<'info>,

    #[account(
        seeds = [PAYMENTS_SEED],
        bump
    )]
    /// CHECK: Program-derived delegate authority for token transfers (legacy v0 path)
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

    /// UserPayment PDA — also the SOLE signing authority for every token
    /// op and CPI in this instruction (see COMPOSABLE.md §PDA Seed Summary).
    /// Owns both intermediate ATAs. The user's source token account MUST
    /// delegate to this PDA.
    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, user_payment.owner.as_ref(), user_payment.token_mint.as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.is_active
    )]
    pub user_payment: Box<Account<'info, UserPayment>>,

    #[account(
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

    /// User's source token account. The account MUST have either the
    /// UserPayment PDA (v1) or the global payments_delegate PDA (v0) set
    /// as delegate with `delegated_amount >= input_amount`.
    #[account(
        mut,
        constraint = user_token_account.mint == composable_policy.forward_config.input_mint,
        constraint = token_account_has_any_delegate(
            &user_token_account.delegate,
            &[&payments_delegate.key(), &user_payment.key()]
        ) @ TributaryError::NoDelegateSet,
    )]
    pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Input mint (== forward_config.input_mint).
    #[account(
        constraint = mint.key() == composable_policy.forward_config.input_mint,
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    /// Output mint (== forward_config.output_mint). Required for the
    /// `transfer_checked` calls on the output leg (fees + sweep).
    #[account(
        constraint = output_mint.key() == composable_policy.forward_config.output_mint,
    )]
    pub output_mint: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: UserPayment PDA's intermediate input token account
    /// (input_mint ATA). Created lazily via `create_idempotent`. Funded
    /// with the full `input_amount`; drained by the forward CPI.
    #[account(mut)]
    pub intermediate_input_token_account: UncheckedAccount<'info>,

    /// CHECK: UserPayment PDA's intermediate output token account
    /// (output_mint ATA). Created lazily via `create_idempotent`. Receives
    /// the forward program's output tokens; fees and sweep are taken from
    /// here. Must end the instruction at balance 0.
    #[account(mut)]
    pub intermediate_output_token_account: UncheckedAccount<'info>,

    /// Recipient's destination token account (output_mint ATA). Must
    /// pre-exist. Receives the swept output after fees.
    #[account(
        mut,
        constraint = recipient_token_account.mint == composable_policy.forward_config.output_mint
            @ TributaryError::TokenMintMismatch,
        constraint = recipient_token_account.owner == composable_policy.recipient,
    )]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Gateway fee account (output_mint).
    #[account(
        mut,
        constraint = gateway_fee_account.mint == composable_policy.forward_config.output_mint
            @ TributaryError::TokenMintMismatch,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
    )]
    pub gateway_fee_account: InterfaceAccount<'info, TokenAccount>,

    /// Protocol fee account (output_mint).
    #[account(
        mut,
        constraint = protocol_fee_account.mint == composable_policy.forward_config.output_mint
            @ TributaryError::TokenMintMismatch,
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

        // ── Step 1: VALIDATE ───────────────────────────────────────────
        validate_byte_ranges(
            &instruction_data,
            &ctx.accounts.composable_policy.forward_config.data_checks,
            ctx.accounts
                .composable_policy
                .forward_config
                .num_data_checks,
        )?;

        let composable_policy = &mut ctx.accounts.composable_policy;
        let (schedule_amount, should_pause) =
            resolve_schedule_amount_and_advance(&mut composable_policy.schedule, now)?;

        let input_amount = match forward_amount {
            Some(amt) => match &composable_policy.schedule {
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
            },
            None => {
                require!(schedule_amount > 0, TributaryError::InvalidAmount);
                schedule_amount
            }
        };

        require!(
            ctx.accounts.user_token_account.delegated_amount >= input_amount,
            TributaryError::InsufficientDelegatedAmount
        );
        require!(
            ctx.accounts.user_token_account.amount >= input_amount,
            TributaryError::InsufficientBalance
        );

        // Snapshot fields we need from composable_policy before any
        // long-lived borrows of it kick in.
        let policy_key = ctx.accounts.composable_policy.key();
        let policy_id = ctx.accounts.composable_policy.policy_id;
        let target_program = ctx.accounts.composable_policy.forward_config.target_program;
        let min_output_amount = ctx
            .accounts
            .composable_policy
            .forward_config
            .min_output_amount;
        let recipient = ctx.accounts.composable_policy.recipient;
        let validation_program = ctx
            .accounts
            .composable_policy
            .validation_config
            .validation_program;
        let num_val_accounts = ctx
            .accounts
            .composable_policy
            .validation_config
            .num_validation_accounts as usize;

        // ── Resolve UserPayment PDA signer seeds ───────────────────────
        let seeds_vec = build_user_payment_seeds(&ctx.accounts.user_payment);
        let seed_slices: Vec<&[u8]> = seeds_vec.iter().map(|s| s.as_slice()).collect();
        let signer_seeds: &[&[u8]] = &seed_slices;
        let seeds: &[&[&[u8]]] = &[signer_seeds];

        // ── Step 2: VALIDATION CPI (if configured) ─────────────────────
        let forward_accounts_start = if validation_program != Pubkey::default() {
            run_validation_cpi(
                ctx.remaining_accounts,
                ctx.program_id,
                policy_key,
                validation_program,
                num_val_accounts,
                signer_seeds,
            )?
        } else {
            0
        };

        // ── Cache account infos used by multiple steps ─────────────────
        let token_program_info = ctx.accounts.token_program.to_account_info();
        let input_mint_info = ctx.accounts.mint.to_account_info();
        let input_mint_decimals = ctx.accounts.mint.decimals;
        let output_mint_info = ctx.accounts.output_mint.to_account_info();
        let output_mint_decimals = ctx.accounts.output_mint.decimals;
        let user_token_info = ctx.accounts.user_token_account.to_account_info();
        let user_payment_info = ctx.accounts.user_payment.to_account_info();
        let fee_payer_info = ctx.accounts.fee_payer.to_account_info();
        let ata_program_info = ctx.accounts.associated_token_program.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();

        // ── Resolve pull delegate for Step 3 ───────────────────────────
        // The user's token account may delegate to EITHER the UserPayment
        // PDA (v1) or the global payments_delegate PDA (v0) — see
        // MIGRATION.md. Only the initial pull (user → intermediate) uses
        // the resolved authority. All subsequent CPIs (validation, forward,
        // sweeps) use the UserPayment PDA because it owns the intermediate
        // ATAs.
        let pull_resolution = resolve_delegate(
            &ctx.accounts.user_payment,
            user_payment_info.clone(),
            ctx.accounts.payments_delegate.to_account_info(),
            ctx.bumps.payments_delegate,
            &ctx.accounts.user_token_account.delegate,
        )?;
        let pull_seed_slices: Vec<&[u8]> =
            pull_resolution.seeds.iter().map(|s| s.as_slice()).collect();
        let pull_signer_seeds: &[&[u8]] = &pull_seed_slices;
        let pull_seeds: &[&[&[u8]]] = &[pull_signer_seeds];
        let pull_authority = &pull_resolution.authority_info;

        // ── Step 3: CREATE + FUND intermediate_input_token_account ──────
        let expected_intermediate_input = get_associated_token_address_with_program_id(
            &ctx.accounts.user_payment.key(),
            &ctx.accounts.mint.key(),
            &ctx.accounts.token_program.key(),
        );
        require!(
            ctx.accounts.intermediate_input_token_account.key() == expected_intermediate_input,
            TributaryError::IntermediateAccountMismatch
        );

        create_intermediate_ata(
            &ctx.accounts
                .intermediate_input_token_account
                .to_account_info(),
            &fee_payer_info,
            &user_payment_info,
            &input_mint_info,
            &ata_program_info,
            &system_program_info,
            &token_program_info,
        )?;

        {
            let cpi_accounts = TransferChecked {
                from: user_token_info.clone(),
                mint: input_mint_info.clone(),
                to: ctx
                    .accounts
                    .intermediate_input_token_account
                    .to_account_info(),
                authority: pull_authority.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, pull_seeds);
            token_interface::transfer_checked(cpi_ctx, input_amount, input_mint_decimals)?;
        }

        // ── Step 4: CREATE intermediate_output_token_account ───────────
        let expected_intermediate_output = get_associated_token_address_with_program_id(
            &ctx.accounts.user_payment.key(),
            &ctx.accounts.output_mint.key(),
            &ctx.accounts.token_program.key(),
        );
        require!(
            ctx.accounts.intermediate_output_token_account.key() == expected_intermediate_output,
            TributaryError::IntermediateAccountMismatch
        );

        create_intermediate_ata(
            &ctx.accounts
                .intermediate_output_token_account
                .to_account_info(),
            &fee_payer_info,
            &user_payment_info,
            &output_mint_info,
            &ata_program_info,
            &system_program_info,
            &token_program_info,
        )?;

        // ── Step 5: FORWARD CPI ────────────────────────────────────────
        run_forward_cpi(
            ctx.remaining_accounts,
            forward_accounts_start,
            target_program,
            &instruction_data,
            signer_seeds,
        )?;

        // ── Steps 6–9: verify output, fees, sweep ──────────────────────
        let gateway = &ctx.accounts.gateway;
        let config = &ctx.accounts.config;

        let (output_amount, gateway_fee, protocol_fee, sweep_amount) = process_output_and_sweep(
            &ctx.accounts
                .intermediate_output_token_account
                .to_account_info(),
            &output_mint_info,
            output_mint_decimals,
            &user_payment_info,
            &token_program_info,
            &ctx.accounts.gateway_fee_account.to_account_info(),
            &ctx.accounts.protocol_fee_account.to_account_info(),
            &ctx.accounts.recipient_token_account.to_account_info(),
            gateway.gateway_fee_bps,
            gateway.is_custom_protocol_fee_enabled(),
            gateway.custom_protocol_fee_bps,
            config.protocol_fee_bps,
            min_output_amount,
            seeds,
        )?;

        // ── Step 10: VERIFY INTERMEDIATES EMPTY ────────────────────────
        // Closure of the intermediate ATAs (rent → fee_payer) is a
        // follow-up; for now we enforce zero balances so nothing is
        // stranded silently.
        let input_check = read_token_amount(
            &ctx.accounts
                .intermediate_input_token_account
                .to_account_info(),
        )?;
        require!(input_check == 0, TributaryError::InsufficientBalance);

        let output_check = read_token_amount(
            &ctx.accounts
                .intermediate_output_token_account
                .to_account_info(),
        )?;
        require!(output_check == 0, TributaryError::InsufficientBalance);

        // ── Step 11: UPDATE STATE ──────────────────────────────────────
        let composable_policy = &mut ctx.accounts.composable_policy;
        composable_policy.total_input = composable_policy
            .total_input
            .checked_add(input_amount)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        composable_policy.total_output = composable_policy
            .total_output
            .checked_add(sweep_amount)
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
            composable_policy: policy_key,
            gateway: ctx.accounts.gateway.key(),
            target_program,
            input_amount,
            output_amount,
            gateway_fee,
            protocol_fee,
            recipient,
            timestamp: now,
            record_id: composable_policy.payment_count,
        });

        msg!(
            "Composable executed: policy={}, input={}, output={}, swept={}, gateway_fee={}, protocol_fee={}",
            policy_id,
            input_amount,
            output_amount,
            sweep_amount,
            gateway_fee,
            protocol_fee,
        );

        Ok(())
    }
}
