use crate::{
    constants::*,
    error::TributaryError,
    shared::delegation::{resolve_delegate, token_account_has_any_delegate},
    shared::mint::validate_mint_compatible,
    shared::schedule::{advance_policy, validate_policy_execution, MilestoneSigners},
    state::*,
};
use anchor_lang::{prelude::*, AccountDeserialize};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, CloseAccount, Mint, TokenAccount, TransferChecked};

/// Validate byte-range checks on instruction_data using the configured checks.
///
/// Defense-in-depth: even though `create_composable_policy` rejects
/// `num_data_checks > MAX_BYTE_RANGE_CHECKS`, this fn is reached with
/// `num_checks` sourced from on-chain state. We re-check the bound here
/// so a future regression in create-time validation (or a directly-
/// serialized malformed account) cannot trigger an indexed panic.
/// See reports/H-04-num-data-checks-unbounded-oob.md.
pub fn validate_byte_ranges(data: &[u8], checks: &[ByteRangeCheck], num_checks: u8) -> Result<()> {
    let n = num_checks as usize;
    require!(n <= checks.len(), TributaryError::ByteRangeCheckFailed);
    for i in 0..n {
        require!(
            checks[i].validate(data),
            TributaryError::ByteRangeCheckFailed
        );
    }
    Ok(())
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

/// Build the ComposablePolicy PDA signer seeds.
///
/// The ComposablePolicy PDA owns the intermediate ATAs (see the ownership
/// note in the handler). It is NOT a token-account delegate anywhere, so
/// signing a CPI with these seeds can only ever move the transient
/// intermediate balances — never the user's source `user_token_account`.
/// This is what breaks the dual-role coupling that previously let the
/// validation/forward/sweep CPIs drain user funds via nested CPIs.
///
/// The returned Vec owns the bytes; callers must keep it alive for the
/// duration of any `invoke_signed` call.
fn build_composable_policy_seeds(user_payment: &Pubkey, policy_id: u32, bump: u8) -> Vec<Vec<u8>> {
    vec![
        COMPOSABLE_POLICY_SEED.to_vec(),
        user_payment.as_ref().to_vec(),
        policy_id.to_le_bytes().to_vec(),
        vec![bump],
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
/// Per `shared-base` §5.3: only the `intermediate_owner_pda` (the
/// ComposablePolicy PDA, which owns the intermediate ATAs) may appear as
/// a signer — its authority is established by `invoke_signed` with the
/// ComposablePolicy seeds. All other forwarded accounts are forced to
/// `is_signer: false` even if the caller passed them as signers in the
/// outer transaction (e.g. `fee_payer`).
///
/// Because the ComposablePolicy PDA is never a token-account delegate, a
/// forward program that receives it as a signer can only move the
/// transient intermediate balances (capped at `input_amount`), never the
/// user's source `user_token_account`. This is the decoupling fix for the
/// dual-role leak that existed when the intermediates were owned by the
/// UserPayment PDA.
///
/// `is_writable` is forwarded verbatim from the caller-supplied info,
/// which is safe: the Solana runtime rejects any inner instruction that
/// claims writable access to an account the outer transaction did not
/// also mark writable, so we cannot elevate privileges by forwarding.
fn build_forward_account_metas(
    accounts: &[&AccountInfo<'_>],
    intermediate_owner_pda: Pubkey,
) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
    accounts
        .iter()
        .map(|a| anchor_lang::solana_program::instruction::AccountMeta {
            pubkey: *(*a).key,
            is_signer: *(*a).key == intermediate_owner_pda,
            is_writable: (*a).is_writable,
        })
        .collect()
}

/// Run the optional validation CPI (Step 2). Returns the index into
/// `remaining` where forward-program accounts begin — equal to the
/// assertion's pinned-account arity (`num_pinned_accounts`).
///
/// SECURITY (reports/C-1-validation-cpi-signer-leak.md): the validation
/// CPI uses plain `invoke` — NO signer seeds. Validation programs
/// (Lighthouse, etc.) are read-only assertion checkers and must never
/// inherit signing authority. Previously this called `invoke_signed`
/// with the UserPayment PDA seeds, which (because UserPayment PDA is the
/// delegate on `user_token_account`) let the validation program — and any
/// program it nested into — drain user funds via a nested Token transfer.
/// The composable_policy-owned intermediates (see handler) are funded only
/// AFTER validation runs, so there is nothing for a validation program to
/// sign for even if it wanted to.
///
/// The caller-supplied `remaining[0..num_pinned]` target accounts are
/// pin-checked against `validation_pda.pinned_accounts` here (ADR-0016,
/// closes vector d). Lighthouse sees exactly the accounts the owner
/// declared at creation — a relayer cannot substitute a positional slot
/// to trip the assertion against the wrong state.
///
/// Stack note: `ValidationPda` carries a `[u8; 1024]` assertion buffer,
/// which alone would blow the SBF 4 KiB frame if materialised in the
/// `execute_composable` handler. Keeping the typed deserialise + pin-check
/// + CPI in this callee gives the 1 KiB struct its own stack frame.
fn run_validation_cpi<'info>(
    remaining: &[AccountInfo<'info>],
    validation_pda_info: &AccountInfo<'info>,
    policy_key: &Pubkey,
    program_id: &Pubkey,
    validation_program: &AccountInfo<'info>,
) -> Result<usize> {
    // Verify the validation_pda address against program-derived seeds
    // before trusting its bytes.
    let val_pda_key =
        Pubkey::find_program_address(&[VALIDATION_PDA_SEED, policy_key.as_ref()], program_id);
    require!(
        validation_pda_info.key() == val_pda_key.0,
        TributaryError::ValidationPdaMismatch
    );

    // Typed deserialisation — validates the Anchor discriminator + owner.
    // Replaces the legacy raw-offset reads (offset 8/10). The 1 KiB
    // `data` array lives in THIS frame, not the caller's.
    let validation_pda: ValidationPda = {
        let data = validation_pda_info.try_borrow_data()?;
        let mut slice: &[u8] = &data;
        ValidationPda::try_deserialize(&mut slice)?
    };

    // Pin-check: remaining[0..num_pinned] must equal the owner-declared
    // pinned_accounts, positionally. Closes ADR-0016 vector (d).
    let num_pinned = validation_pda.num_pinned_accounts as usize;
    require!(
        remaining.len() >= num_pinned,
        TributaryError::ValidationPdaMismatch
    );
    for i in 0..num_pinned {
        require!(
            remaining[i].key() == validation_pda.pinned_accounts[i],
            TributaryError::ValidationPdaMismatch
        );
    }

    let val_accounts: Vec<AccountInfo<'info>> =
        remaining[..num_pinned].iter().map(|a| a.clone()).collect();

    let instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: validation_program.key(),
        accounts: build_validation_account_metas(&val_accounts),
        data: validation_pda.get_data().to_vec(),
    };

    // The callee program must be present in account_infos so the runtime
    // can resolve it for the CPI.
    let mut all_infos: Vec<AccountInfo<'info>> = Vec::with_capacity(1 + val_accounts.len());
    all_infos.push(validation_program.clone());
    all_infos.extend(val_accounts.iter().cloned());

    // Plain `invoke` — no signer seeds. See the security note above:
    // validation is read-only and must not inherit any PDA signing
    // authority (C-1).
    anchor_lang::solana_program::program::invoke(&instruction, &all_infos)?;

    Ok(num_pinned)
}

/// Invoke the forward program (Step 5). Signs with ComposablePolicy PDA
/// seeds — the intermediate-ATA owner. This PDA has no authority over the
/// user's source token account, so the forward program's blast radius is
/// limited to the transient intermediate balances.
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
    intermediate_owner_pda: Pubkey,
    intermediate_owner_seeds: &[&[u8]],
) -> Result<()> {
    require!(
        forward_accounts_start < remaining.len(),
        TributaryError::MissingForwardAccounts
    );

    let all_forward_infos: Vec<AccountInfo<'info>> = remaining[forward_accounts_start..]
        .iter()
        .map(|a| a.clone())
        .collect();

    // The forward instruction's accounts are forwarded VERBATIM from the
    // caller-supplied remaining_accounts. We do NOT filter executable
    // accounts here: forward programs (e.g. Meteora DLMM) legitimately
    // include other programs in their instruction accounts — `token_program`,
    // the forward program itself (self-listed alongside `__event_authority`),
    // etc. Stripping executables would drop those required slots and shift
    // every subsequent account, misaligning the CPI. The caller is expected
    // to pass exactly the forward ix's account list; any account the runtime
    // needs for CPI resolution (programs included) is already in this slice.
    let instruction_accounts: Vec<&AccountInfo<'info>> = all_forward_infos.iter().collect();

    require!(
        !instruction_accounts.is_empty(),
        TributaryError::MissingForwardAccounts
    );

    let instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: target_program,
        accounts: build_forward_account_metas(&instruction_accounts, intermediate_owner_pda),
        data: instruction_data.to_vec(),
    };
    anchor_lang::solana_program::program::invoke_signed(
        &instruction,
        &all_forward_infos,
        &[intermediate_owner_seeds],
    )?;
    Ok(())
}

/// Process the forward program's output: verify > 0, check min_output,
/// calculate fees, deduct fees, sweep remainder to recipient.
/// Returns `(output_amount, gateway_fee, protocol_fee, sweep_amount)`.
///
/// When `native_output` is true the post-swap sweep unwraps the WSOL
/// intermediate into native SOL via `closeAccount(intermediate_WSOL →
/// recipient_wallet)`, instead of `transfer_checked` into the recipient's
/// WSOL ATA. The `closeAccount` destination is validated in the handler
/// to equal `composable_policy.recipient`, so there is no drain vector
/// (the rejected alternative — a generic Token/wrap forward — would let
/// the gateway redirect `closeAccount`'s `destination` to itself; see
/// bean tributary-hgp7 + reports/native-output-sweep.md). Fees stay in
/// WSOL (taken before the close). `sweep_amount` returned for accounting
/// is the WSOL value unwrapped; rent shipped by `closeAccount` is a
/// side-effect bonus to the recipient and excluded from `total_output`.
fn process_output_and_sweep<'info>(
    intermediate_output: &AccountInfo<'info>,
    output_mint: &AccountInfo<'info>,
    output_mint_decimals: u8,
    // ComposablePolicy PDA — owns the intermediate ATAs and signs every
    // CPI that sweeps out of `intermediate_output`. NOT the UserPayment PDA.
    intermediate_owner_info: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    gateway: &PaymentGateway,
    config: &ProgramConfig,
    gateway_fee_account: &AccountInfo<'info>,
    protocol_fee_account: &AccountInfo<'info>,
    recipient_token_account: &AccountInfo<'info>,
    min_output_amount: Option<u64>,
    intermediate_owner_seeds: &[&[&[u8]]],
    native_output: bool,
    // ADR-0017 scheduler cut routing.
    // None  → trusted path: merge scheduler_cut into gateway.fee_recipient.
    // Some  → permissionless: split scheduler_cut → caller ATA, validate
    //         owner == fee_payer_key && mint == output_mint.
    fee_payer_key: Pubkey,
    scheduler_ata: Option<&AccountInfo<'info>>,
) -> Result<(u64, u64, u64, u64)> {
    // ── Reload + verify output ──────────────────────────────────────
    let output_amount = read_token_amount(intermediate_output)?;
    require!(output_amount > 0, TributaryError::ForwardProducedNoOutput);

    // NOTE: min_output_amount is checked AFTER fee deduction below — it
    // refers to the NET amount the recipient receives, matching DeFi
    // convention (Uniswap/Jupiter amountOutMin). See
    // reports/M5-min-output-amount-checked-before-fees.md.

    // ── Calculate fees via shared helper ───────────────────────────
    // M7 unification: route through `shared::fees::calculate_fees` so the
    // bps math (rounding, overflow checks) has a single source of truth
    // shared with `execute_payment`. We pass `is_amount_net` so any future
    // change to fee accounting flows through both paths identically.
    //
    // Composable's invariant differs from `execute_payment`: fees are
    // ALWAYS deducted from the forward program's realized gross output
    // (there is no separate "user debit" to inflate — the user's pull
    // already happened, sized independently of the swap result). We
    // therefore consume only `gateway_fee` and `protocol_fee` from the
    // breakdown; the `recipient_amount` / `total_from_user` fields model
    // the `execute_payment` net-vs-gross split and don't apply here.
    // `gateway_fee` and `protocol_fee` are themselves mode-independent
    // (always `amount * bps / 10000`), so today's behavior is preserved
    // exactly; the win is that the math can no longer drift between the
    // two paths.
    // See reports/M7-composable-diverges-from-shared-fee-schedule-patterns.md.
    let fee_breakdown = crate::shared::fees::calculate_fees(
        output_amount,
        gateway.gateway_fee_bps,
        gateway.effective_protocol_share_bps(config.protocol_share_bps),
        gateway.scheduler_share_bps,
        gateway.referral_allocation_bps,
        gateway.is_referral_enabled(),
        gateway.is_amount_net(),
    )?;
    let total_fee = fee_breakdown.total_fee;
    let protocol_cut = fee_breakdown.protocol_cut;
    let scheduler_cut = fee_breakdown.scheduler_cut;

    require!(
        total_fee <= output_amount,
        TributaryError::InsufficientOutputAmount
    );

    let sweep_amount = output_amount
        .checked_sub(total_fee)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    // min_output_amount check runs AFTER fee deduction — refers to the
    // NET amount the recipient receives (matches DeFi convention:
    // Uniswap/Jupiter amountOutMin). See
    // reports/M5-min-output-amount-checked-before-fees.md.
    if let Some(min_output) = min_output_amount {
        if min_output > 0 {
            require!(
                sweep_amount >= min_output,
                TributaryError::InsufficientOutputAmount
            );
        }
    }

    // ── Claim gateway fee (with scheduler routing) ─────────────────
    let gateway_fee = fee_breakdown
        .gateway_residual
        .checked_add(scheduler_cut)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    match scheduler_ata {
        Some(ata) => {
            if scheduler_cut > 0 {
                {
                    let sta_data = ata.try_borrow_data()?;
                    require!(
                        sta_data.len() >= 64,
                        TributaryError::InvalidSchedulerFeeAccount
                    );
                    let sta_mint = Pubkey::try_from(&sta_data[0..32]).unwrap_or_default();
                    let sta_owner = Pubkey::try_from(&sta_data[32..64]).unwrap_or_default();
                    require!(
                        sta_mint == output_mint.key(),
                        TributaryError::InvalidSchedulerFeeAccount
                    );
                    require!(
                        sta_owner == fee_payer_key,
                        TributaryError::InvalidSchedulerFeeAccount
                    );
                }
                let cpi_accounts = TransferChecked {
                    from: intermediate_output.clone(),
                    mint: output_mint.clone(),
                    to: ata.clone(),
                    authority: intermediate_owner_info.clone(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    token_program.clone(),
                    cpi_accounts,
                    intermediate_owner_seeds,
                );
                token_interface::transfer_checked(cpi_ctx, scheduler_cut, output_mint_decimals)?;
            }

            if fee_breakdown.gateway_residual > 0 {
                let cpi_accounts = TransferChecked {
                    from: intermediate_output.clone(),
                    mint: output_mint.clone(),
                    to: gateway_fee_account.clone(),
                    authority: intermediate_owner_info.clone(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    token_program.clone(),
                    cpi_accounts,
                    intermediate_owner_seeds,
                );
                token_interface::transfer_checked(
                    cpi_ctx,
                    fee_breakdown.gateway_residual,
                    output_mint_decimals,
                )?;
            }
        }
        None => {
            if gateway_fee > 0 {
                let cpi_accounts = TransferChecked {
                    from: intermediate_output.clone(),
                    mint: output_mint.clone(),
                    to: gateway_fee_account.clone(),
                    authority: intermediate_owner_info.clone(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    token_program.clone(),
                    cpi_accounts,
                    intermediate_owner_seeds,
                );
                token_interface::transfer_checked(cpi_ctx, gateway_fee, output_mint_decimals)?;
            }
        }
    }

    // ── Claim protocol fee ──────────────────────────────────────────
    if protocol_cut > 0 {
        let cpi_accounts = TransferChecked {
            from: intermediate_output.clone(),
            mint: output_mint.clone(),
            to: protocol_fee_account.clone(),
            authority: intermediate_owner_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            cpi_accounts,
            intermediate_owner_seeds,
        );
        token_interface::transfer_checked(cpi_ctx, protocol_cut, output_mint_decimals)?;
    }

    // ── Sweep remainder → recipient ─────────────────────────────────
    if sweep_amount > 0 {
        if native_output {
            // Unwrap WSOL → native SOL: close the WSOL intermediate into the
            // recipient's system wallet. closeAccount sends the entire
            // remaining WSOL value (= sweep_amount) as native SOL, plus the
            // rent lamports of the closed ATA (a side-effect bonus to the
            // recipient). Authority = ComposablePolicy PDA (owns the
            // intermediate); destination validated in the handler to equal
            // `composable_policy.recipient`. No drain vector: the destination
            // is constrained on-chain, unlike a generic closeAccount forward.
            // See bean tributary-hgp7 + reports/native-output-sweep.md.
            close_token_account(
                intermediate_output,
                recipient_token_account,
                intermediate_owner_info,
                token_program,
                // close_token_account wraps the seeds in `&[signer_seeds]`,
                // so we pass the inner &[&[u8]] slice it expects. The
                // ComposablePolicy PDA owns the intermediate and signs here
                // with the SAME seeds used for the fee/sweep CPIs above.
                intermediate_owner_seeds[0],
            )?;
        } else {
            let cpi_accounts = TransferChecked {
                from: intermediate_output.clone(),
                mint: output_mint.clone(),
                to: recipient_token_account.clone(),
                authority: intermediate_owner_info.clone(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                token_program.clone(),
                cpi_accounts,
                intermediate_owner_seeds,
            );
            token_interface::transfer_checked(cpi_ctx, sweep_amount, output_mint_decimals)?;
        }
    }

    Ok((output_amount, gateway_fee, protocol_cut, sweep_amount))
}

#[derive(Accounts)]
pub struct ExecuteComposable<'info> {
    /// Fee payer / caller. The trusted three (`gateway.signer` /
    /// `user_payment.owner` / `composable_policy.recipient`) always pass.
    /// Any other signer is admitted ONLY when the gateway has the
    /// ADR-0016 permissionless bit set (cold relayer). The
    /// caller-conditional gate (mandatory min_output_amount for cold
    /// relayers) is enforced in the handler — Anchor constraints can't
    /// express "depends on the policy's forward_config".
    #[account(
        mut,
        constraint = (
            fee_payer.key() == gateway.signer
            || fee_payer.key() == user_payment.owner
            || fee_payer.key() == composable_policy.recipient
            || gateway.is_permissionless()
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

    /// UserPayment PDA — the delegate on the user's source token account.
    /// It signs ONLY the initial pull (Step 3, user → intermediate). The
    /// intermediate ATAs are owned by the ComposablePolicy PDA (see above),
    /// which signs all other CPIs; this keeps user-source authority
    /// decoupled from intermediate authority.
    /// The user's source token account MUST delegate to this PDA.
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

    /// ValidationPda — typed-deserialised in the handler when validation
    /// is enabled (validation_program != SystemProgram). When validation
    /// is disabled, the account does not exist on-chain and is left
    /// untouched. The address is verified against program-derived seeds
    /// before any bytes are read. See ADR-0016.
    /// CHECK: Validated in the handler (seeds + typed deserialisation).
    pub validation_pda: UncheckedAccount<'info>,

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

    /// Input mint (== forward_config.input_mint == user_payment.token_mint).
    #[account(
        constraint = mint.key() == composable_policy.forward_config.input_mint,
        constraint = mint.key() == user_payment.token_mint
            @ TributaryError::TokenMintMismatch,
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
    /// Recipient destination. In normal mode this is the recipient's
    /// output-mint ATA (mint+owner validated in the handler). In
    /// NATIVE_OUTPUT mode (forward_flags bit 0) it is the recipient's
    /// **system wallet** — `closeAccount` ships the WSOL value there as
    /// native SOL. Anchor constraints can't be conditional, so this is
    /// an `UncheckedAccount` and the handler replicates the two original
    /// checks (`mint == output_mint`, `owner == recipient`) in normal
    /// mode. Do NOT weaken the normal-mode checks. See bean
    /// tributary-hgp7 + reports/native-output-sweep.md.
    /// CHECK: Validated in the handler.
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,

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

        // ── Validate recipient destination (conditional on NATIVE_OUTPUT) ──
        // Anchor constraints are static, so `recipient_token_account` is an
        // UncheckedAccount. In normal mode it must be the recipient's
        // output-mint ATA (replicates the two checks that used to live on
        // the accounts struct). In NATIVE_OUTPUT mode it is the recipient's
        // system wallet — the WSOL value gets shipped there as native SOL
        // via `closeAccount`. See bean tributary-hgp7.
        //
        // We avoid `InterfaceAccount::<TokenAccount>::try_from` here: the
        // returned `InterfaceAccount` borrows the `AccountInfo` for `'info`
        // but the local `to_account_info()` binding isn't `'info`-long,
        // causing E0597. Instead we deserialize the two fields we need
        // (mint: bytes 0..32, owner: bytes 32..64) directly from the raw
        // SPL token account layout, which is exactly what the Anchor
        // constraints would have validated anyway.
        let native_output = ctx
            .accounts
            .composable_policy
            .forward_config
            .is_native_output();
        if native_output {
            require!(
                ctx.accounts.recipient_token_account.key()
                    == ctx.accounts.composable_policy.recipient,
                TributaryError::Unauthorized
            );
        } else {
            let rta_info = ctx.accounts.recipient_token_account.to_account_info();
            let data = rta_info.try_borrow_data()?;
            // SPL Token account layout: mint at 0..32, owner at 32..64.
            require!(data.len() >= 64, TributaryError::InvalidTokenAccount);
            let rta_mint = Pubkey::try_from(&data[0..32]).unwrap_or_default();
            let rta_owner = Pubkey::try_from(&data[32..64]).unwrap_or_default();
            require!(
                rta_mint == ctx.accounts.composable_policy.forward_config.output_mint,
                TributaryError::TokenMintMismatch
            );
            require!(
                rta_owner == ctx.accounts.composable_policy.recipient,
                TributaryError::Unauthorized
            );
        }

        // ── Step 1: VALIDATE ───────────────────────────────────────────
        // Byte-range checks validate the forward program's instruction_data.
        // When the policy has no forward step (target_program = default,
        // the "disabled" sentinel — see create_composable_policy), there
        // is no instruction selector to pin and instruction_data is empty,
        // so skip validation entirely.
        let target_program_early = ctx.accounts.composable_policy.forward_config.target_program;
        if target_program_early != Pubkey::default() {
            validate_byte_ranges(
                &instruction_data,
                &ctx.accounts.composable_policy.forward_config.data_checks,
                ctx.accounts
                    .composable_policy
                    .forward_config
                    .num_data_checks,
            )?;
        }

        // ── Validate intermediate ATA addresses ──────────────────────────
        // The intermediate ATAs are owned by the ComposablePolicy PDA — NOT
        // the UserPayment PDA. This is the decoupling fix: the UserPayment
        // PDA is the delegate on `user_token_account`, so owning the
        // intermediates with it would couple "intermediate-ATA owner" to
        // "user-source delegate". By parenting the intermediates under
        // ComposablePolicy (which is never a token delegate), any CPI
        // signed by ComposablePolicy can only ever move the transient
        // intermediate balances, never the user's source funds.
        // See reports/C-1-validation-cpi-signer-leak.md + tributary-0kja.
        let intermediate_owner = ctx.accounts.composable_policy.key();
        let expected_input_ata = Pubkey::find_program_address(
            &[
                intermediate_owner.as_ref(),
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
                intermediate_owner.as_ref(),
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

        // ── Validate policy + resolve base amount ──────────────────────
        // Routes through `shared::schedule` — the same dispatch path used by
        // `execute_payment`. Both policy families (PaymentPolicy +
        // ComposablePolicy) share one `match` over `PolicyType` for timing
        // gates, milestone release_condition signer bits, and PayAsYouGo
        // chunk/period bounds. The calendar-month math this relies on is
        // pinned by a differential proptest in `shared/schedule.rs`.
        let caller_key = ctx.accounts.fee_payer.key();
        let schedule_amount = validate_policy_execution(
            &composable_policy.policy_type,
            now,
            forward_amount,
            &MilestoneSigners {
                caller: &caller_key,
                gateway_signer: &ctx.accounts.gateway.signer,
                owner: &ctx.accounts.user_payment.owner,
                recipient: &composable_policy.recipient,
            },
        )?;

        // Resolve the actual input amount.
        // - PayAsYouGo: the caller-supplied `forward_amount` IS the chunk
        //   (validated inside `validate_policy_execution` above).
        // - Subscription / Milestone: the configured `schedule_amount` is
        //   authoritative. Rejecting `forward_amount` here closes C-1: an
        //   adversarial gateway signer could otherwise charge above the
        //   agreed schedule by passing `forward_amount = Some(larger)`.
        let input_amount = match forward_amount {
            Some(amt) => match &composable_policy.policy_type {
                PolicyType::PayAsYouGo { .. } => amt,
                _ => return err!(TributaryError::InvalidAmount),
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
        let has_validation = stored_validation_program != Pubkey::default();

        // ── ADR-0016 caller-conditional gate ───────────────────────────
        // The trusted three (gateway.signer / owner / recipient) always
        // pass — a gateway's own scheduler may run any policy, including
        // no-floor ones (`min_output_amount = None`). A cold relayer (any
        // other signer, admitted because the gateway is permissionless)
        // must run a CONFORMING policy: `min_output_amount = Some(m > 0)`.
        // This is the route-agnostic, program-agnostic hard-loss shield
        // — atomic revert unless the recipient receives ≥ the owner-set
        // floor. None / Some(0) are rejected for the permissionless path.
        // Trusted-caller execution is unchanged (backward-compat hatch).
        let gateway_signer = ctx.accounts.gateway.signer;
        let is_trusted_caller = caller_key == gateway_signer
            || caller_key == ctx.accounts.user_payment.owner
            || caller_key == recipient;
        if !is_trusted_caller {
            match min_output_amount {
                Some(m) if m > 0 => { /* conforming — admit */ }
                _ => return err!(TributaryError::PermissionlessExecutionRequiresMinOutput),
            }
        }

        // ── Resolve ComposablePolicy PDA signer seeds ──────────────────
        // ComposablePolicy owns the intermediate ATAs and signs every CPI
        // that touches them (forward, sweep, close). It is never a token-
        // account delegate, so its signing authority cannot reach
        // `user_token_account`.
        let policy_bump = ctx.accounts.composable_policy.bump;
        let seeds_vec =
            build_composable_policy_seeds(&ctx.accounts.user_payment.key(), policy_id, policy_bump);
        let seed_slices: Vec<&[u8]> = seeds_vec.iter().map(|s| s.as_slice()).collect();
        let signer_seeds: &[&[u8]] = &seed_slices;
        let intermediate_owner_seeds: &[&[&[u8]]] = &[signer_seeds];

        // ── Scheduler cut routing strip (ADR-0017) ─────────────────────
        // Permissionless path: the caller's ATA is the LAST remaining_account.
        // Strip it before validation/forward CPI so those parsers see only
        // their own accounts. Condition matches the caller's append rule:
        // is_permissionless && gateway.scheduler_share_bps > 0.
        // (`gateway_signer` was snapshotted above for the ADR-0016 gate.)
        let scheduler_share_bps = ctx.accounts.gateway.scheduler_share_bps;
        let is_permissionless = caller_key != gateway_signer;
        let needs_scheduler_ata = is_permissionless && scheduler_share_bps > 0;

        let (effective_remaining, scheduler_ata_info) = if needs_scheduler_ata {
            require!(
                !ctx.remaining_accounts.is_empty(),
                TributaryError::MissingSchedulerFeeAccount
            );
            let last = ctx.remaining_accounts.len() - 1;
            let scheduler_ata = ctx.remaining_accounts[last].clone();
            (&ctx.remaining_accounts[..last], Some(scheduler_ata))
        } else {
            (ctx.remaining_accounts, None)
        };

        // ── Step 2: VALIDATION CPI (if configured) ─────────────────────
        // No signer seeds are passed — validation is read-only (C-1).
        //
        // ValidationPda is a typed Anchor account (ADR-0016): typed
        // deserialisation + seed check + pin-check of caller-supplied
        // target accounts against owner-declared `pinned_accounts` happen
        // inside `run_validation_cpi`. This closes vector (d): a relayer
        // can no longer substitute a positional target to trip the
        // Lighthouse assertion against the wrong state. The 1 KiB struct
        // stays in the callee's SBF frame, not this handler's.
        let forward_accounts_start = if has_validation {
            require!(
                ctx.accounts.validation_program.key() == stored_validation_program,
                TributaryError::ValidationPdaMismatch
            );
            let validation_program_info = ctx.accounts.validation_program.to_account_info();
            let validation_pda_info = ctx.accounts.validation_pda.to_account_info();
            run_validation_cpi(
                effective_remaining,
                &validation_pda_info,
                &policy_key,
                ctx.program_id,
                &validation_program_info,
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
        // ComposablePolicy info — used as the intermediate-ATA owner/
        // authority for create, sweep, and close CPIs.
        let composable_policy_info = ctx.accounts.composable_policy.to_account_info();

        // ── Resolve pull delegate for Step 3 ───────────────────────────
        // The user's token account may delegate to EITHER the UserPayment
        // PDA (v1) or the global payments_delegate PDA (v0) — see
        // MIGRATION.md. Only the initial pull (user → intermediate) uses
        // the resolved authority; this is the ONLY CPI that can touch the
        // user's source balance. All subsequent CPIs (forward, sweep,
        // close) are signed by the ComposablePolicy PDA, which owns the
        // intermediate ATAs but has no authority over user_token_account.
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
            &composable_policy_info,
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
                &composable_policy_info,
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
        // Skipped when the policy has no forward step (target_program =
        // default). For the same-mint topup path the intermediate was
        // funded by the pull (Step 3) and input/output intermediates
        // collapse into one account, so process_output_and_sweep reads
        // the funded balance directly. No accounts beyond the validation
        // range are consumed in the disabled case.
        if target_program != Pubkey::default() {
            run_forward_cpi(
                effective_remaining,
                forward_accounts_start,
                target_program,
                &instruction_data,
                intermediate_owner,
                signer_seeds,
            )?;
        }

        // ── Steps 6–9: verify output, fees, sweep ──────────────────────
        let gateway = &ctx.accounts.gateway;
        let config = &ctx.accounts.config;

        let (output_amount, gateway_fee, protocol_fee, sweep_amount) = process_output_and_sweep(
            &ctx.accounts
                .intermediate_output_token_account
                .to_account_info(),
            &output_mint_info,
            output_mint_decimals,
            &composable_policy_info,
            &token_program_info,
            gateway,
            config,
            &ctx.accounts.gateway_fee_account.to_account_info(),
            &ctx.accounts.protocol_fee_account.to_account_info(),
            &ctx.accounts.recipient_token_account.to_account_info(),
            min_output_amount,
            intermediate_owner_seeds,
            native_output,
            caller_key,
            scheduler_ata_info.as_ref(),
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

        // In NATIVE_OUTPUT mode the WSOL intermediate was already closed by
        // the sweep (closeAccount zeroes it), so `read_token_amount` would
        // fail with `data.len() < 72`. Skip the check — `closeAccount` is
        // atomic, so the balance is provably zero (or the whole tx reverted).
        if !native_output {
            let output_check = read_token_amount(
                &ctx.accounts
                    .intermediate_output_token_account
                    .to_account_info(),
            )?;
            require!(output_check == 0, TributaryError::InsufficientBalance);
        }

        // ── Step 11: UPDATE STATE ──────────────────────────────────────
        let composable_policy = &mut ctx.accounts.composable_policy;

        // Advance the policy now that the execution succeeded. For
        // Subscription this advances `next_payment_due` via calendar-month
        // math (M-04), for Milestone it bumps `current_milestone`, for
        // PayAsYouGo it updates the rolling period total. Returns
        // `should_complete` for one-shot / exhausted policies. Shared with
        // `execute_payment`.
        let should_complete =
            advance_policy(&mut composable_policy.policy_type, now, input_amount)?;

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

        if should_complete {
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
        // The ComposablePolicy PDA owns both ATAs and signs the close CPI.
        // When input_mint == output_mint they're the same account — close
        // only once.
        let close_input_ata = ctx
            .accounts
            .intermediate_input_token_account
            .to_account_info();
        close_token_account(
            &close_input_ata,
            &fee_payer_info,
            &composable_policy_info,
            &token_program_info,
            signer_seeds,
        )?;

        if close_input_ata.key() != ctx.accounts.intermediate_output_token_account.key()
            && !native_output
        {
            // NATIVE_OUTPUT mode already closed the output intermediate in
            // the sweep (closeAccount). Skipping here avoids a double-close
            // (which would fail at `close_token_account`'s ATA-lamports==0
            // guard anyway, since the account no longer exists).
            let close_output_ata = ctx
                .accounts
                .intermediate_output_token_account
                .to_account_info();
            close_token_account(
                &close_output_ata,
                &fee_payer_info,
                &composable_policy_info,
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

    /// Defense-in-depth: `validate_byte_ranges` must reject `num_checks`
    /// values greater than the length of the provided `checks` slice
    /// instead of indexing out-of-bounds and panicking.
    ///
    /// See reports/H-04-num-data-checks-unbounded-oob.md.
    #[test]
    fn validate_byte_ranges_rejects_num_checks_above_slice_len() {
        let checks: [ByteRangeCheck; 4] = [
            ByteRangeCheck {
                offset: 0,
                length: 1,
                expected: [0u8; 8],
            },
            ByteRangeCheck {
                offset: 0,
                length: 0,
                expected: [0u8; 8],
            },
            ByteRangeCheck {
                offset: 0,
                length: 0,
                expected: [0u8; 8],
            },
            ByteRangeCheck {
                offset: 0,
                length: 0,
                expected: [0u8; 8],
            },
        ];
        let data = [0u8; 8];

        // num_checks == checks.len() is fine (no OOB).
        assert!(validate_byte_ranges(&data, &checks, 4).is_ok());

        // num_checks > checks.len() must return an Err rather than panic.
        let res = validate_byte_ranges(&data, &checks, 5);
        assert!(
            res.is_err(),
            "num_checks > slice length must be rejected, got {:?}",
            res
        );

        // And the obviously hostile 255 case.
        let res = validate_byte_ranges(&data, &checks, 255);
        assert!(
            res.is_err(),
            "num_checks = 255 must be rejected, got {:?}",
            res
        );
    }
}
