use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreatePaymentGateway<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: The authority that will own the gateway
    pub authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        space = PaymentGateway::SIZE,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump
    )]
    pub gateway: Account<'info, PaymentGateway>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key(),
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,

    /// CHECK: This is the fee recipient account that will receive gateway fees
    #[account(
        constraint = fee_recipient.key() != Pubkey::default() @ TributaryError::InvalidAmount
    )]
    pub fee_recipient: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreatePaymentGateway<'info> {
    /// Create a new payment gateway with the specified fee structure and metadata.
    pub fn handler_create_payment_gateway(
        ctx: Context<CreatePaymentGateway>,
        gateway_fee_bps: u16,
        name: [u8; 32],
        url: [u8; 64],
    ) -> Result<()> {
        // Validate fee basis points
        require!(gateway_fee_bps <= 10000, TributaryError::InvalidFeeBps);

        let gateway = &mut ctx.accounts.gateway;
        let clock = Clock::get()?;

        gateway.authority = ctx.accounts.authority.key();
        gateway.fee_recipient = ctx.accounts.fee_recipient.key();
        gateway.gateway_fee_bps = gateway_fee_bps;
        gateway.is_active = true;
        gateway.created_at = clock.unix_timestamp;
        gateway.bump = ctx.bumps.gateway;
        gateway.name = name;
        gateway.url = url;
        gateway.signer = ctx.accounts.authority.key();

        emit!(PaymentGatewayCreated {
            authority: gateway.authority,
            fee_recipient: gateway.fee_recipient,
            gateway_fee_bps: gateway.gateway_fee_bps,
            name: gateway.name,
            url: gateway.url,
        });

        msg!(
            "Payment gateway created with authority: {:?}, fee: {} bps, name: {:?}, url: {:?}",
            gateway.authority,
            gateway.gateway_fee_bps,
            String::from_utf8_lossy(&name),
            String::from_utf8_lossy(&url)
        );

        Ok(())
    }
}
