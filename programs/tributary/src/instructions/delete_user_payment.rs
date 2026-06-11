use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

const CLOSE_DISCRIMINATOR: [u8; 8] = [u8::MAX; 8];

#[derive(Accounts)]
pub struct DeleteUserPayment<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.owner == owner.key(),
        constraint = user_payment.active_policies_count == 0 @ TributaryError::HasActivePolicies,
    )]
    pub user_payment: Account<'info, UserPayment>,

    pub token_mint: Account<'info, Mint>,

    /// CHECK: Rent recipient - validated in handler against stored rent_payer.
    /// Only used when stored rent_payer != Pubkey::default().
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused,
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> DeleteUserPayment<'info> {
    pub fn handler_delete_user_payment(ctx: Context<DeleteUserPayment>) -> Result<()> {
        let user_payment = &ctx.accounts.user_payment;

        let stored_rent_payer = user_payment.rent_payer;

        let destination = if stored_rent_payer == Pubkey::default() {
            ctx.accounts.owner.to_account_info()
        } else {
            require!(
                ctx.accounts.rent_payer.key() == stored_rent_payer,
                TributaryError::InvalidRentPayer
            );
            ctx.accounts.rent_payer.to_account_info()
        };

        let rent_refund_target = destination.key();

        let info = user_payment.to_account_info();
        {
            let mut data = info.try_borrow_mut_data()?;
            data[..8].copy_from_slice(&CLOSE_DISCRIMINATOR);
        }
        **destination.try_borrow_mut_lamports()? = destination
            .lamports()
            .checked_add(info.lamports())
            .ok_or(TributaryError::ArithmeticOverflow)?;
        **info.try_borrow_mut_lamports()? = 0;

        emit!(UserPaymentDeleted {
            user_payment: user_payment.key(),
            owner: user_payment.owner,
            rent_payer: rent_refund_target,
        });

        msg!(
            "User payment deleted for owner: {:?}, rent returned to: {:?}",
            user_payment.owner,
            rent_refund_target,
        );

        Ok(())
    }
}
