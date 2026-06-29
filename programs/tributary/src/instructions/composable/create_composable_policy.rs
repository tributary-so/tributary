use crate::{
    constants::*, error::TributaryError, shared::mint::validate_mint_compatible, state::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
pub struct CreateComposablePolicy<'info> {
    /// Rent payer — only covers rent for the policy (and optional
    /// ValidationPda) accounts. Receives rent back on delete. This
    /// account is NOT the recipient. See
    /// reports/B3-fee-payer-becomes-recipient-without-gateway-signer-constraint.md
    #[account(mut)]
    pub fee_payer: Signer<'info>,

    /// CHECK: The owner account - has to sign, always, so it authorizes spending from user
    #[account(
        constraint = user_payment.owner == user.key(),
    )]
    pub user: Signer<'info>,

    /// CHECK: Explicit recipient of composable policy outputs. This is
    /// an authority — the corresponding output-mint ATA is derived and
    /// validated at execute time (`recipient_token_account.owner ==
    /// composable_policy.recipient`). Must be non-default to prevent
    /// accidental burn-to-nowhere policies. Mirrors the pattern in
    /// `create_payment_policy::CreatePaymentPolicy::recipient`.
    #[account(
        constraint = recipient.key() != Pubkey::default() @ TributaryError::InvalidAmount,
    )]
    pub recipient: UncheckedAccount<'info>,

    #[account(
        init,
        payer = fee_payer,
        space = ComposablePolicy::SIZE,
        seeds = [
            COMPOSABLE_POLICY_SEED,
            user_payment.key().as_ref(),
            (user_payment.created_composable_count + 1).to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub composable_policy: Account<'info, ComposablePolicy>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, user_payment.owner.as_ref(), user_payment.token_mint.as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.is_active,
    )]
    pub user_payment: Box<Account<'info, UserPayment>>,

    #[account(
        seeds = [GATEWAY_SEED, gateway.authority.as_ref()],
        bump = gateway.bump,
        constraint = gateway.is_active,
    )]
    pub gateway: Box<Account<'info, PaymentGateway>>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Box<Account<'info, ProgramConfig>>,

    /// CHECK: Optional ValidationPDA — validated and init'd in handler
    #[account(mut)]
    pub validation_pda: UncheckedAccount<'info>,

    /// CHECK: Validation program account (e.g. Lighthouse).
    /// Pass SystemProgram when no validation is configured.
    pub validation_program: UncheckedAccount<'info>,

    /// Forward input mint. Pinned against `forward_config.input_mint`
    /// in the handler (Anchor constraints can't reach handler args) and
    /// fully validated via `validate_mint_compatible` to reject Token-2022
    /// TransferHook / PermanentDelegate / ConfidentialTransferMint etc.
    /// that would break `transfer_checked` at execute time or drain the
    /// PDA-owned intermediate ATA. See reports/L-02-mint-validation-call-sites-incomplete.md
    /// and shared-base §17/§23.
    pub input_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Forward output mint. Pinned against `forward_config.output_mint`
    /// in the handler and validated the same way as `input_mint`.
    pub output_mint: Box<InterfaceAccount<'info, Mint>>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateComposablePolicy<'info> {
    pub fn handler(
        ctx: Context<CreateComposablePolicy>,
        policy_type: PolicyType,
        memo: [u8; 32],
        forward_config: ForwardConfig,
        num_validation_accounts: u8,
        validation_data: Vec<u8>,
    ) -> Result<()> {
        // Validate policy_type (delegates to PolicyType::validate which
        // covers Subscription / Milestone / PayAsYouGo).
        policy_type.validate()?;

        // Validate ForwardConfig. Extracted so the branching rules
        // (allowlist/sentinel, data-check coupling, cross-mint guard) are
        // unit-tested directly — the Anchor handler is hard to exercise
        // without a running validator.
        //
        // `target_program == Pubkey::default()` is the explicit sentinel
        // for "no forward step" — mirrors the validation_program sentinel
        // pattern. The topup flow (same-mint pull → sweep, no swap) uses
        // this: the intermediate is funded by the pull and swept directly,
        // so no forward CPI is required. Allowing tokenProgram here instead
        // would be a drain vector (unvalidated `to` account in the forward
        // AccountMeta list).
        validate_forward_config(&forward_config)?;
        let forward_disabled = forward_config.target_program == Pubkey::default();

        // L-02: pin the named `input_mint` / `output_mint` accounts against
        // the caller-supplied `forward_config` Pubkeys and run the full
        // Token-2022 extension allowlist on both. Without this, a policy
        // could be created against a TransferHook / PermanentDelegate /
        // ConfidentialTransferMint mint that breaks `transfer_checked` at
        // execute time (or drains the PDA-owned intermediate ATA in the
        // PermanentDelegate case). See reports/L-02-mint-validation-call-sites-incomplete.md.
        require!(
            ctx.accounts.input_mint.key() == forward_config.input_mint,
            TributaryError::TokenMintMismatch
        );
        require!(
            ctx.accounts.output_mint.key() == forward_config.output_mint,
            TributaryError::TokenMintMismatch
        );
        validate_mint_compatible(&ctx.accounts.input_mint.to_account_info())?;
        validate_mint_compatible(&ctx.accounts.output_mint.to_account_info())?;
        // Validate each ByteRangeCheck is sane (offset + length doesn't overflow u8)
        // and at least one check pins the discriminator at offset 0.
        //
        // `length <= 8` is mandatory because `expected` is a `[u8; 8]`:
        // any larger value would panic in `ByteRangeCheck::validate` on
        // `&self.expected[..length]`. See reports/H-06-byte-range-check-length-unbounded.md.
        //
        // Skipped entirely when forward is disabled (num_data_checks == 0):
        // there is no forward instruction selector to pin.
        let mut covers_discriminator = false;
        if !forward_disabled {
            for i in 0..forward_config.num_data_checks as usize {
                let check = &forward_config.data_checks[i];
                require!(
                    (check.offset as u16)
                        .checked_add(check.length as u16)
                        .is_some_and(|v| v <= 1024),
                    TributaryError::ByteRangeCheckFailed
                );
                require!(check.length <= 8, TributaryError::ByteRangeCheckFailed);
                if check.offset == 0 && check.length > 0 {
                    covers_discriminator = true;
                }
            }
            require!(
                covers_discriminator,
                TributaryError::DiscriminatorCheckRequired
            );
        }

        // Validate ValidationConfig — the validation program is now an
        // account so the runtime can resolve it for CPI. SystemProgram is
        // the explicit sentinel for "no validation". Any other non-
        // whitelisted program is rejected.
        let validation_program = ctx.accounts.validation_program.key();
        let has_validation = if validation_program == ctx.accounts.system_program.key() {
            false
        } else {
            require!(
                ALLOWED_VALIDATION_PROGRAMS.contains(&validation_program),
                TributaryError::InvalidValidationProgram
            );
            true
        };

        if has_validation {
            require!(
                !validation_data.is_empty(),
                TributaryError::ValidationDataRequired
            );
            require!(
                validation_data.len() <= MAX_VALIDATION_DATA_SIZE,
                TributaryError::ValidationDataTooLarge
            );
            require!(
                num_validation_accounts <= 10,
                TributaryError::InvalidValidationProgram
            );
        } else {
            require!(
                validation_data.is_empty(),
                TributaryError::ValidationNotRequired
            );
        }

        let clock = Clock::get()?;

        let policy_id = ctx
            .accounts
            .user_payment
            .created_composable_count
            .saturating_add(1);

        let composable_policy = &mut ctx.accounts.composable_policy;
        composable_policy.bump = ctx.bumps.composable_policy;
        composable_policy.user_payment = ctx.accounts.user_payment.key();
        composable_policy.gateway = ctx.accounts.gateway.key();
        composable_policy.status = PolicyStatus::Active;
        composable_policy.rent_payer = ctx.accounts.fee_payer.key();
        composable_policy.policy_type = policy_type;
        composable_policy.memo = memo;
        composable_policy.forward_config = forward_config;
        composable_policy.validation_config = if has_validation {
            ValidationConfig {
                validation_program,
                num_validation_accounts,
            }
        } else {
            ValidationConfig::default()
        };
        composable_policy.recipient = ctx.accounts.recipient.key();
        composable_policy.total_input = 0;
        composable_policy.total_output = 0;
        composable_policy.payment_count = 0;
        composable_policy.policy_id = policy_id;
        composable_policy.created_at = clock.unix_timestamp;
        composable_policy.updated_at = clock.unix_timestamp;
        composable_policy.padding = [0u8; 32];

        if has_validation {
            let validation_pda_key = Pubkey::find_program_address(
                &[VALIDATION_PDA_SEED, composable_policy.key().as_ref()],
                ctx.program_id,
            );
            require!(
                ctx.accounts.validation_pda.key() == validation_pda_key.0,
                TributaryError::ValidationPdaMismatch
            );

            let space = ValidationPda::space_for(validation_data.len());
            let rent = Rent::get()?;
            let lamports = rent.minimum_balance(space);

            let fee_payer_info = ctx.accounts.fee_payer.to_account_info();
            let validation_pda_info = ctx.accounts.validation_pda.to_account_info();

            // M-02: Defense-in-depth freshness guard. The create_account CPI
            // below would fail anyway if the account exists, but this explicit
            // check documents the invariant and fails fast with a precise error
            // (matching the pattern in execute_composable.rs). Guards against
            // type cosplay / re-initialization if a future variant reuses these
            // seeds. See reports/M-02-manual-validation-pda-write.md.
            require!(
                ValidationPda::is_fresh(&validation_pda_info),
                TributaryError::IntermediateAccountAlreadyExists
            );

            let seeds: Vec<Vec<u8>> = vec![
                VALIDATION_PDA_SEED.to_vec(),
                composable_policy.key().as_ref().to_vec(),
                vec![validation_pda_key.1],
            ];
            let seed_slices: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();

            anchor_lang::solana_program::program::invoke_signed(
                &anchor_lang::solana_program::system_instruction::create_account(
                    &fee_payer_info.key(),
                    &validation_pda_info.key(),
                    lamports,
                    space as u64,
                    ctx.program_id,
                ),
                &[fee_payer_info.clone(), validation_pda_info.clone()],
                &[&seed_slices],
            )?;

            // Write data
            let mut account_data = validation_pda_info.try_borrow_mut_data()?;
            let disc: &[u8] = &ValidationPda::DISCRIMINATOR;
            account_data[..8].copy_from_slice(disc);
            let data_len_u16 = validation_data.len() as u16;
            account_data[8..10].copy_from_slice(&data_len_u16.to_le_bytes());
            account_data[10..10 + validation_data.len()].copy_from_slice(&validation_data);
        }

        let user_payment = &mut ctx.accounts.user_payment;
        user_payment.created_composable_count = policy_id;
        user_payment.active_composable_count =
            user_payment.active_composable_count.saturating_add(1);
        user_payment.updated_at = clock.unix_timestamp;

        emit!(ComposablePolicyCreated {
            composable_policy: composable_policy.key(),
            user_payment: composable_policy.user_payment,
            gateway: composable_policy.gateway,
            recipient: composable_policy.recipient,
            policy_id,
            policy_type: composable_policy.policy_type.clone(),
            memo: composable_policy.memo,
            forward_config: composable_policy.forward_config,
            validation_config: composable_policy.validation_config,
            has_validation_pda: has_validation,
        });

        msg!(
            "Composable policy created: id={}, gateway={}, active_composable={}",
            policy_id,
            composable_policy.gateway,
            user_payment.active_composable_count,
        );

        Ok(())
    }
}

/// Validate the forward-program portion of a `ForwardConfig`.
///
/// Rules:
/// - `target_program == Pubkey::default()` is the "forward disabled"
///   sentinel (mirrors the validation_program sentinel). When disabled:
///     * `num_data_checks` MUST be 0 (no forward instruction to validate)
///     * `input_mint` MUST equal `output_mint` (no conversion step)
/// - Otherwise `target_program` MUST be in `ALLOWED_FORWARD_PROGRAMS` and
///   `num_data_checks` MUST be in `1..=MAX_BYTE_RANGE_CHECKS`.
/// - When the `NATIVE_OUTPUT` flag (bit 0) is set, the post-swap sweep
///   `closeAccount`s the WSOL intermediate into the recipient's system
///   wallet. That only makes sense if the forward output is WSOL itself,
///   so `output_mint == NATIVE_MINT` is required. Auto-unwrapping any
///   other `output_mint` would close an unrelated token account.
///
/// The per-check sanity loop + discriminator-pin requirement stay in the
/// handler (they only run when forward is enabled).
pub(crate) fn validate_forward_config(forward_config: &ForwardConfig) -> Result<()> {
    let forward_disabled = forward_config.target_program == Pubkey::default();
    require!(
        forward_disabled || ALLOWED_FORWARD_PROGRAMS.contains(&forward_config.target_program),
        TributaryError::InvalidForwardProgram
    );

    if forward_disabled {
        require!(
            forward_config.num_data_checks == 0,
            TributaryError::InsufficientByteRangeChecks
        );
        require!(
            forward_config.input_mint == forward_config.output_mint,
            TributaryError::ForwardDisabledRequiresSameMint
        );
    } else {
        require!(
            forward_config.num_data_checks >= 1
                && forward_config.num_data_checks <= MAX_BYTE_RANGE_CHECKS as u8,
            TributaryError::InsufficientByteRangeChecks
        );
    }

    // NATIVE_OUTPUT requires output_mint == NATIVE_MINT. The sweep unwraps
    // the post-swap WSOL balance via closeAccount, which only makes sense
    // when the forward actually produces WSOL. See bean tributary-hgp7 and
    // reports/native-output-sweep.md.
    if forward_config.is_native_output() {
        require!(
            forward_config.output_mint == NATIVE_MINT,
            TributaryError::NativeOutputRequiresWsol
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn same_mint() -> Pubkey {
        Pubkey::new_unique()
    }

    fn disabled_config(mint: Pubkey, num_data_checks: u8) -> ForwardConfig {
        ForwardConfig {
            target_program: Pubkey::default(),
            input_mint: mint,
            output_mint: mint,
            min_output_amount: None,
            forward_flags: 0,
            num_data_checks,
            data_checks: [ByteRangeCheck {
                offset: 0,
                length: 0,
                expected: [0u8; 8],
            }; MAX_BYTE_RANGE_CHECKS],
        }
    }

    fn enabled_config(target: Pubkey, num_data_checks: u8) -> ForwardConfig {
        let mint = Pubkey::new_unique();
        ForwardConfig {
            target_program: target,
            input_mint: mint,
            output_mint: Pubkey::new_unique(),
            min_output_amount: None,
            forward_flags: 0,
            num_data_checks,
            data_checks: [ByteRangeCheck {
                offset: 0,
                length: 0,
                expected: [0u8; 8],
            }; MAX_BYTE_RANGE_CHECKS],
        }
    }

    #[test]
    fn disabled_forward_with_same_mint_and_zero_checks_is_ok() {
        let mint = same_mint();
        assert!(validate_forward_config(&disabled_config(mint, 0)).is_ok());
    }

    #[test]
    fn disabled_forward_rejects_non_zero_data_checks() {
        let mint = same_mint();
        let res = validate_forward_config(&disabled_config(mint, 1));
        assert!(
            res.is_err(),
            "disabled forward must reject num_data_checks > 0"
        );
    }

    #[test]
    fn disabled_forward_rejects_cross_mint() {
        let mut cfg = disabled_config(Pubkey::new_unique(), 0);
        cfg.output_mint = Pubkey::new_unique(); // distinct from input
        let res = validate_forward_config(&cfg);
        assert!(
            res.is_err(),
            "disabled forward must require input_mint == output_mint"
        );
    }

    #[test]
    fn enabled_forward_rejects_non_allowlisted_target() {
        // A random pubkey is neither the default sentinel nor allowlisted.
        let rogue = Pubkey::new_unique();
        let res = validate_forward_config(&enabled_config(rogue, 1));
        assert!(res.is_err(), "rogue forward target must be rejected");
    }

    #[test]
    fn enabled_forward_rejects_zero_data_checks() {
        // Allowlisted target but zero checks violates the >= 1 rule.
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        let res = validate_forward_config(&enabled_config(allowlisted, 0));
        assert!(
            res.is_err(),
            "enabled forward must require num_data_checks >= 1"
        );
    }

    #[test]
    fn enabled_forward_accepts_allowlisted_target_with_checks() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        let res = validate_forward_config(&enabled_config(allowlisted, 1));
        assert!(res.is_ok(), "allowlisted target + 1 check must be valid");
    }

    /// NATIVE_OUTPUT flag (bit 0) requires output_mint == NATIVE_MINT.
    /// Auto-unwrapping a non-WSOL forward output would close an unrelated
    /// token account. See bean tributary-hgp7.
    #[test]
    fn native_output_rejects_non_wsol_output_mint() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        let mut cfg = enabled_config(allowlisted, 1);
        cfg.forward_flags = FORWARD_FLAG_NATIVE_OUTPUT;
        // output_mint is a random pubkey (set by enabled_config) — reject.
        let res = validate_forward_config(&cfg);
        assert!(
            res.is_err(),
            "NATIVE_OUTPUT without WSOL output_mint must be rejected"
        );
    }

    #[test]
    fn native_output_accepts_wsol_output_mint() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        let mut cfg = enabled_config(allowlisted, 1);
        cfg.forward_flags = FORWARD_FLAG_NATIVE_OUTPUT;
        cfg.output_mint = NATIVE_MINT;
        assert!(validate_forward_config(&cfg).is_ok());
    }

    #[test]
    fn native_output_ignored_when_flag_clear() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        // Default enabled_config has a non-WSOL output mint and flag = 0.
        let cfg = enabled_config(allowlisted, 1);
        assert!(validate_forward_config(&cfg).is_ok());
    }
}
