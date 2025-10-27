use crate::{constants::*, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(policy_id: u32)]
pub struct ChangePaymentPolicyStatus<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
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
    )]
    pub payment_policy: Account<'info, PaymentPolicy>,
}

pub fn handler_change_payment_policy_status(
    ctx: Context<ChangePaymentPolicyStatus>,
    _policy_id: u32,
    new_status: PaymentStatus,
) -> Result<()> {
    let payment_policy = &mut ctx.accounts.payment_policy;
    let user_payment = &mut ctx.accounts.user_payment;
    let clock = Clock::get()?;

    // Update the policy status
    let old_status = payment_policy.status.clone();
    payment_policy.status = new_status.clone();
    payment_policy.updated_at = clock.unix_timestamp;

    // Update user payment updated timestamp
    user_payment.updated_at = clock.unix_timestamp;

    emit!(PaymentPolicyStatusChanged {
        payment_policy: payment_policy.key(),
        old_status: old_status.clone(),
        new_status,
    });

    msg!(
        "Payment policy status changed from {:?} to {:?} for policy ID: {}",
        old_status,
        payment_policy.status,
        payment_policy.policy_id
    );

    Ok(())
}
