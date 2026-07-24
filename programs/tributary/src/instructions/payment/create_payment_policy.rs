use crate::{
    constants::*, error::TributaryError, shared::mint::validate_mint_compatible,
    shared::schedule::sanitize_policy_for_creation, state::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use qedgen_macros::qed;

#[derive(Accounts)]
pub struct CreatePaymentPolicy<'info> {
    /// CHECK: The owner account - has to sign, always, so it authorizes spending from user
    #[account(
        constraint = user_payment.owner == user.key(),
    )]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump = user_payment.bump,
    )]
    pub user_payment: Box<Account<'info, UserPayment>>,

    /// CHECK: This is the recipient account that will receive payments. It is an authority, the
    /// corresponding tokenAccount/ata will be derived during execution.
    #[account(
        constraint = recipient.key() != Pubkey::default() @ TributaryError::InvalidAmount,
    )]
    pub recipient: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,

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

    #[account(
        init,
        payer = fee_payer,
        space = PaymentPolicy::SIZE,
        seeds = [
            PAYMENT_POLICY_SEED,
            user_payment.key().as_ref(),
            (user_payment.created_policies_count + 1).to_le_bytes().as_ref()
        ],
        bump
    )]
    pub payment_policy: Account<'info, PaymentPolicy>,

    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub fee_payer: Signer<'info>,
}

impl<'info> CreatePaymentPolicy<'info> {
    /// Create a new payment policy with the specified type and memo.
    #[qed(
        verified,
        spec = "../../tributary.qedspec",
        handler = "create_payment_policy",
        hash = "46d488d88d37f4a2",
        spec_hash = "aac1743900b759ae"
    )]
    pub fn handler_create_payment_policy(
        ctx: Context<CreatePaymentPolicy>,
        policy_type: PolicyType,
        memo: [u8; 64],
    ) -> Result<()> {
        // Re-validate the mint: Token-2022 extensions (TransferHook, TransferFee)
        // are mutable post-creation, so a mint clean at create_user_payment time
        // could have become hostile.
        validate_mint_compatible(&ctx.accounts.token_mint.to_account_info())?;

        // Validate the policy type and its parameters
        policy_type.validate()?;

        let clock = Clock::get()?;

        // Adjust schedule fields for creation (CF-005): clamp past due dates
        // and force PayAsYouGo period start to now. Single source of truth in
        // shared::schedule — the composable create path uses the same helper.
        let mut adjusted_policy_type = policy_type.clone();
        sanitize_policy_for_creation(&mut adjusted_policy_type, clock.unix_timestamp);

        let payment_policy = &mut ctx.accounts.payment_policy;
        let user_payment = &mut ctx.accounts.user_payment;

        // Enforce maximum policies per user limit (check active policies count)
        // DEPRECATED!
        // require!(
        //     user_payment.active_policies_count < u32::MAX
        //         && user_payment.active_policies_count < ctx.accounts.config.max_policies_per_user,
        //     TributaryError::MaxPoliciesReached
        // );

        // CF-021: checked_add — at u32::MAX, saturating_add(1) returns
        // u32::MAX, colliding with the previous ID at that number and
        // producing a confusing "already in use" Anchor init error.
        let policy_id = user_payment
            .created_policies_count
            .checked_add(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        payment_policy.user_payment = user_payment.key();
        payment_policy.recipient = ctx.accounts.recipient.key();
        payment_policy.gateway = ctx.accounts.gateway.key();
        payment_policy.policy_type = adjusted_policy_type;
        payment_policy.status = PolicyStatus::Active;
        payment_policy.memo = memo;
        payment_policy.total_paid = 0;
        payment_policy.payment_count = 0;
        payment_policy.created_at = clock.unix_timestamp;
        payment_policy.updated_at = clock.unix_timestamp;
        payment_policy.policy_id = policy_id;
        payment_policy.bump = ctx.bumps.payment_policy;
        payment_policy.rent_payer = ctx.accounts.fee_payer.key();

        emit!(PaymentPolicyCreated {
            user_payment: payment_policy.user_payment,
            recipient: payment_policy.recipient,
            gateway: payment_policy.gateway,
            policy_id: payment_policy.policy_id,
            policy_type: payment_policy.policy_type.clone(),
            memo: payment_policy.memo,
            created_policies_count: user_payment.created_policies_count,
        });

        // Update user payment account
        user_payment.active_policies_count = user_payment.active_policies_count.saturating_add(1);
        user_payment.created_policies_count = policy_id;
        user_payment.updated_at = clock.unix_timestamp;

        msg!(
            "Payment policy created with ID: {}, recipient: {:?}, active_count: {}, total_created: {}",
            policy_id,
            payment_policy.recipient,
            user_payment.active_policies_count,
            user_payment.created_policies_count,
        );

        Ok(())
    }
}
