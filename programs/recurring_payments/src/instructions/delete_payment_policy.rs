use crate::{constants::*, state::*};
use anchor_lang::prelude::*;

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

    /// CHECK: This is the token mint for the payment
    pub token_mint: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            PAYMENT_POLICY_SEED,
            user_payment.key().as_ref(),
            policy_id.to_le_bytes().as_ref()
        ],
        bump = payment_policy.bump,
        close = owner
    )]
    pub payment_policy: Account<'info, PaymentPolicy>,
}

pub fn handler_delete_payment_policy(
    ctx: Context<DeletePaymentPolicy>,
    _policy_id: u32,
) -> Result<()> {
    let payment_policy = &ctx.accounts.payment_policy;
    let user_payment = &mut ctx.accounts.user_payment;
    let clock = Clock::get()?;

    // Update user payment count (decrease active policies count)
    user_payment.active_policies_count = user_payment
        .active_policies_count
        .checked_sub(1)
        .unwrap_or(0);
    user_payment.updated_at = clock.unix_timestamp;

    msg!(
        "Payment policy deleted with ID: {} for user: {:?}",
        payment_policy.policy_id,
        user_payment.owner
    );

    Ok(())
}
