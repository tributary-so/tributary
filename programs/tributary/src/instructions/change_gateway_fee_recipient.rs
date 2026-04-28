use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ChangeGatewayFeeRecipient<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key()
    )]
    pub gateway: Account<'info, PaymentGateway>,

    /// CHECK: The new fee recipient that will receive gateway fees. Validated to be non-default.
    #[account(
        constraint = new_fee_recipient.key() != Pubkey::default() @ TributaryError::InvalidAmount
    )]
    pub new_fee_recipient: UncheckedAccount<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> ChangeGatewayFeeRecipient<'info> {
    /// Change the fee recipient for a payment gateway.
    pub fn handler_change_gateway_fee_recipient(
        ctx: Context<ChangeGatewayFeeRecipient>,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        let old_fee_recipient = gateway.fee_recipient;
        gateway.fee_recipient = ctx.accounts.new_fee_recipient.key();

        emit!(GatewayFeeRecipientChanged {
            gateway: gateway.key(),
            old_fee_recipient,
            new_fee_recipient: gateway.fee_recipient,
        });

        msg!(
            "Gateway fee recipient changed from {:?} to {:?} for gateway: {:?}",
            old_fee_recipient,
            gateway.fee_recipient,
            gateway.key()
        );

        Ok(())
    }
}
