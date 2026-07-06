use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ChangeProgramAuthority<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: The new admin key. Validated to be non-default.
    #[account(constraint = new_admin.key() != Pubkey::default() @ TributaryError::InvalidAmount)]
    pub new_admin: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TributaryError::Unauthorized
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> ChangeProgramAuthority<'info> {
    /// Rotate the protocol admin. Existing admin must sign; new admin is
    /// recorded for future admin-gated calls. `fee_recipient` is untouched.
    pub fn handler_change_program_authority(ctx: Context<ChangeProgramAuthority>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let old_admin = config.admin;
        config.admin = ctx.accounts.new_admin.key();

        emit!(ProgramAuthorityChanged {
            old_admin,
            new_admin: config.admin,
        });

        msg!(
            "Program authority rotated from {:?} to {:?}",
            old_admin,
            config.admin
        );

        Ok(())
    }
}
