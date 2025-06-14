use crate::{state::*, CONFIG_SEED};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = ProgramConfig::SIZE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;

    config.admin = ctx.accounts.admin.key();
    config.fee_recipient = ctx.accounts.admin.key();
    config.protocol_fee_bps = 100; // 1%
    config.max_policies_per_user = 10;
    config.emergency_pause = false;
    config.bump = ctx.bumps.config;

    msg!("Program initialized with admin: {:?}", config.admin);
    Ok(())
}
