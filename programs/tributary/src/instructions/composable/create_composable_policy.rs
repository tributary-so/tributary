use crate::{
    constants::*, error::TributaryError, shared::mint::validate_mint_compatible, state::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

/// Caller-supplied init data for one validation phase (pre or post).
/// Only meaningful when the corresponding `ValidationSpec` is `ProgramCall`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidationInit {
    pub num_pinned_accounts: u8,
    pub pinned_accounts: [Pubkey; MAX_PINNED_ACCOUNTS],
    pub validation_data: Vec<u8>,
}

impl Default for ValidationInit {
    fn default() -> Self {
        Self {
            num_pinned_accounts: 0,
            pinned_accounts: [Pubkey::default(); MAX_PINNED_ACCOUNTS],
            validation_data: Vec::new(),
        }
    }
}

#[derive(Accounts)]
pub struct CreateComposablePolicy<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,

    /// CHECK: The owner account - has to sign, always, so it authorizes spending from user
    #[account(
        constraint = user_payment.owner == user.key(),
    )]
    pub user: Signer<'info>,

    /// CHECK: Explicit recipient of composable policy outputs.
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

    /// CHECK: Pre-validation PDA — init'd in handler when pre_validation = ProgramCall.
    #[account(mut)]
    pub pre_validation_pda: UncheckedAccount<'info>,

    /// CHECK: Post-validation PDA — init'd in handler when post_validation = ProgramCall.
    #[account(mut)]
    pub post_validation_pda: UncheckedAccount<'info>,

    /// CHECK: Pre-validation program. Pass SystemProgram when pre_validation = Disabled.
    pub pre_validation_program: UncheckedAccount<'info>,

    /// CHECK: Post-validation program. Pass SystemProgram when post_validation = Disabled.
    pub post_validation_program: UncheckedAccount<'info>,

    pub input_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Output mint. In **deliver** modes (forward disabled, or forward
    /// enabled with a concrete output_mint) this is the recipient's
    /// delivery mint and MUST be a real SPL Mint. In **act mode**
    /// (ADR-0026 — forward enabled, `output_mint == Pubkey::default()`)
    /// the caller passes SystemProgram here; there is no output token to
    /// deliver and no output ATA is created. Validated conditionally in
    /// the handler.
    /// CHECK: validated in handler; mint compatibility checked when concrete.
    pub output_mint: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateComposablePolicy<'info> {
    // ponytail: arg list is the on-chain program interface (locked by the IDL).
    #[allow(clippy::too_many_arguments)]
    pub fn handler(
        ctx: Context<CreateComposablePolicy>,
        policy_type: PolicyType,
        memo: [u8; 32],
        forward_config: ForwardConfig,
        pre_validation: ValidationSpec,
        pre_init: ValidationInit,
        post_validation: ValidationSpec,
        post_init: ValidationInit,
    ) -> Result<()> {
        policy_type.validate()?;
        validate_forward_config(&forward_config)?;

        let forward_disabled = forward_config.instruction_constraint.is_disabled();

        require!(
            ctx.accounts.input_mint.key() == forward_config.input_mint,
            TributaryError::TokenMintMismatch
        );
        // Output-mint account validation is mode-conditional (ADR-0026):
        //  - act mode (sentinel output_mint): pass SystemProgram, skip mint
        //    compatibility (no output token exists).
        //  - deliver modes: the passed account MUST equal the declared
        //    output_mint AND be a Token-2022-clean SPL Mint.
        if forward_config.output_mint == Pubkey::default() {
            require!(
                ctx.accounts.output_mint.key() == ctx.accounts.system_program.key(),
                TributaryError::InvalidOutputMintAccount
            );
        } else {
            require!(
                ctx.accounts.output_mint.key() == forward_config.output_mint,
                TributaryError::TokenMintMismatch
            );
            validate_mint_compatible(&ctx.accounts.output_mint.to_account_info())?;
        }
        validate_mint_compatible(&ctx.accounts.input_mint.to_account_info())?;

        // ByteRangeCheck sanity + discriminator-pin (same as before, now
        // reading from instruction_constraint).
        if !forward_disabled {
            let ic = &forward_config.instruction_constraint;
            let mut covers_discriminator = false;
            for i in 0..ic.num_data_checks as usize {
                let check = &ic.data_checks[i];
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

        // Validate both ValidationSpecs and init their PDAs.
        validate_spec_and_program(
            pre_validation,
            ctx.accounts.pre_validation_program.key(),
            ctx.accounts.system_program.key(),
        )?;
        validate_spec_and_program(
            post_validation,
            ctx.accounts.post_validation_program.key(),
            ctx.accounts.system_program.key(),
        )?;

        validate_init(&pre_validation, &pre_init)?;
        validate_init(&post_validation, &post_init)?;

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
        composable_policy.pre_validation = pre_validation;
        composable_policy.post_validation = post_validation;
        composable_policy.recipient = ctx.accounts.recipient.key();
        composable_policy.total_input = 0;
        composable_policy.total_output = 0;
        composable_policy.payment_count = 0;
        composable_policy.policy_id = policy_id;
        composable_policy.created_at = clock.unix_timestamp;
        composable_policy.updated_at = clock.unix_timestamp;
        composable_policy.padding = [0u8; 192];

        let policy_key = composable_policy.key();
        let fee_payer_info = ctx.accounts.fee_payer.to_account_info();

        if pre_validation.is_program_call() {
            init_validation_pda(
                &ctx.accounts.pre_validation_pda,
                &fee_payer_info,
                &pre_init,
                &policy_key,
                ctx.program_id,
                VALIDATION_PDA_PRE_SEED,
            )?;
        }

        if post_validation.is_program_call() {
            init_validation_pda(
                &ctx.accounts.post_validation_pda,
                &fee_payer_info,
                &post_init,
                &policy_key,
                ctx.program_id,
                VALIDATION_PDA_POST_SEED,
            )?;
        }

        let user_payment = &mut ctx.accounts.user_payment;
        user_payment.created_composable_count = policy_id;
        user_payment.active_composable_count =
            user_payment.active_composable_count.saturating_add(1);
        user_payment.updated_at = clock.unix_timestamp;

        emit!(ComposablePolicyCreated {
            composable_policy: policy_key,
            user_payment: composable_policy.user_payment,
            gateway: composable_policy.gateway,
            recipient: composable_policy.recipient,
            policy_id,
            policy_type: composable_policy.policy_type.clone(),
            memo: composable_policy.memo,
            forward_config: composable_policy.forward_config,
            pre_validation: composable_policy.pre_validation,
            post_validation: composable_policy.post_validation,
            has_pre_validation_pda: pre_validation.is_program_call(),
            has_post_validation_pda: post_validation.is_program_call(),
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

/// Resolve a ValidationSpec against the caller-supplied program account.
/// Rejects Inline at create (not yet implemented).
fn validate_spec_and_program(
    spec: ValidationSpec,
    passed_program: Pubkey,
    system_program: Pubkey,
) -> Result<()> {
    match spec {
        ValidationSpec::Disabled => {
            require!(
                passed_program == system_program,
                TributaryError::InvalidValidationProgram
            );
        }
        ValidationSpec::ProgramCall { program_id } => {
            require!(
                passed_program == program_id,
                TributaryError::ValidationPdaMismatch
            );
            require!(
                ALLOWED_VALIDATION_PROGRAMS.contains(&program_id),
                TributaryError::InvalidValidationProgram
            );
        }
        ValidationSpec::Inline { .. } => {
            return err!(TributaryError::InlineValidationNotImplemented)
        }
    }
    Ok(())
}

/// Validate the ValidationInit data for a given spec.
fn validate_init(spec: &ValidationSpec, init: &ValidationInit) -> Result<()> {
    match spec {
        ValidationSpec::Disabled => {
            require!(
                init.validation_data.is_empty(),
                TributaryError::ValidationNotRequired
            );
            Ok(())
        }
        ValidationSpec::ProgramCall { .. } => {
            require!(
                !init.validation_data.is_empty(),
                TributaryError::ValidationDataRequired
            );
            require!(
                init.validation_data.len() <= MAX_VALIDATION_DATA_SIZE,
                TributaryError::ValidationDataTooLarge
            );
            require!(
                init.num_pinned_accounts as usize <= MAX_PINNED_ACCOUNTS,
                TributaryError::InvalidValidationProgram
            );
            Ok(())
        }
        ValidationSpec::Inline { .. } => err!(TributaryError::InlineValidationNotImplemented),
    }
}

/// Create + serialise a ValidationPda at the given seed.
///
/// # SAFETY — manual init, layout-sync critical
///
/// This function writes the ValidationPda account by hand (`invoke_signed`
/// `create_account` + raw `try_to_vec` copy) rather than via Anchor's
/// `init` constraint. The bytes written here MUST stay byte-for-byte
/// compatible with `ValidationPda` as declared in
/// `state/validation_pda.rs` and with `AccountDeserialize::try_deserialize`
/// at execute time. The struct layout is:
///
///   `[8-byte disc][bump: u8][num_pinned_accounts: u8]
///    [pinned_accounts: [Pubkey; MAX_PINNED_ACCOUNTS]][data_len: u16]
///    [data: [u8; MAX_VALIDATION_DATA_SIZE]]`
///
/// `ValidationPda::SIZE` (used for the rent calculation below) is the
/// single source of truth for the account byte length — any field added,
/// removed, or resized in the struct MUST update `SIZE` in lockstep, or
/// this init will under/over-allocate and future reads will panic or
/// deserialise garbage. The `borsh_round_trip_preserves_fields` test in
/// `state/validation_pda.rs` guards the declaration order; the
/// `size_covers_full_layout` test guards the size arithmetic. See ST-2
/// (review 2026-07-06).
fn init_validation_pda<'info>(
    pda_account: &UncheckedAccount<'info>,
    fee_payer: &AccountInfo<'info>,
    init: &ValidationInit,
    policy_key: &Pubkey,
    program_id: &Pubkey,
    seed: &[u8],
) -> Result<()> {
    let pda_key = Pubkey::find_program_address(&[seed, policy_key.as_ref()], program_id);
    require!(
        pda_account.key() == pda_key.0,
        TributaryError::ValidationPdaMismatch
    );

    let space = ValidationPda::SIZE;
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);

    let pda_info = pda_account.to_account_info();
    require!(
        ValidationPda::is_fresh(&pda_info),
        TributaryError::IntermediateAccountAlreadyExists
    );

    let seeds: Vec<Vec<u8>> = vec![seed.to_vec(), policy_key.as_ref().to_vec(), vec![pda_key.1]];
    let seed_slices: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();

    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::create_account(
            &fee_payer.key(),
            &pda_info.key(),
            lamports,
            space as u64,
            program_id,
        ),
        &[fee_payer.clone(), pda_info.clone()],
        &[&seed_slices],
    )?;

    let typed = ValidationPda {
        bump: pda_key.1,
        num_pinned_accounts: init.num_pinned_accounts,
        pinned_accounts: init.pinned_accounts,
        data_len: init.validation_data.len() as u16,
        data: {
            let mut buf = [0u8; MAX_VALIDATION_DATA_SIZE];
            buf[..init.validation_data.len()].copy_from_slice(&init.validation_data);
            buf
        },
    };
    let mut account_data = pda_info.try_borrow_mut_data()?;
    account_data[..8].copy_from_slice(ValidationPda::DISCRIMINATOR);
    let fields = typed.try_to_vec()?;
    account_data[8..8 + fields.len()].copy_from_slice(&fields);
    Ok(())
}

/// Validate the forward-program portion of a `ForwardConfig`.
///
/// Settlement shapes (ADR-0026):
/// - **deliver, no transform**: forward disabled, `output_mint == input_mint`.
/// - **deliver, transform**: forward enabled, `output_mint` set (!= input_mint).
/// - **act**: forward enabled, `output_mint == Pubkey::default()` (sentinel) —
///   forward consumes input but produces no fungible output token; the
///   program skips the output ATA + deliver sweep, and the `output_amount > 0`
///   guard. Owner's `post_validation` is the only settlement floor.
pub fn validate_forward_config(forward_config: &ForwardConfig) -> Result<()> {
    let ic = &forward_config.instruction_constraint;
    let forward_disabled = ic.is_disabled();

    require!(
        forward_disabled || ALLOWED_FORWARD_PROGRAMS.contains(&ic.program_id),
        TributaryError::InvalidForwardProgram
    );

    if forward_disabled {
        require!(
            ic.num_data_checks == 0,
            TributaryError::InsufficientByteRangeChecks
        );
        // Deliver-no-transform: output_mint MUST equal input_mint. A disabled
        // forward with a different output_mint would misroute the payment —
        // there is no transform step to reconcile the two mints. The
        // Pubkey::default() sentinel (act mode) is only meaningful WITH a
        // forward enabled.
        require!(
            forward_config.output_mint == forward_config.input_mint,
            TributaryError::ForwardDisabledRequiresSameMint
        );
    } else {
        require!(
            ic.num_data_checks >= 1 && ic.num_data_checks <= MAX_BYTE_RANGE_CHECKS as u8,
            TributaryError::InsufficientByteRangeChecks
        );
        // Degenerate-pin guard (bean tributary-q82g): a forward-enabled
        // InstructionConstraint with zero effective pins is nonsensical and
        // would weaken the cold-relayer OR-gate.
        require!(
            ic.has_effective_pins(),
            TributaryError::DegenerateForwardPins
        );
        // Act-mode output-mint sentinel is allowed; any other output_mint
        // value triggers deliver-transform semantics (validated at execute
        // by the >0 guard + output ATA creation).
    }

    // NATIVE_OUTPUT only makes sense in deliver-transform mode — it pins
    // `output_mint == NATIVE_MINT` so the WSOL→SOL closeAccount sweep is
    // well-defined. Act mode has no output mint to unwrap.
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
            instruction_constraint: InstructionConstraint {
                program_id: Pubkey::default(),
                num_data_checks,
                data_checks: [ByteRangeCheck {
                    offset: 0,
                    length: 0,
                    expected: [0u8; 8],
                }; MAX_BYTE_RANGE_CHECKS],
                num_pinned_accounts: 0,
                pinned_accounts: [Pubkey::default(); MAX_PINNED_FORWARD_ACCOUNTS],
            },
            input_mint: mint,
            output_mint: mint,
            forward_flags: 0,
        }
    }

    fn enabled_config(target: Pubkey, num_data_checks: u8) -> ForwardConfig {
        let mint = Pubkey::new_unique();
        ForwardConfig {
            instruction_constraint: InstructionConstraint {
                program_id: target,
                num_data_checks,
                data_checks: [ByteRangeCheck {
                    offset: 0,
                    length: 0,
                    expected: [0u8; 8],
                }; MAX_BYTE_RANGE_CHECKS],
                num_pinned_accounts: 1,
                pinned_accounts: [
                    Pubkey::new_unique(),
                    Pubkey::default(),
                    Pubkey::default(),
                    Pubkey::default(),
                ],
            },
            input_mint: mint,
            output_mint: Pubkey::new_unique(),
            forward_flags: 0,
        }
    }

    /// Act-mode config: forward enabled, output_mint = sentinel.
    fn act_mode_config(target: Pubkey, num_data_checks: u8) -> ForwardConfig {
        let mut cfg = enabled_config(target, num_data_checks);
        cfg.output_mint = Pubkey::default();
        cfg
    }

    #[test]
    fn disabled_forward_with_same_mint_and_zero_checks_is_ok() {
        let mint = same_mint();
        assert!(validate_forward_config(&disabled_config(mint, 0)).is_ok());
    }

    #[test]
    fn disabled_forward_rejects_non_zero_data_checks() {
        let mint = same_mint();
        assert!(validate_forward_config(&disabled_config(mint, 1)).is_err());
    }

    #[test]
    fn disabled_forward_rejects_cross_mint() {
        let mut cfg = disabled_config(Pubkey::new_unique(), 0);
        cfg.output_mint = Pubkey::new_unique();
        assert!(validate_forward_config(&cfg).is_err());
    }

    #[test]
    fn enabled_forward_rejects_non_allowlisted_target() {
        let rogue = Pubkey::new_unique();
        assert!(validate_forward_config(&enabled_config(rogue, 1)).is_err());
    }

    #[test]
    fn enabled_forward_rejects_zero_data_checks() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        assert!(validate_forward_config(&enabled_config(allowlisted, 0)).is_err());
    }

    #[test]
    fn enabled_forward_accepts_allowlisted_target_with_checks() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        assert!(validate_forward_config(&enabled_config(allowlisted, 1)).is_ok());
    }

    #[test]
    fn native_output_rejects_non_wsol_output_mint() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        let mut cfg = enabled_config(allowlisted, 1);
        cfg.forward_flags = FORWARD_FLAG_NATIVE_OUTPUT;
        assert!(validate_forward_config(&cfg).is_err());
    }

    #[test]
    fn native_output_accepts_wsol_output_mint() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        let mut cfg = enabled_config(allowlisted, 1);
        cfg.forward_flags = FORWARD_FLAG_NATIVE_OUTPUT;
        cfg.output_mint = NATIVE_MINT;
        assert!(validate_forward_config(&cfg).is_ok());
    }

    /// Degenerate-pin guard: enabled forward with zero effective pins is rejected.
    #[test]
    fn enabled_forward_rejects_zero_effective_pins() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        let mint = same_mint();
        let cfg = ForwardConfig {
            instruction_constraint: InstructionConstraint {
                program_id: allowlisted,
                num_data_checks: 1,
                data_checks: [ByteRangeCheck {
                    offset: 0,
                    length: 1,
                    expected: [0u8; 8],
                }; MAX_BYTE_RANGE_CHECKS],
                num_pinned_accounts: 0, // zero pins
                pinned_accounts: [Pubkey::default(); MAX_PINNED_FORWARD_ACCOUNTS],
            },
            input_mint: mint,
            output_mint: Pubkey::new_unique(),
            forward_flags: 0,
        };
        assert!(validate_forward_config(&cfg).is_err());
    }

    /// Disabled forward with zero pins is fine (pins irrelevant when disabled).
    #[test]
    fn disabled_forward_allows_zero_pins() {
        let mint = same_mint();
        assert!(validate_forward_config(&disabled_config(mint, 0)).is_ok());
    }

    /// Act mode (ADR-0026): forward enabled + sentinel output_mint is valid.
    #[test]
    fn act_mode_accepts_sentinel_output_mint() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        assert!(validate_forward_config(&act_mode_config(allowlisted, 1)).is_ok());
    }

    /// NATIVE_OUTPUT flag is incompatible with act mode (no output to unwrap).
    #[test]
    fn act_mode_rejects_native_output_flag() {
        let allowlisted = ALLOWED_FORWARD_PROGRAMS[0];
        let mut cfg = act_mode_config(allowlisted, 1);
        cfg.forward_flags = FORWARD_FLAG_NATIVE_OUTPUT;
        assert!(validate_forward_config(&cfg).is_err());
    }

    /// Deliver-transform with sentinel output_mint is NOT act mode and NOT
    /// deliver — output_mint sentinel requires forward enabled (act mode)
    /// OR is just invalid. A disabled forward with sentinel output_mint is
    /// rejected by the same-mint rule.
    #[test]
    fn disabled_forward_rejects_sentinel_output_mint() {
        let mint = same_mint();
        let mut cfg = disabled_config(mint, 0);
        cfg.output_mint = Pubkey::default(); // sentinel != mint
        assert!(validate_forward_config(&cfg).is_err());
    }
}
