use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(policy_id: u32)]
pub struct ChangeComposableStatus<'info> {
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
    )]
    pub composable_policy: Box<Account<'info, ComposablePolicy>>,

    #[account(
        seeds = [GATEWAY_SEED, gateway.authority.as_ref()],
        bump = gateway.bump,
        constraint = composable_policy.gateway == gateway.key(),
    )]
    pub gateway: Box<Account<'info, PaymentGateway>>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Box<Account<'info, ProgramConfig>>,
}

impl<'info> ChangeComposableStatus<'info> {
    pub fn handler(
        ctx: Context<ChangeComposableStatus>,
        _policy_id: u32,
        new_status: PolicyStatus,
    ) -> Result<()> {
        let composable_policy = &mut ctx.accounts.composable_policy;
        let user_payment = &mut ctx.accounts.user_payment;
        let clock = Clock::get()?;

        // Only gateway signer OR policy owner can change status
        let owner_key = ctx.accounts.owner.key();
        let is_gateway_signer = owner_key == ctx.accounts.gateway.signer;
        let is_policy_owner = owner_key == user_payment.owner;
        require!(
            is_gateway_signer || is_policy_owner,
            TributaryError::Unauthorized
        );

        let old_status = composable_policy.status.clone();

        // Only allow Active <-> Paused transitions
        // Completed is terminal (set only by execution)
        match (&old_status, &new_status) {
            (PolicyStatus::Active, PolicyStatus::Paused)
            | (PolicyStatus::Paused, PolicyStatus::Active) => {}
            _ => return err!(TributaryError::InvalidPolicyStatusTransition),
        }

        composable_policy.status = new_status.clone();
        composable_policy.updated_at = clock.unix_timestamp;
        user_payment.updated_at = clock.unix_timestamp;

        emit!(ComposablePolicyStatusChanged {
            composable_policy: composable_policy.key(),
            old_status,
            new_status,
        });

        msg!(
            "Composable policy status changed: id={}, status={:?}",
            composable_policy.policy_id,
            composable_policy.status,
        );

        Ok(())
    }
}
