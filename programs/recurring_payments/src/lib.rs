#![allow(unexpected_cfgs)]
#![allow(clippy::result_large_err)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");

#[program]
pub mod recurring_payments {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handle_initialize(ctx)
    }

    pub fn create_user_payment(ctx: Context<CreateUserPayment>) -> Result<()> {
        instructions::create_user_payment::handler_create_user_payment(ctx)
    }

    pub fn create_payment_gateway(
        ctx: Context<CreatePaymentGateway>,
        gateway_fee_bps: u16,
        name: [u8; 32],
        url: [u8; 64],
    ) -> Result<()> {
        instructions::create_payment_gateway::handler_create_payment_gateway(ctx, gateway_fee_bps, name, url)
    }

    pub fn create_payment_policy(
        ctx: Context<CreatePaymentPolicy>,
        policy_id: u32,
        policy_type: PolicyType,
        memo: [u8; 64],
    ) -> Result<()> {
        instructions::create_payment_policy::handler_create_payment_policy(
            ctx,
            policy_id,
            policy_type,
            memo,
        )
    }

    pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
        instructions::execute_payment::handler_execute_payment(ctx)
    }

    pub fn change_payment_policy_status(
        ctx: Context<ChangePaymentPolicyStatus>,
        policy_id: u32,
        new_status: PaymentStatus,
    ) -> Result<()> {
        instructions::change_payment_policy_status::handler_change_payment_policy_status(
            ctx, policy_id, new_status,
        )
    }

    pub fn delete_payment_policy(ctx: Context<DeletePaymentPolicy>, policy_id: u32) -> Result<()> {
        instructions::delete_payment_policy::handler_delete_payment_policy(ctx, policy_id)
    }
}
