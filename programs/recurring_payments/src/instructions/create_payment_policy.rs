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
    payment_frequency: PaymentFrequency,
    memo: [u8; 64],
    start_time: Option<i64>,
) -> Result<()> {
    let payment_policy = &mut ctx.accounts.payment_policy;
    let user_payment = &mut ctx.accounts.user_payment;
    let clock = Clock::get()?;

    // Calculate next payment due time
    let next_payment_due = start_time.unwrap_or(clock.unix_timestamp);

    payment_policy.user_payment = user_payment.key();
    payment_policy.recipient = ctx.accounts.recipient.key();
    payment_policy.gateway = ctx.accounts.gateway.key();
    payment_policy.policy_type = policy_type;
    payment_policy.status = PaymentStatus::Active;
    payment_policy.payment_frequency = payment_frequency;
    payment_policy.memo = memo;
    payment_policy.next_payment_due = next_payment_due;
    payment_policy.total_paid = 0;
    payment_policy.payment_count = 0;
    payment_policy.created_at = clock.unix_timestamp;
    payment_policy.updated_at = clock.unix_timestamp;
    payment_policy.policy_id = policy_id;
    payment_policy.bump = ctx.bumps.payment_policy;

    // Update user payment account
    user_payment.active_policies_count = user_payment.active_policies_count.checked_add(1).unwrap();
    user_payment.updated_at = clock.unix_timestamp;

    msg!(
        "Payment policy created with ID: {}, recipient: {:?}, next payment due: {}",
        policy_id,
        payment_policy.recipient,
        next_payment_due
    );

    Ok(())
}

impl PaymentPolicy {
    pub const SIZE: usize = 8 + // discriminator
        32 + // user_payment: Pubkey
        32 + // recipient: Pubkey
        32 + // gateway: Pubkey
        PolicyType::VARIANT_SIZE + // policy type size
        1 + // status: PaymentStatus
        1 + 8 + // payment_frequency: PaymentFrequency (largest variant)
        64 + // memo: [u8; 64]
        8 + // next_payment_due: i64
        8 + // total_paid: u64
        4 + // payment_count: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        4 + // policy_id: u32
        1 + // bump: u8
        256; // padding: [u8; 256]
}
