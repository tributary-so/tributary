use crate::{
    constants::*,
    error::TributaryError,
    shared::account_close::{close_account, resolve_rent_destination},
    state::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
#[instruction(policy_id: u32)]
pub struct DeletePaymentPolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.owner == owner.key(),
    )]
    pub user_payment: Account<'info, UserPayment>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [
            PAYMENT_POLICY_SEED,
            user_payment.key().as_ref(),
            policy_id.to_le_bytes().as_ref()
        ],
        bump = payment_policy.bump,
    )]
    pub payment_policy: Account<'info, PaymentPolicy>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// CHECK: Rent recipient - validated in handler against stored rent_payer.
    /// Only used when stored rent_payer != Pubkey::default().
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
}

impl<'info> DeletePaymentPolicy<'info> {
    /// Delete a payment policy and close account.
    pub fn handler_delete_payment_policy(
        ctx: Context<DeletePaymentPolicy>,
        _policy_id: u32,
    ) -> Result<()> {
        let payment_policy = &ctx.accounts.payment_policy;
        let user_payment = &mut ctx.accounts.user_payment;
        let clock = Clock::get()?;

        let stored_rent_payer = payment_policy.rent_payer;

        let destination = resolve_rent_destination(
            stored_rent_payer,
            &ctx.accounts.owner.to_account_info(),
            &ctx.accounts.rent_payer.to_account_info(),
        )?;

        let rent_refund_target = destination.key();

        let info = payment_policy.to_account_info();
        close_account(&info, &destination)?;

        emit!(PaymentPolicyDeleted {
            payment_policy: payment_policy.key(),
            owner: user_payment.owner,
            policy_id: payment_policy.policy_id,
        });

        // Update user payment count (decrease active policies count)
        user_payment.active_policies_count = user_payment.active_policies_count.saturating_sub(1);
        user_payment.updated_at = clock.unix_timestamp;

        msg!(
            "Payment policy deleted with ID: {} for user: {:?}, rent returned to: {:?}",
            payment_policy.policy_id,
            user_payment.owner,
            rent_refund_target,
        );

        Ok(())
    }
}
