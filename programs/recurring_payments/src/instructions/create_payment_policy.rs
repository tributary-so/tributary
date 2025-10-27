use crate::{constants::*, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(policy_id: u32)]
pub struct CreatePaymentPolicy<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.owner == user.key(),
    )]
    pub user_payment: Account<'info, UserPayment>,

    /// CHECK: This is the recipient account that will receive payments
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: This is the token mint for the payment
    pub token_mint: UncheckedAccount<'info>,

    #[account(
        seeds = [GATEWAY_SEED, gateway.authority.as_ref()],
        bump = gateway.bump,
        constraint = gateway.is_active,
    )]
    pub gateway: Account<'info, PaymentGateway>,

    #[account(
        init,
        payer = user,
        space = PaymentPolicy::SIZE,
        seeds = [
            PAYMENT_POLICY_SEED,
            user_payment.key().as_ref(),
            policy_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub payment_policy: Account<'info, PaymentPolicy>,

    pub system_program: Program<'info, System>,
}

pub fn handler_create_payment_policy(
    ctx: Context<CreatePaymentPolicy>,
    policy_id: u32,
    policy_type: PolicyType,
    memo: [u8; 64],
) -> Result<()> {
    // Validate the policy type and its parameters
    policy_type.validate()?;

    let payment_policy = &mut ctx.accounts.payment_policy;
    let user_payment = &mut ctx.accounts.user_payment;
    let clock = Clock::get()?;

    payment_policy.user_payment = user_payment.key();
    payment_policy.recipient = ctx.accounts.recipient.key();
    payment_policy.gateway = ctx.accounts.gateway.key();
    payment_policy.policy_type = policy_type.clone();
    payment_policy.status = PaymentStatus::Active;
    payment_policy.memo = memo;
    payment_policy.total_paid = 0;
    payment_policy.payment_count = 0;
    payment_policy.created_at = clock.unix_timestamp;
    payment_policy.updated_at = clock.unix_timestamp;
    payment_policy.policy_id = policy_id;
    payment_policy.bump = ctx.bumps.payment_policy;

    // Update user payment account
    user_payment.active_policies_count = user_payment.active_policies_count.checked_add(1).unwrap();
    user_payment.updated_at = clock.unix_timestamp;

    emit!(PaymentPolicyCreated {
        user_payment: payment_policy.user_payment,
        recipient: payment_policy.recipient,
        gateway: payment_policy.gateway,
        policy_id: payment_policy.policy_id,
        policy_type: payment_policy.policy_type.clone(),
        memo: payment_policy.memo,
    });

    // Get next_payment_due from policy_type
    let next_payment_due = match &policy_type {
        PolicyType::Subscription {
            next_payment_due, ..
        } => *next_payment_due,
    };

    msg!(
        "Payment policy created with ID: {}, recipient: {:?}, next payment due: {}",
        policy_id,
        payment_policy.recipient,
        next_payment_due
    );

    Ok(())
}
