use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

const CLOSE_DISCRIMINATOR: [u8; 8] = [u8::MAX; 8];

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

        let destination = if stored_rent_payer == Pubkey::default() {
            ctx.accounts.owner.to_account_info()
        } else {
            require!(
                ctx.accounts.rent_payer.key() == stored_rent_payer,
                TributaryError::InvalidRentPayer
            );
            ctx.accounts.rent_payer.to_account_info()
        };

        let rent_refund_target = destination.key();

        let info = composable_policy.to_account_info();
        {
            let mut data = info.try_borrow_mut_data()?;
            data[..8].copy_from_slice(&CLOSE_DISCRIMINATOR);
        }
        **destination.try_borrow_mut_lamports()? = destination
            .lamports()
            .checked_add(info.lamports())
            .ok_or(TributaryError::ArithmeticOverflow)?;
        **info.try_borrow_mut_lamports()? = 0;

        emit!(ComposablePolicyDeleted {
            composable_policy: composable_policy.key(),
            user_payment: user_payment.key(),
            policy_id: composable_policy.policy_id,
        });

        user_payment.active_composable_count =
            user_payment.active_composable_count.saturating_sub(1);
        user_payment.updated_at = clock.unix_timestamp;

        msg!(
            "Composable policy deleted: id={}, user_payment={}, rent_to={:?}",
            composable_policy.policy_id,
            user_payment.key(),
            rent_refund_target,
        );

        Ok(())
    }
}
