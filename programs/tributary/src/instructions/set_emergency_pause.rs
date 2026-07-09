use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SetEmergencyPause<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TributaryError::Unauthorized
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> SetEmergencyPause<'info> {
    pub fn handler_set_emergency_pause(
        ctx: Context<SetEmergencyPause>,
        paused: bool,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let was_paused = config.emergency_pause;
        config.emergency_pause = paused;

        emit!(EmergencyPauseChanged {
            admin: ctx.accounts.admin.key(),
            was_paused,
            is_paused: paused,
        });

        msg!("Emergency pause set to {} (was {})", paused, was_paused,);

        Ok(())
    }
}
