use crate::{
    constants::*,
    error::TributaryError,
    shared::account_close::{close_account, resolve_rent_destination},
    state::*,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(policy_id: u32)]
pub struct DeleteComposablePolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, owner.key().as_ref(), user_payment.token_mint.as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.owner == owner.key(),
    )]
    pub user_payment: Box<Account<'info, UserPayment>>,

    #[account(
        mut,
        seeds = [
            COMPOSABLE_POLICY_SEED,
            user_payment.key().as_ref(),
            policy_id.to_le_bytes().as_ref(),
        ],
        bump = composable_policy.bump,
        constraint = composable_policy.status != PolicyStatus::Active @ TributaryError::InvalidPolicyStatusTransition,
    )]
    pub composable_policy: Box<Account<'info, ComposablePolicy>>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Box<Account<'info, ProgramConfig>>,

    /// CHECK: Rent recipient - validated in handler against stored rent_payer.
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
}

impl<'info> DeleteComposablePolicy<'info> {
    pub fn handler(ctx: Context<DeleteComposablePolicy>, _policy_id: u32) -> Result<()> {
        let composable_policy = &ctx.accounts.composable_policy;
        let user_payment = &mut ctx.accounts.user_payment;
        let clock = Clock::get()?;

        let stored_rent_payer = composable_policy.rent_payer;

        let destination = resolve_rent_destination(
            stored_rent_payer,
            &ctx.accounts.owner.to_account_info(),
            &ctx.accounts.rent_payer.to_account_info(),
        )?;

        let rent_refund_target = destination.key();

        // Read state before closing anything (data is zeroed on close)
        let has_pre = composable_policy.pre_validation.is_program_call();
        let has_post = composable_policy.post_validation.is_program_call();
        let policy_key = composable_policy.key();
        let policy_id = composable_policy.policy_id;

        let remaining = ctx.remaining_accounts;

        // Close pre/post ValidationPDAs. They arrive as remaining_accounts in
        // order: [pre_pda?, post_pda?]. Each is seed-verified before close.
        let mut idx = 0;
        if has_pre {
            require!(!remaining.is_empty(), TributaryError::ValidationPdaMismatch);
            let val_pda_key = Pubkey::find_program_address(
                &[VALIDATION_PDA_PRE_SEED, policy_key.as_ref()],
                ctx.program_id,
            );
            require!(
                remaining[idx].key() == val_pda_key.0,
                TributaryError::ValidationPdaMismatch
            );
            close_account(&remaining[idx], &destination)?;
            idx += 1;
        }

        if has_post {
            require!(idx < remaining.len(), TributaryError::ValidationPdaMismatch);
            let val_pda_key = Pubkey::find_program_address(
                &[VALIDATION_PDA_POST_SEED, policy_key.as_ref()],
                ctx.program_id,
            );
            require!(
                remaining[idx].key() == val_pda_key.0,
                TributaryError::ValidationPdaMismatch
            );
            close_account(&remaining[idx], &destination)?;
        }

        // Close ComposablePolicy
        let info = composable_policy.to_account_info();
        close_account(&info, &destination)?;

        emit!(ComposablePolicyDeleted {
            composable_policy: policy_key,
            user_payment: user_payment.key(),
            policy_id,
        });

        user_payment.active_composable_count =
            user_payment.active_composable_count.saturating_sub(1);
        user_payment.updated_at = clock.unix_timestamp;

        msg!(
            "Composable policy deleted: id={}, user_payment={}, rent_to={:?}",
            policy_id,
            user_payment.key(),
            rent_refund_target,
        );

        Ok(())
    }
}
