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
///
/// `MAX_BYTE_RANGE_CHECKS` is the fixed capacity of `InstructionConstraint`'s
/// `data_checks` array (see `state/composable_policy.rs`); the explicit guard
/// here mirrors that constant so a future code path passing a different slice
/// fails loudly instead of panicking on an out-of-bounds index.
pub fn validate_byte_ranges(data: &[u8], checks: &[ByteRangeCheck], num_checks: u8) -> Result<()> {
    let n = num_checks as usize;
    // Reference MAX_BYTE_RANGE_CHECKS explicitly: the slice is always the
    // fixed-size array from InstructionConstraint, but asserting the bound
    // against the named constant makes the structural invariant visible
    // at the call site rather than implicit in the slice length.
    require!(
        n <= MAX_BYTE_RANGE_CHECKS && n <= checks.len(),
        TributaryError::ByteRangeCheckFailed
    );
    for check in checks.iter().take(n) {
        require!(check.validate(data), TributaryError::ByteRangeCheckFailed);
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
            pubkey: *a.key,
            is_signer: *a.key == intermediate_owner_pda,
            is_writable: a.is_writable,
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
    seed: &[u8],
) -> Result<usize> {
    // Verify the validation_pda address against program-derived seeds
    // before trusting its bytes.
    let val_pda_key = Pubkey::find_program_address(&[seed, policy_key.as_ref()], program_id);
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
    for (i, rem) in remaining.iter().enumerate().take(num_pinned) {
        require!(
            rem.key() == validation_pda.pinned_accounts[i],
            TributaryError::ValidationPdaMismatch
        );
    }

    let val_accounts: Vec<AccountInfo<'info>> = remaining[..num_pinned].to_vec();
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

    let all_forward_infos: Vec<AccountInfo<'info>> = remaining[forward_accounts_start..].to_vec();

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

/// Skim protocol + gateway + scheduler fees from `intermediate_input`
/// AFTER the gross pull, BEFORE the forward runs (ADR-0026).
///
/// Composable fee path is **input-side** and **NET-on-pull** (hardcoded):
/// the pull moves `face + fee` from the user; the fee is decomposed into
/// protocol / scheduler / gateway-residual carve-outs and routed to the
/// respective `input_mint` accounts. What remains in `intermediate_input`
/// is exactly `face` — the amount the forward instruction consumes
/// (`amount_in = face`), making the forward ix relayer-agnostic and
/// ix-stable regardless of gateway-fee-bps changes.
///
/// Returns `(total_fee, protocol_cut, gateway_fee, scheduler_cut)` for the
/// event. `gateway_fee` is `gateway_residual + scheduler_cut` (the gateway's
/// take, possibly routed partly to the scheduler ATA on the permissionless
/// path).
//
// ponytail: 13 params, single call site — a params struct would just move the
// args into a construction at the one caller and add a definition. Keep flat.
#[allow(clippy::too_many_arguments)]
fn skim_input_fees<'info>(
    intermediate_input: &AccountInfo<'info>,
    input_mint: &AccountInfo<'info>,
    input_mint_decimals: u8,
    intermediate_owner_info: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    gateway: &PaymentGateway,
    config: &ProgramConfig,
    gateway_fee_account: &AccountInfo<'info>,
    protocol_fee_account: &AccountInfo<'info>,
    intermediate_owner_seeds: &[&[&[u8]]],
    fee_payer_key: Pubkey,
    scheduler_ata: Option<&AccountInfo<'info>>,
    face_amount: u64,
) -> Result<(u64, u64, u64, u64)> {
    // NET-on-pull hardcoded for composable: fee is ADDED on top of face.
    // calculate_fees with is_net_mode=true yields total_fee = face × bps and
    // total_from_user = face + total_fee (the gross pull, already moved).
    let fee_breakdown = crate::shared::fees::calculate_fees(
        face_amount,
        gateway.gateway_fee_bps,
        gateway.effective_protocol_share_bps(config.protocol_share_bps),
        gateway.scheduler_share_bps,
        gateway.referral_allocation_bps,
        gateway.is_referral_enabled(),
        true, // NET-on-pull hardcoded (ADR-0026)
    )?;
    let total_fee = fee_breakdown.total_fee;
    let protocol_cut = fee_breakdown.protocol_cut;
    let scheduler_cut = fee_breakdown.scheduler_cut;

    // Always verify gross pull fits in u64; the OR short-circuit in the
    // previous form (`total_fee <= face_amount || checked_add.is_some()`)
    // skipped the check whenever the fee was small, leaving face+fee overflow
    // uncaught. See S-2 (review 2026-07-06).
    require!(
        face_amount.checked_add(total_fee).is_some(),
        TributaryError::ArithmeticOverflow
    );

    let gateway_fee = fee_breakdown
        .gateway_residual
        .checked_add(scheduler_cut)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    // ── Scheduler cut (permissionless path only) ───────────────────
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
                    // Scheduler ATA is input-side (ADR-0026).
                    require!(
                        sta_mint == input_mint.key(),
                        TributaryError::InvalidSchedulerFeeAccount
                    );
                    require!(
                        sta_owner == fee_payer_key,
                        TributaryError::InvalidSchedulerFeeAccount
                    );
                }
                let cpi_accounts = TransferChecked {
                    from: intermediate_input.clone(),
                    mint: input_mint.clone(),
                    to: ata.clone(),
                    authority: intermediate_owner_info.clone(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    token_program.clone(),
                    cpi_accounts,
                    intermediate_owner_seeds,
                );
                token_interface::transfer_checked(cpi_ctx, scheduler_cut, input_mint_decimals)?;
            }

            if fee_breakdown.gateway_residual > 0 {
                let cpi_accounts = TransferChecked {
                    from: intermediate_input.clone(),
                    mint: input_mint.clone(),
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
                    input_mint_decimals,
                )?;
            }
        }
        None => {
            if gateway_fee > 0 {
                let cpi_accounts = TransferChecked {
                    from: intermediate_input.clone(),
                    mint: input_mint.clone(),
                    to: gateway_fee_account.clone(),
                    authority: intermediate_owner_info.clone(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    token_program.clone(),
                    cpi_accounts,
                    intermediate_owner_seeds,
                );
                token_interface::transfer_checked(cpi_ctx, gateway_fee, input_mint_decimals)?;
            }
        }
    }

    // ── Protocol cut ───────────────────────────────────────────────
    if protocol_cut > 0 {
        let cpi_accounts = TransferChecked {
            from: intermediate_input.clone(),
            mint: input_mint.clone(),
            to: protocol_fee_account.clone(),
            authority: intermediate_owner_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            cpi_accounts,
            intermediate_owner_seeds,
        );
        token_interface::transfer_checked(cpi_ctx, protocol_cut, input_mint_decimals)?;
    }

    Ok((total_fee, protocol_cut, gateway_fee, scheduler_cut))
}

/// Sweep the intermediate_output balance to the recipient (deliver-transform
/// mode). Enforces the `output_amount > 0` guard — Tributary asserts the
/// output EXISTS; the output AMOUNT floor is the owner's job via
/// `post_validation`. Returns the swept amount.
//
// ponytail: 8 params, single call site — distinct SPL accounts + decimals +
// native flag, all needed for the one transfer. Keep flat.
#[allow(clippy::too_many_arguments)]
fn sweep_output_to_recipient<'info>(
    intermediate_output: &AccountInfo<'info>,
    output_mint: &AccountInfo<'info>,
    output_mint_decimals: u8,
    intermediate_owner_info: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    recipient_token_account: &AccountInfo<'info>,
    intermediate_owner_seeds: &[&[&[u8]]],
    native_output: bool,
) -> Result<u64> {
    let output_amount = read_token_amount(intermediate_output)?;
    require!(output_amount > 0, TributaryError::ForwardProducedNoOutput);

    if native_output {
        close_token_account(
            intermediate_output,
            recipient_token_account,
            intermediate_owner_info,
            token_program,
            intermediate_owner_seeds[0],
        )?;
    } else if output_amount > 0 {
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
        token_interface::transfer_checked(cpi_ctx, output_amount, output_mint_decimals)?;
    }
    Ok(output_amount)
}

/// Sweep an intermediate balance back to the user's source token account.
/// Used for the intermediate_input residue when a forward under-consumed
/// (deliver-transform + act modes, ADR-0026). The fee was already skimmed
/// on the gross pull; the residue is the un-consumed portion of `face` and
/// is non-refundable as far as fees go — the user authorized the gross pull,
/// the fee is earned on authorization, the residue is returned principal.
fn sweep_input_residual_to_user<'info>(
    intermediate_input: &AccountInfo<'info>,
    input_mint: &AccountInfo<'info>,
    input_mint_decimals: u8,
    intermediate_owner_info: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    user_token_account: &AccountInfo<'info>,
    intermediate_owner_seeds: &[&[&[u8]]],
) -> Result<u64> {
    let residue = read_token_amount(intermediate_input)?;
    if residue > 0 {
        let cpi_accounts = TransferChecked {
            from: intermediate_input.clone(),
            mint: input_mint.clone(),
            to: user_token_account.clone(),
            authority: intermediate_owner_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            cpi_accounts,
            intermediate_owner_seeds,
        );
        token_interface::transfer_checked(cpi_ctx, residue, input_mint_decimals)?;
    }
    Ok(residue)
}

/// Deliver-no-transform sweep: move the full `face` balance from
/// intermediate_input to the recipient (forward never ran, the intermediate
/// holds exactly `face` after fee skim). Single-mint, single-intermediate.
fn sweep_input_to_recipient<'info>(
    intermediate_input: &AccountInfo<'info>,
    input_mint: &AccountInfo<'info>,
    input_mint_decimals: u8,
    intermediate_owner_info: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    recipient_token_account: &AccountInfo<'info>,
    intermediate_owner_seeds: &[&[&[u8]]],
) -> Result<u64> {
    let amount = read_token_amount(intermediate_input)?;
    if amount > 0 {
        let cpi_accounts = TransferChecked {
            from: intermediate_input.clone(),
            mint: input_mint.clone(),
            to: recipient_token_account.clone(),
            authority: intermediate_owner_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            cpi_accounts,
            intermediate_owner_seeds,
        );
        token_interface::transfer_checked(cpi_ctx, amount, input_mint_decimals)?;
    }
    Ok(amount)
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

    /// CHECK: Pre-validation program account (e.g. Lighthouse).
    /// Pass SystemProgram when pre_validation is Disabled.
    pub pre_validation_program: UncheckedAccount<'info>,

    /// CHECK: Post-validation program account.
    /// Pass SystemProgram when post_validation is Disabled.
    pub post_validation_program: UncheckedAccount<'info>,

    /// Pre-validation PDA — typed-deserialised in the handler when
    /// pre_validation is ProgramCall.
    /// CHECK: Validated in the handler (seeds + typed deserialisation).
    pub pre_validation_pda: UncheckedAccount<'info>,

    /// Post-validation PDA — typed-deserialised in the handler when
    /// post_validation is ProgramCall.
    /// CHECK: Validated in the handler (seeds + typed deserialisation).
    pub post_validation_pda: UncheckedAccount<'info>,

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

    /// Input mint (== fc_input_mint == user_payment.token_mint).
    #[account(
        constraint = mint.key() == composable_policy.forward_config.input_mint,
        constraint = mint.key() == user_payment.token_mint
            @ TributaryError::TokenMintMismatch,
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    /// Output mint. Required for the deliver-transform `transfer_checked`
    /// calls on the output leg (fees + sweep) and the intermediate-output
    /// ATA. In **act mode** (ADR-0026 — `output_mint == Pubkey::default()`)
    /// the caller passes SystemProgram here; the handler skips output-ATA
    /// creation, the deliver sweep, and the `output_amount > 0` guard.
    /// CHECK: conditionally validated in the handler.
    #[account(mut)]
    pub output_mint: UncheckedAccount<'info>,

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

    /// Gateway fee account. Post-ADR-0026 the composable fee path is
    /// **input-side**: fees are skimmed from the gross pull in `input_mint`
    /// before the forward runs, so this account MUST be denominated in
    /// `input_mint` (== `fc_input_mint`).
    #[account(
        mut,
        constraint = gateway_fee_account.mint == composable_policy.forward_config.input_mint
            @ TributaryError::TokenMintMismatch,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
    )]
    pub gateway_fee_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Protocol fee account (input_mint). See `gateway_fee_account`.
    #[account(
        mut,
        constraint = protocol_fee_account.mint == composable_policy.forward_config.input_mint
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

        // Re-validate the input mint at execution time. Token-2022 extensions
        // (TransferHook, TransferFee) are mutable post-creation, so the input
        // mint that was clean at create_user_payment could have turned hostile.
        validate_mint_compatible(&ctx.accounts.mint.to_account_info())?;

        // Extract settlement-shape flags + key mints as small primitives.
        // Keeping the full 267-byte ForwardConfig live blew the SBF frame
        // (ADR-0026 stack-pressure fix). These scalars are all the handler
        // needs; the typed struct is re-read only in scoped blocks below.
        let is_act = ctx.accounts.composable_policy.forward_config.is_act_mode();
        let is_deliver_transform = ctx
            .accounts
            .composable_policy
            .forward_config
            .is_deliver_transform();
        let needs_output_ata = ctx
            .accounts
            .composable_policy
            .forward_config
            .needs_output_ata();
        let fc_output_mint = ctx.accounts.composable_policy.forward_config.output_mint;
        let fc_input_mint = ctx.accounts.composable_policy.forward_config.input_mint;
        let native_output = ctx
            .accounts
            .composable_policy
            .forward_config
            .is_native_output();

        // ── Output-mint validation (mode-conditional, ADR-0026) ────────
        // Act mode: no output mint — skip compatibility check, but require
        // the passed account to be SystemProgram (defence-in-depth against a
        // bogus account being marked writable).
        // Deliver modes: validate the passed output_mint account equals the
        // declared output_mint and is Token-2022-clean.
        if !is_act {
            validate_mint_compatible(&ctx.accounts.output_mint.to_account_info())?;
            require!(
                ctx.accounts.output_mint.key() == fc_output_mint,
                TributaryError::TokenMintMismatch
            );
        } else {
            require!(
                ctx.accounts.output_mint.key() == ctx.accounts.system_program.key(),
                TributaryError::InvalidOutputMintAccount
            );
        }

        // ── Validate recipient destination (only in deliver modes) ────
        // Act mode produces no token output for the recipient — the
        // recipient_token_account is unused for delivery (it still must be
        // passed as a fixed account slot, but we don't validate it).
        // Deliver modes replicate the two checks that used to live on the
        // accounts struct (mint + owner) for the output (or input, in
        // deliver-no-transform) mint.
        if !is_act {
            if native_output {
                require!(
                    ctx.accounts.recipient_token_account.key()
                        == ctx.accounts.composable_policy.recipient,
                    TributaryError::Unauthorized
                );
            } else {
                let rta_info = ctx.accounts.recipient_token_account.to_account_info();
                let data = rta_info.try_borrow_data()?;
                require!(data.len() >= 64, TributaryError::InvalidTokenAccount);
                let rta_mint = Pubkey::try_from(&data[0..32]).unwrap_or_default();
                let rta_owner = Pubkey::try_from(&data[32..64]).unwrap_or_default();
                // deliver-no-transform: recipient ATA is input_mint; else output_mint.
                let expected_mint = if is_deliver_transform {
                    fc_output_mint
                } else {
                    fc_input_mint
                };
                require!(rta_mint == expected_mint, TributaryError::TokenMintMismatch);
                require!(
                    rta_owner == ctx.accounts.composable_policy.recipient,
                    TributaryError::Unauthorized
                );
            }
        }

        // ── Step 1: BYTE-RANGE CHECKS ──────────────────────────────────
        // Validate the forward instruction selector when forward is enabled.
        let ic_program_id = ctx
            .accounts
            .composable_policy
            .forward_config
            .instruction_constraint
            .program_id;
        if ic_program_id != Pubkey::default() {
            validate_byte_ranges(
                &instruction_data,
                &ctx.accounts
                    .composable_policy
                    .forward_config
                    .instruction_constraint
                    .data_checks,
                ctx.accounts
                    .composable_policy
                    .forward_config
                    .instruction_constraint
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

        // The output ATA is only used in deliver-transform mode (a distinct
        // output mint is swept to the recipient). Act mode and deliver-no-
        // transform skip it — act produces no fungible output, deliver-no-
        // transform reuses the input intermediate. (ADR-0026)
        if needs_output_ata {
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
        }

        let composable_policy = &mut ctx.accounts.composable_policy;

        // ── Validate policy + resolve face amount ──────────────────────
        // Routes through `shared::schedule`. Both policy families share one
        // `match` over `PolicyType` for timing gates, milestone release_condition
        // signer bits, and PayAsYouGo chunk/period bounds. The calendar-month
        // math this relies on is pinned by a differential proptest in
        // `shared/schedule.rs`.
        //
        // PayAsYouGo caps bind on GROSS (face + fee) for composable (ADR-0026):
        // we resolve the caller's face, compute gross, then validate gross
        // against the caps. Non-PayAsYouGo variants validate timing/signers
        // with `None` (forward_amount is rejected for them — closes C-1).
        let caller_key = ctx.accounts.fee_payer.key();
        let milestone_signers = MilestoneSigners {
            caller: &caller_key,
            gateway_signer: &ctx.accounts.gateway.signer,
            owner: &ctx.accounts.user_payment.owner,
            recipient: &composable_policy.recipient,
        };

        // Resolve face_amount BEFORE validation. PayAsYouGo takes the caller's
        // forward_amount as face; other variants reject forward_amount and
        // resolve face from the schedule.
        let face_amount = match forward_amount {
            Some(amt) => match &composable_policy.policy_type {
                PolicyType::PayAsYouGo { .. } => amt,
                _ => return err!(TributaryError::InvalidAmount),
            },
            None => {
                let s = validate_policy_execution(
                    &composable_policy.policy_type,
                    now,
                    None,
                    &milestone_signers,
                )?;
                require!(s > 0, TributaryError::InvalidAmount);
                s
            }
        };

        // ── Compute fee on face (NET-on-pull hardcoded, ADR-0026) ──────
        // Composable pulls GROSS = face + fee. The delegate, balance, AND
        // PayAsYouGo caps all bind on gross — both user-protective: a fee-bps
        // hike can fail execution at the delegate OR at a cap. Scoped so the
        // FeeBreakdown (~56 bytes) is released before later locals.
        let gross_pull = {
            let fee_preview = crate::shared::fees::calculate_fees(
                face_amount,
                ctx.accounts.gateway.gateway_fee_bps,
                ctx.accounts
                    .gateway
                    .effective_protocol_share_bps(ctx.accounts.config.protocol_share_bps),
                ctx.accounts.gateway.scheduler_share_bps,
                ctx.accounts.gateway.referral_allocation_bps,
                ctx.accounts.gateway.is_referral_enabled(),
                true, // NET-on-pull hardcoded
            )?;
            face_amount
                .checked_add(fee_preview.total_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?
        };

        // PayAsYouGo: validate gross against chunk/period caps (ADR-0026).
        // Non-PayAsYouGo already validated above (timing + signers).
        if matches!(composable_policy.policy_type, PolicyType::PayAsYouGo { .. }) {
            validate_policy_execution(
                &composable_policy.policy_type,
                now,
                Some(gross_pull),
                &milestone_signers,
            )?;
        }

        require!(
            ctx.accounts.user_token_account.delegated_amount >= gross_pull,
            TributaryError::InsufficientDelegatedAmount
        );
        require!(
            ctx.accounts.user_token_account.amount >= gross_pull,
            TributaryError::InsufficientBalance
        );

        // Snapshot fields we need from composable_policy before any
        // long-lived borrows of it kick in.
        let policy_key = ctx.accounts.composable_policy.key();
        let policy_id = ctx.accounts.composable_policy.policy_id;
        let target_program = ctx
            .accounts
            .composable_policy
            .forward_config
            .instruction_constraint
            .program_id;
        let recipient = ctx.accounts.composable_policy.recipient;
        let pre_validation = ctx.accounts.composable_policy.pre_validation;
        let post_validation = ctx.accounts.composable_policy.post_validation;
        let instruction_constraint = ctx
            .accounts
            .composable_policy
            .forward_config
            .instruction_constraint;

        // ── ADR-0016 caller-conditional gate (amended) ────────────────
        // Cold relayers (non-trusted signers on permissionless gateways)
        // must have a safety net: post_validation = ProgramCall OR the
        // forward route is pinned (InstructionConstraint.has_effective_pins).
        // Trusted three pass unconditionally.
        let gateway_signer = ctx.accounts.gateway.signer;
        let is_trusted_caller = caller_key == gateway_signer
            || caller_key == ctx.accounts.user_payment.owner
            || caller_key == recipient;
        if !is_trusted_caller {
            let has_post_validation = post_validation.is_program_call();
            let has_route_pin = instruction_constraint.has_effective_pins();
            require!(
                has_post_validation || has_route_pin,
                TributaryError::PermissionlessExecutionRequiresSafetyNet
            );
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
        let scheduler_share_bps = ctx.accounts.gateway.scheduler_share_bps;
        let is_permissionless = caller_key != gateway_signer;
        let needs_scheduler_ata = is_permissionless && scheduler_share_bps > 0;

        let (remaining_after_sched, scheduler_ata_info) = if needs_scheduler_ata {
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

        // ── Post-validation target strip (from end) ────────────────────
        // Post-validation targets are the LAST entries (before scheduler ATA
        // which was already stripped). We need to load the post ValidationPda
        // to know how many to peel off.
        let post_num_pinned = if post_validation.is_program_call() {
            let post_pda_info = ctx.accounts.post_validation_pda.to_account_info();
            let post_program_info = ctx.accounts.post_validation_program.to_account_info();
            let post_program_id = post_validation.program_id();
            require!(
                post_program_info.key() == post_program_id,
                TributaryError::ValidationPdaMismatch
            );
            // Just read num_pinned without running the CPI yet — we need
            // the count to split remaining_accounts. The full CPI runs later.
            let val_pda_key = Pubkey::find_program_address(
                &[VALIDATION_PDA_POST_SEED, policy_key.as_ref()],
                ctx.program_id,
            );
            require!(
                post_pda_info.key() == val_pda_key.0,
                TributaryError::ValidationPdaMismatch
            );
            let validation_pda: ValidationPda = {
                let data = post_pda_info.try_borrow_data()?;
                let mut slice: &[u8] = &data;
                ValidationPda::try_deserialize(&mut slice)?
            };
            validation_pda.num_pinned_accounts as usize
        } else {
            0
        };

        let post_start = remaining_after_sched.len().saturating_sub(post_num_pinned);
        let post_val_accounts: Vec<AccountInfo<'info>> =
            remaining_after_sched[post_start..].to_vec();
        let remaining_mid: &[AccountInfo<'info>] = &remaining_after_sched[..post_start];

        // ── Cache account infos used by multiple steps ─────────────────
        // Only cache infos that are referenced across multiple phases. SBF
        // stack pressure (ADR-0026): each AccountInfo clone is ~120 bytes,
        // so single-use infos are created inline at their call site.
        let token_program_info = ctx.accounts.token_program.to_account_info();
        let input_mint_info = ctx.accounts.mint.to_account_info();
        let input_mint_decimals = ctx.accounts.mint.decimals;
        let user_token_info = ctx.accounts.user_token_account.to_account_info();
        let composable_policy_info = ctx.accounts.composable_policy.to_account_info();

        // ── Resolve pull delegate ──────────────────────────────────────
        // (user_payment_info is single-use here — create + consume in scope.)
        let pull_resolution = {
            let user_payment_info = ctx.accounts.user_payment.to_account_info();
            resolve_delegate(
                &ctx.accounts.user_payment,
                user_payment_info,
                ctx.accounts.payments_delegate.to_account_info(),
                ctx.bumps.payments_delegate,
                &ctx.accounts.user_token_account.delegate,
            )?
        };
        let pull_seed_slices: Vec<&[u8]> =
            pull_resolution.seeds.iter().map(|s| s.as_slice()).collect();
        let pull_signer_seeds: &[&[u8]] = &pull_seed_slices;
        let pull_seeds: &[&[&[u8]]] = &[pull_signer_seeds];
        let pull_authority = &pull_resolution.authority_info;

        // ── Create intermediate ATAs ───────────────────────────────────
        // system_program_info + atp_info are only used for ATA creation.
        let fee_payer_info = ctx.accounts.fee_payer.to_account_info();
        let input_ata_info = ctx
            .accounts
            .intermediate_input_token_account
            .to_account_info();
        {
            let system_program_info = ctx.accounts.system_program.to_account_info();
            let atp_info = ctx.accounts.associated_token_program.to_account_info();
            create_ata(
                &input_ata_info,
                &fee_payer_info,
                &composable_policy_info,
                &input_mint_info,
                &system_program_info,
                &token_program_info,
                &atp_info,
            )?;

            // The output ATA is created ONLY in deliver-transform mode.
            if needs_output_ata {
                let output_ata_info = ctx
                    .accounts
                    .intermediate_output_token_account
                    .to_account_info();
                let output_mint_info = ctx.accounts.output_mint.to_account_info();
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
        }

        // ── Phase 1: PULL (user → intermediate_input) ──────────────────
        // NET-on-pull hardcoded (ADR-0026): the pull moves GROSS = face + fee.
        // The fee is skimmed off in the next step; the forward then consumes
        // exactly `face` from intermediate_input.
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
            token_interface::transfer_checked(cpi_ctx, gross_pull, input_mint_decimals)?;
        }

        // ── Phase 1b: SKIM FEES from intermediate_input (ADR-0026) ──────
        // Fees are input-side: protocol + gateway + scheduler cuts are
        // routed to input_mint accounts BEFORE the forward runs. After this,
        // intermediate_input holds exactly `face` — the amount the forward
        // instruction consumes (amount_in = face), making the forward ix
        // relayer-agnostic and ix-stable regardless of fee-bps changes.
        let gateway = &ctx.accounts.gateway;
        let config = &ctx.accounts.config;
        let (_total_fee, protocol_fee, gateway_fee, _scheduler_cut) = skim_input_fees(
            &input_ata_info,
            &input_mint_info,
            input_mint_decimals,
            &composable_policy_info,
            &token_program_info,
            gateway,
            config,
            &ctx.accounts.gateway_fee_account.to_account_info(),
            &ctx.accounts.protocol_fee_account.to_account_info(),
            intermediate_owner_seeds,
            caller_key,
            scheduler_ata_info.as_ref(),
            face_amount,
        )?;

        // ── Phase 2: PRE-VALIDATION CPI (if ProgramCall) ───────────────
        // remaining_mid layout: [...preValTargets, ...forwardAccounts]
        let forward_accounts_start = if pre_validation.is_program_call() {
            let pre_program_info = ctx.accounts.pre_validation_program.to_account_info();
            let pre_pda_info = ctx.accounts.pre_validation_pda.to_account_info();
            require!(
                pre_program_info.key() == pre_validation.program_id(),
                TributaryError::ValidationPdaMismatch
            );
            run_validation_cpi(
                remaining_mid,
                &pre_pda_info,
                &policy_key,
                ctx.program_id,
                &pre_program_info,
                VALIDATION_PDA_PRE_SEED,
            )?
        } else {
            0
        };

        // ── Phase 3: FORWARD CPI (if enabled) ──────────────────────────
        // Pin-check: for each non-wildcard pinned slot, the corresponding
        // remaining_account must match.
        if target_program != Pubkey::default() {
            let n_pins = (instruction_constraint.num_pinned_accounts as usize)
                .min(MAX_PINNED_FORWARD_ACCOUNTS);
            let fwd_base = forward_accounts_start;
            for i in 0..n_pins {
                let pin = instruction_constraint.pinned_accounts[i];
                if pin != Pubkey::default() {
                    require!(
                        fwd_base + i < remaining_mid.len(),
                        TributaryError::MissingForwardAccounts
                    );
                    require!(
                        remaining_mid[fwd_base + i].key() == pin,
                        TributaryError::ByteRangeCheckFailed
                    );
                }
            }
            run_forward_cpi(
                remaining_mid,
                forward_accounts_start,
                target_program,
                &instruction_data,
                intermediate_owner,
                signer_seeds,
            )?;
        }

        // ── Phase 4: POST-VALIDATION CPI (if ProgramCall) ──────────────
        if post_validation.is_program_call() {
            let post_program_info = ctx.accounts.post_validation_program.to_account_info();
            let post_pda_info = ctx.accounts.post_validation_pda.to_account_info();
            // Reuse the already-stripped post_val_accounts.
            run_validation_cpi(
                &post_val_accounts,
                &post_pda_info,
                &policy_key,
                ctx.program_id,
                &post_program_info,
                VALIDATION_PDA_POST_SEED,
            )?;
        }

        // ── Phase 5: SETTLEMENT (shape-dependent, ADR-0026) ────────────
        // Three shapes, each with a distinct residual-routing rule:
        //  1. deliver-no-transform (forward disabled, same mint): the full
        //     `face` is swept to the recipient. No forward ran, no residue.
        //  2. deliver-transform (forward enabled, distinct output_mint): the
        //     forward produced output in intermediate_output — sweep it to
        //     the recipient (>0 guard KEPT). Any under-consumed input residue
        //     goes back to the user.
        //  3. act (forward enabled, sentinel output_mint): the forward
        //     consumed input but produced no fungible output. Sweep the input
        //     residue back to the user. No deliver sweep, no >0 guard.
        let mut output_amount: u64 = 0;
        let mut sweep_amount: u64 = 0;

        if is_deliver_transform {
            // Deliver the forward's output to the recipient. output_mint_info
            // + decimals created lazily (only this branch needs them).
            let output_mint_info = ctx.accounts.output_mint.to_account_info();
            let output_mint_decimals = {
                let data = output_mint_info.try_borrow_data()?;
                require!(data.len() >= 45, TributaryError::InvalidTokenAccount);
                data[44]
            };
            output_amount = sweep_output_to_recipient(
                &ctx.accounts
                    .intermediate_output_token_account
                    .to_account_info(),
                &output_mint_info,
                output_mint_decimals,
                &composable_policy_info,
                &token_program_info,
                &ctx.accounts.recipient_token_account.to_account_info(),
                intermediate_owner_seeds,
                native_output,
            )?;
            sweep_amount = output_amount;

            // Return any under-consumed input residue to the user.
            // (Forward may consume less than `face` — e.g. a swap that
            // short-fills. The user authorized the gross pull; the residue
            // is returned principal, fee already earned on authorization.)
            let _residue = sweep_input_residual_to_user(
                &input_ata_info,
                &input_mint_info,
                input_mint_decimals,
                &composable_policy_info,
                &token_program_info,
                &user_token_info,
                intermediate_owner_seeds,
            )?;
        } else if is_act {
            // Act mode: no output delivery. Return input residue to user.
            // The forward consumed input for a non-token settlement (e.g.
            // Velocity subaccount deposit); whatever it didn't consume comes
            // back. Tributary asserts nothing about delivery — owner's
            // post_validation is the only floor.
            let _residue = sweep_input_residual_to_user(
                &input_ata_info,
                &input_mint_info,
                input_mint_decimals,
                &composable_policy_info,
                &token_program_info,
                &user_token_info,
                intermediate_owner_seeds,
            )?;
        } else {
            // deliver-no-transform: forward disabled, single intermediate
            // holding `face` after fee skim. Sweep it all to the recipient.
            sweep_amount = sweep_input_to_recipient(
                &input_ata_info,
                &input_mint_info,
                input_mint_decimals,
                &composable_policy_info,
                &token_program_info,
                &ctx.accounts.recipient_token_account.to_account_info(),
                intermediate_owner_seeds,
            )?;
            output_amount = sweep_amount;
        }

        // ── VERIFY INTERMEDIATES EMPTY ─────────────────────────────────
        // After settlement, both intermediates must be at zero balance —
        // closure of the ATAs (rent → fee_payer) happens at the end.
        let input_check = read_token_amount(&input_ata_info)?;
        require!(input_check == 0, TributaryError::InsufficientBalance);

        if needs_output_ata && !native_output {
            let output_check = read_token_amount(
                &ctx.accounts
                    .intermediate_output_token_account
                    .to_account_info(),
            )?;
            require!(output_check == 0, TributaryError::InsufficientBalance);
        }

        // ── UPDATE STATE ───────────────────────────────────────────────
        let composable_policy = &mut ctx.accounts.composable_policy;

        // Advance the policy. PayAsYouGo accumulates `gross_pull` into the
        // rolling period total (caps bind on gross, ADR-0026). Other variants
        // advance on face (the schedule amount). Returns `should_complete`
        // for one-shot / exhausted policies.
        let advance_amount =
            if matches!(composable_policy.policy_type, PolicyType::PayAsYouGo { .. }) {
                gross_pull
            } else {
                face_amount
            };
        let should_complete =
            advance_policy(&mut composable_policy.policy_type, now, advance_amount)?;

        // total_input tracks the actual gross tokens pulled from the user.
        composable_policy.total_input = composable_policy
            .total_input
            .checked_add(gross_pull)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        // total_output tracks what the recipient received (in their mint).
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
            input_amount: face_amount,
            output_amount,
            gateway_fee,
            protocol_fee,
            recipient,
            timestamp: now,
            record_id: composable_policy.payment_count,
        });

        msg!(
            "Composable executed: policy={}, face={}, gross={}, output={}, swept={}, gateway_fee={}, protocol_fee={}",
            policy_id,
            face_amount,
            gross_pull,
            output_amount,
            sweep_amount,
            gateway_fee,
            protocol_fee,
        );

        // ── CLOSE intermediate token accounts ──────────────────────────
        // The input intermediate is always closed (rent → fee_payer). The
        // output intermediate is closed only when it was created
        // (deliver-transform mode), unless NATIVE_OUTPUT already closed it
        // via closeAccount in the sweep.
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

        if needs_output_ata
            && close_input_ata.key() != ctx.accounts.intermediate_output_token_account.key()
            && !native_output
        {
            // NATIVE_OUTPUT mode already closed the output intermediate in
            // the sweep (closeAccount). Skipping here avoids a double-close.
            // Act mode never created an output intermediate.
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

    /// S-3 (review 2026-07-06): the bound check now references
    /// `MAX_BYTE_RANGE_CHECKS` explicitly in addition to the slice length.
    /// A `num_checks` value above the constant must be rejected even if
    /// the slice happens to be longer (defense-in-depth against a future
    /// code path that passes a different slice).
    #[test]
    fn validate_byte_ranges_rejects_num_checks_above_max_constant() {
        let checks: [ByteRangeCheck; 4] = [
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
            ByteRangeCheck {
                offset: 0,
                length: 0,
                expected: [0u8; 8],
            },
        ];
        let data = [0u8; 8];

        // MAX_BYTE_RANGE_CHECKS itself is the boundary — accepted.
        assert!(validate_byte_ranges(&data, &checks, MAX_BYTE_RANGE_CHECKS as u8).is_ok());
        // One above must be rejected.
        let res = validate_byte_ranges(&data, &checks, (MAX_BYTE_RANGE_CHECKS as u8) + 1);
        assert!(
            res.is_err(),
            "num_checks > MAX_BYTE_RANGE_CHECKS must be rejected, got {:?}",
            res
        );
    }
}
