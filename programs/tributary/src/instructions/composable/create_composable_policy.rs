use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateComposablePolicy<'info> {
    /// Gateway signer - pays rent and must match gateway.signer
    #[account(
        mut,
        constraint = fee_payer.key() == gateway.signer @ TributaryError::Unauthorized,
    )]
    pub fee_payer: Signer<'info>,

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

    pub system_program: Program<'info, System>,
}

impl<'info> CreateComposablePolicy<'info> {
    pub fn handler(
        ctx: Context<CreateComposablePolicy>,
        schedule: ScheduleType,
        memo: [u8; 64],
        forward_config: ForwardConfig,
        validation_config: ValidationConfig,
    ) -> Result<()> {
        // Validate schedule
        schedule.validate()?;

        // Validate ForwardConfig
        require!(
            ALLOWED_FORWARD_PROGRAMS.contains(&forward_config.target_program),
            TributaryError::InvalidForwardProgram
        );
        require!(
            forward_config.num_data_checks >= 1,
            TributaryError::InsufficientByteRangeChecks
        );
        // Validate each ByteRangeCheck is sane (offset + length doesn't overflow u8)
        for i in 0..forward_config.num_data_checks as usize {
            let check = &forward_config.data_checks[i];
            require!(
                (check.offset as u16)
                    .checked_add(check.length as u16)
                    .map_or(false, |v| v <= 1024),
                TributaryError::ByteRangeCheckFailed
            );
        }

        // Validate ValidationConfig
        if validation_config.validation_program != Pubkey::default() {
            require!(
                ALLOWED_VALIDATION_PROGRAMS.contains(&validation_config.validation_program),
                TributaryError::InvalidValidationProgram
            );
        }

        let clock = Clock::get()?;

        let policy_id = ctx
            .accounts
            .user_payment
            .created_composable_count
            .saturating_add(1);

        let composable_policy = &mut ctx.accounts.composable_policy;
        composable_policy.discriminator = COMPOSABLE_DISCRIMINATOR;
        composable_policy.version = COMPOSABLE_VERSION;
        composable_policy.bump = ctx.bumps.composable_policy;
        composable_policy.user_payment = ctx.accounts.user_payment.key();
        composable_policy.gateway = ctx.accounts.gateway.key();
        composable_policy.status = PolicyStatus::Active;
        composable_policy.rent_payer = ctx.accounts.fee_payer.key();
        composable_policy.schedule = schedule;
        composable_policy.memo = memo;
        composable_policy.forward_config = forward_config;
        composable_policy.validation_config = validation_config;
        composable_policy.recipient = ctx.accounts.fee_payer.key(); // recipient defaults to gateway signer for now
        composable_policy.total_input = 0;
        composable_policy.total_output = 0;
        composable_policy.payment_count = 0;
        composable_policy.policy_id = policy_id;
        composable_policy.created_at = clock.unix_timestamp;
        composable_policy.updated_at = clock.unix_timestamp;
        composable_policy.state_padding = [0u8; 32];
        composable_policy.padding = [0u8; 74];

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
            schedule: composable_policy.schedule.clone(),
            memo: composable_policy.memo,
            forward_config: composable_policy.forward_config.clone(),
            validation_config: composable_policy.validation_config.clone(),
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
