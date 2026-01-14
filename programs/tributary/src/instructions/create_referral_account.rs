use crate::{error::TributaryError, state::*, REFERRAL_SEED};
use anchor_lang::prelude::*;
use arrayref::array_ref;

#[derive(Accounts)]
#[instruction(referral_code: [u8; 6])]
pub struct CreateReferralAccount<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = ReferralAccount::SIZE,
        seeds = [REFERRAL_SEED, gateway.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub referral_account: Account<'info, ReferralAccount>,

    /// The gateway this referral account belongs to
    pub gateway: Account<'info, PaymentGateway>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateReferralAccount<'info> {
    pub fn handler_create_referral_account(
        ctx: Context<CreateReferralAccount>,
        referral_code: [u8; 6],
    ) -> Result<()> {
        let referral_account = &mut ctx.accounts.referral_account;
        let clock = Clock::get()?;

        // Validate referral code format (alphanumeric)
        for &byte in &referral_code {
            match byte {
                b'0'..=b'9' | b'A'..=b'Z' | b'a'..=b'z' => {} // Valid
                _ => return err!(TributaryError::InvalidReferralCode),
            }
        }

        let mut referrer = Pubkey::default();

        for account_info in ctx.remaining_accounts.iter() {
            // Verify discriminator to ensure this is a valid ReferralAccount
            let data = match account_info.try_borrow_data() {
                Ok(data) => data,
                Err(_) => break,
            };
            let expected_data_len = ReferralAccount::SIZE;
            if data.len() < expected_data_len {
                break;
            }
            let account_discriminator = array_ref![data, 0, 8];
            if account_discriminator != &ReferralAccount::DISCRIMINATOR {
                break;
            }
            referrer = *account_info.key;
        }

        referral_account.gateway = ctx.accounts.gateway.key();
        referral_account.owner = ctx.accounts.owner.key();
        referral_account.referral_code = referral_code;
        referral_account.referrer = referrer;
        referral_account.created_at = clock.unix_timestamp;
        referral_account.total_earned = 0;
        referral_account.bump = ctx.bumps.referral_account;
        referral_account.padding = [0u64; 8];

        msg!(
            "Referral account created for {} with code: {}",
            referral_account.owner,
            String::from_utf8_lossy(&referral_code)
        );

        Ok(())
    }
}
