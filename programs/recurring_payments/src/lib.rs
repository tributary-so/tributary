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

declare_id!("CPt2GNFqP5ZAaF1mGYseAi7eRi9aNavqb9sByF5Ypayi");

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
    ) -> Result<()> {
        instructions::create_payment_gateway::handler_create_payment_gateway(ctx, gateway_fee_bps)
    }
}
