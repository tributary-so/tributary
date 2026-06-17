use crate::{
    constants::*,
    error::TributaryError,
    instructions::execute_payment::token_account_has_any_delegate,
    shared::delegation::resolve_delegate,
    state::*,
    utils::{calculate_next_payment_due, validate_mint_compatible},
};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, CloseAccount, Mint, TokenAccount, TransferChecked};

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

/// Create an associated token account via CPI. The account MUST NOT
/// already exist — this is a security requirement to prevent stale or
/// attacker-controlled intermediate accounts.
fn create_ata<'info>(
    ata: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    associated_token_program: &AccountInfo<'info>,
) -> Result<()> {
    require!(
        ata.lamports() == 0,
        TributaryError::IntermediateAccountAlreadyExists
    );
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: *associated_token_program.key,
        accounts: vec![
            anchor_lang::solana_program::instruction::AccountMeta::new(*payer.key, true),
            anchor_lang::solana_program::instruction::AccountMeta::new(*ata.key, false),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(*owner.key, false),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(*mint.key, false),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                *system_program.key,
                false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                *token_program.key,
                false,
            ),
        ],
        data: vec![],
    };
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            payer.clone(),
            ata.clone(),
            owner.clone(),
            mint.clone(),
            system_program.clone(),
            token_program.clone(),
            associated_token_program.clone(),
        ],
    )?;
    Ok(())
}

/// Close a token account via CPI, transferring its lamports (rent) to
/// `destination`. The `authority` signs via the provided PDA seeds.
fn close_token_account<'info>(
    account: &AccountInfo<'info>,
    destination: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let close_accounts = CloseAccount {
        account: account.clone(),
        destination: destination.clone(),
        authority: authority.clone(),
    };
    let seeds = [signer_seeds];
    let cpi_ctx = CpiContext::new_with_signer(token_program.clone(), close_accounts, &seeds);
    token_interface::close_account(cpi_ctx)
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

/// Build the `AccountMeta` list for a validation CPI from a slice of
/// caller-supplied `remaining_accounts`.
///
/// Per `shared-base` §5.3 (signer pass-through sanitization): validation
/// programs (Lighthouse, etc.) run read-only and MUST NOT inherit signer
/// privileges from the outer transaction. The caller's `fee_payer` is a
/// `Signer` and could be re-passed as a remaining_account; blindly
/// forwarding `is_signer` would grant the callee unintended authority
/// over it. We hard-code both flags to `false` — validation never needs
/// write access and never needs to assert a signer.
fn build_validation_account_metas(
    accounts: &[AccountInfo<'_>],
) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
    accounts
        .iter()
        .map(|a| anchor_lang::solana_program::instruction::AccountMeta {
            pubkey: *a.key,
            is_signer: false,
            is_writable: false,
        })
        .collect()
}

/// Build the `AccountMeta` list for a forward CPI (Meteora-DLM, etc.)
/// from a slice of caller-supplied `remaining_accounts`.
///
/// Per `shared-base` §5.3: only the `user_payment_pda` may appear as a
/// signer — its authority is established by `invoke_signed` with the
/// UserPayment seeds. All other forwarded accounts are forced to
/// `is_signer: false` even if the caller passed them as signers in the
/// outer transaction (e.g. `fee_payer`).
///
/// `is_writable` is forwarded verbatim from the caller-supplied info,
/// which is safe: the Solana runtime rejects any inner instruction that
/// claims writable access to an account the outer transaction did not
/// also mark writable, so we cannot elevate privileges by forwarding.
fn build_forward_account_metas(
    accounts: &[&AccountInfo<'_>],
    user_payment_pda: Pubkey,
) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
    accounts
        .iter()
        .map(|a| anchor_lang::solana_program::instruction::AccountMeta {
            pubkey: *(*a).key,
            is_signer: *(*a).key == user_payment_pda,
            is_writable: (*a).is_writable,
        })
        .collect()
}

/// Run the optional validation CPI (Step 2). Returns the index into
/// `remaining_accounts` where forward-program accounts begin.
fn run_validation_cpi<'info>(
    remaining: &[AccountInfo<'info>],
    program_id: &Pubkey,
    policy_key: Pubkey,
    validation_program: &AccountInfo<'info>,
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
        program_id: validation_program.key(),
        accounts: build_validation_account_metas(&val_accounts),
        data: val_data,
    };

    // The callee program must be present in account_infos so the runtime
    // can resolve it for the CPI.
    let mut all_infos: Vec<AccountInfo<'info>> = Vec::with_capacity(1 + val_accounts.len());
    all_infos.push(validation_program.clone());
    all_infos.extend(val_accounts.iter().cloned());

    anchor_lang::solana_program::program::invoke_signed(&instruction, &all_infos, &[up_seeds])?;

    Ok(val_accounts_end)
}

/// Invoke the forward program (Step 5). Signs with UserPayment PDA seeds.
///
/// Executable accounts (programs) in the forward range are excluded from
/// the instruction's `AccountMeta`s — they exist in `remaining_accounts`
/// solely so the runtime can resolve them for CPI. They are still passed
/// to `invoke_signed` as `account_infos` so nested CPIs can access them.
fn run_forward_cpi<'info>(
    remaining: &[AccountInfo<'info>],
    forward_accounts_start: usize,
    target_program: Pubkey,
    instruction_data: &[u8],
    user_payment_pda: Pubkey,
    up_seeds: &[&[u8]],
) -> Result<()> {
    require!(
        forward_accounts_start < remaining.len(),
        TributaryError::MissingForwardAccounts
    );

    let all_forward_infos: Vec<AccountInfo<'info>> = remaining[forward_accounts_start..]
        .iter()
        .map(|a| a.clone())
        .collect();

    let instruction_accounts: Vec<&AccountInfo<'info>> =
        all_forward_infos.iter().filter(|a| !a.executable).collect();

    require!(
        !instruction_accounts.is_empty(),
        TributaryError::MissingForwardAccounts
    );

    let instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: target_program,
        accounts: build_forward_account_metas(&instruction_accounts, user_payment_pda),
        data: instruction_data.to_vec(),
    };
    anchor_lang::solana_program::program::invoke_signed(
        &instruction,
        &all_forward_infos,
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
        mut,
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

    /// CHECK: Validation program account (e.g. Lighthouse).
    /// Pass SystemProgram when the policy has no validation configured.
    pub validation_program: UncheckedAccount<'info>,

    /// User's source token account. Must be owned by the user
    /// (user_payment.owner) and have either the UserPayment PDA (v1)
    /// or the global payments_delegate PDA (v0) set as delegate with
    /// `delegated_amount >= input_amount`.
    #[account(
        mut,
        constraint = user_token_account.owner == user_payment.owner
            @ TributaryError::Unauthorized,
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

    /// UserPayment PDA's intermediate input token account (input_mint ATA).
    /// Created via CPI if non-existent; closed at end to reclaim rent for
    /// the fee_payer.
    /// CHECK: Address validated in handler against the derived ATA.
    #[account(mut)]
    pub intermediate_input_token_account: UncheckedAccount<'info>,

    /// UserPayment PDA's intermediate output token account (output_mint ATA).
    /// Same account as the input when input_mint == output_mint.
    /// CHECK: Address validated in handler against the derived ATA.
    #[account(mut)]
    pub intermediate_output_token_account: UncheckedAccount<'info>,
    /// Recipient's destination token account (output_mint ATA). Must
    /// pre-exist. Receives the swept output after fees.
    #[account(
        mut,
        // associated_token::mint = output_mint,
        // associated_token::authority = composable_policy.recipient,
        // associated_token::token_program = token_program,
        constraint = recipient_token_account.mint == composable_policy.forward_config.output_mint
            @ TributaryError::TokenMintMismatch,
        constraint = recipient_token_account.owner == composable_policy.recipient,
    )]
    pub recipient_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Gateway fee account (output_mint).
    #[account(
        mut,
        // associated_token::mint = output_mint,
        // associated_token::authority = gateway.fee_recipient,
        // associated_token::token_program = token_program,
        constraint = gateway_fee_account.mint == composable_policy.forward_config.output_mint
            @ TributaryError::TokenMintMismatch,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
    )]
    pub gateway_fee_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Protocol fee account (output_mint).
    #[account(
        mut,
        // associated_token::mint = output_mint,
        // associated_token::authority = config.fee_recipient,
        // associated_token::token_program = token_program,
        constraint = protocol_fee_account.mint == composable_policy.forward_config.output_mint
            @ TributaryError::TokenMintMismatch,
        constraint = protocol_fee_account.owner == config.fee_recipient,
    )]
    pub protocol_fee_account: Box<InterfaceAccount<'info, TokenAccount>>,

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

        // Re-validate both mints at execution time. Token-2022 extensions
        // (TransferHook, TransferFee) are mutable post-creation, so the input
        // mint that was clean at create_user_payment could have turned hostile.
        // The output mint has never been validated at all, yet this instruction
        // creates a PDA-controlled intermediate ATA for it — a PermanentDelegate
        // output mint would drain that intermediate.
        validate_mint_compatible(&ctx.accounts.mint.to_account_info())?;
        validate_mint_compatible(&ctx.accounts.output_mint.to_account_info())?;

        // ── Step 1: VALIDATE ───────────────────────────────────────────
        validate_byte_ranges(
            &instruction_data,
            &ctx.accounts.composable_policy.forward_config.data_checks,
            ctx.accounts
                .composable_policy
                .forward_config
                .num_data_checks,
        )?;

        // ── Validate intermediate ATA addresses ──────────────────────────
        let expected_input_ata = Pubkey::find_program_address(
            &[
                ctx.accounts.user_payment.key().as_ref(),
                ctx.accounts.token_program.key().as_ref(),
                ctx.accounts.mint.key().as_ref(),
            ],
            ctx.accounts.associated_token_program.key,
        )
        .0;
        require!(
            ctx.accounts.intermediate_input_token_account.key() == expected_input_ata,
            TributaryError::IntermediateAccountMismatch
        );

        let expected_output_ata = Pubkey::find_program_address(
            &[
                ctx.accounts.user_payment.key().as_ref(),
                ctx.accounts.token_program.key().as_ref(),
                ctx.accounts.output_mint.key().as_ref(),
            ],
            ctx.accounts.associated_token_program.key,
        )
        .0;
        require!(
            ctx.accounts.intermediate_output_token_account.key() == expected_output_ata,
            TributaryError::IntermediateAccountMismatch
        );

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
        let stored_validation_program = ctx
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
        let forward_accounts_start = if stored_validation_program != Pubkey::default() {
            require!(
                ctx.accounts.validation_program.key() == stored_validation_program,
                TributaryError::ValidationPdaMismatch
            );
            let validation_program_info = ctx.accounts.validation_program.to_account_info();
            run_validation_cpi(
                ctx.remaining_accounts,
                ctx.program_id,
                policy_key,
                &validation_program_info,
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

        // ── Step 2.5: CREATE intermediate ATAs if needed ──────────────
        let fee_payer_info = ctx.accounts.fee_payer.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();
        let atp_info = ctx.accounts.associated_token_program.to_account_info();
        let input_ata_info = ctx
            .accounts
            .intermediate_input_token_account
            .to_account_info();
        create_ata(
            &input_ata_info,
            &fee_payer_info,
            &user_payment_info,
            &input_mint_info,
            &system_program_info,
            &token_program_info,
            &atp_info,
        )?;

        // Only create the output ATA when it's a distinct account
        // (input_mint != output_mint).
        if ctx.accounts.mint.key() != ctx.accounts.output_mint.key() {
            let output_ata_info = ctx
                .accounts
                .intermediate_output_token_account
                .to_account_info();
            create_ata(
                &output_ata_info,
                &fee_payer_info,
                &user_payment_info,
                &output_mint_info,
                &system_program_info,
                &token_program_info,
                &atp_info,
            )?;
        }

        // ── Step 3: FUND intermediate_input_token_account ──────
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

        // ── Step 5: FORWARD CPI ────────────────────────────────────────
        // run_forward_cpi(
        //     ctx.remaining_accounts,
        //     forward_accounts_start,
        //     target_program,
        //     &instruction_data,
        //     ctx.accounts.user_payment.key(),
        //     signer_seeds,
        // )?;

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

        // ── Step 12: CLOSE intermediate token accounts ────────────────
        // Both intermediates are closed to return rent to the fee_payer.
        // The user_payment PDA owns both ATAs and signs the close CPI.
        // When input_mint == output_mint they're the same account — close
        // only once.
        let close_input_ata = ctx
            .accounts
            .intermediate_input_token_account
            .to_account_info();
        close_token_account(
            &close_input_ata,
            &fee_payer_info,
            &user_payment_info,
            &token_program_info,
            signer_seeds,
        )?;

        if close_input_ata.key() != ctx.accounts.intermediate_output_token_account.key() {
            let close_output_ata = ctx
                .accounts
                .intermediate_output_token_account
                .to_account_info();
            close_token_account(
                &close_output_ata,
                &fee_payer_info,
                &user_payment_info,
                &token_program_info,
                signer_seeds,
            )?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::{account_info::AccountInfo, pubkey::Pubkey};

    /// Construct a minimal `AccountInfo` with the requested flags.
    /// `is_signer` and `is_writable` are the only fields the sanitization
    /// helpers inspect.
    fn fake_info(key: Pubkey, is_signer: bool, is_writable: bool) -> AccountInfo<'static> {
        let lamports: &'static mut u64 = Box::leak(Box::new(0u64));
        let data: &'static mut [u8] = Box::leak(Box::new([0u8; 0]));
        AccountInfo::new(
            Box::leak(Box::new(key)),
            is_signer,
            is_writable,
            lamports,
            data,
            Box::leak(Box::new(Pubkey::default())),
            false,
            0,
        )
    }

    #[test]
    fn validation_metas_strips_signer_and_writable() {
        // Simulate a remaining_account that the caller passed as a signer
        // (e.g. fee_payer) and writable. The validation CPI must see it
        // as read-only and non-signer regardless of caller intent.
        let signer_key = Pubkey::new_unique();
        let writable_key = Pubkey::new_unique();
        let plain_key = Pubkey::new_unique();

        let accounts = vec![
            fake_info(signer_key, true, true),
            fake_info(writable_key, false, true),
            fake_info(plain_key, false, false),
        ];

        let metas = build_validation_account_metas(&accounts);

        assert_eq!(metas.len(), 3);
        for meta in &metas {
            assert!(
                !meta.is_signer,
                "validation AccountMeta must never be signer (got signer for {})",
                meta.pubkey
            );
            assert!(
                !meta.is_writable,
                "validation AccountMeta must never be writable (got writable for {})",
                meta.pubkey
            );
        }
        // Pubkeys are preserved.
        assert_eq!(metas[0].pubkey, signer_key);
        assert_eq!(metas[1].pubkey, writable_key);
        assert_eq!(metas[2].pubkey, plain_key);
    }

    #[test]
    fn forward_metas_only_signs_user_payment_pda() {
        let user_payment = Pubkey::new_unique();
        let fee_payer = Pubkey::new_unique();
        let pool_a = Pubkey::new_unique();

        // fee_payer is a real Signer in the outer tx; it must NOT be a
        // signer in the forward CPI. user_payment PDA must be the only
        // signer (it signs via invoke_signed). pool_a is a writable pool
        // account — writability is preserved.
        let up_info = fake_info(user_payment, false, false);
        let fp_info = fake_info(fee_payer, true, false);
        let pool_info = fake_info(pool_a, false, true);

        let refs: Vec<&AccountInfo<'_>> = vec![&up_info, &fp_info, &pool_info];
        let metas = build_forward_account_metas(&refs, user_payment);

        assert_eq!(metas.len(), 3);
        assert_eq!(metas[0].pubkey, user_payment);
        assert!(metas[0].is_signer, "UserPayment PDA must remain signer");
        assert!(!metas[0].is_writable);

        assert_eq!(metas[1].pubkey, fee_payer);
        assert!(
            !metas[1].is_signer,
            "fee_payer must NOT be forwarded as signer"
        );
        assert!(!metas[1].is_writable);

        assert_eq!(metas[2].pubkey, pool_a);
        assert!(!metas[2].is_signer);
        assert!(
            metas[2].is_writable,
            "writability from caller must be preserved"
        );
    }

    #[test]
    fn forward_metas_user_payment_not_in_set_is_all_non_signer() {
        // If the forward accounts don't include the UserPayment PDA,
        // nothing should be a signer.
        let a = Pubkey::new_unique();
        let b = Pubkey::new_unique();
        let user_payment = Pubkey::new_unique();

        let a_info = fake_info(a, true, true);
        let b_info = fake_info(b, true, false);
        let refs: Vec<&AccountInfo<'_>> = vec![&a_info, &b_info];
        let metas = build_forward_account_metas(&refs, user_payment);

        for meta in &metas {
            assert!(
                !meta.is_signer,
                "no account should be signer when UserPayment PDA absent"
            );
        }
        // Writability still forwarded.
        assert!(metas[0].is_writable);
        assert!(!metas[1].is_writable);
    }
}
