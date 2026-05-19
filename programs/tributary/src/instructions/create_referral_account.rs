use crate::{error::TributaryError, state::*, REFERRAL_SEED};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(referral_code: [u8; 6])]
pub struct CreateReferralAccount<'info> {
    /// CHECK: The owner account - does NOT need to sign
    #[account()]
    pub owner: AccountInfo<'info>,

    #[account(
        init,
        payer = fee_payer,
        space = ReferralAccount::SIZE,
        seeds = [REFERRAL_SEED, gateway.key().as_ref(), referral_code.as_slice()],
        bump
    )]
    pub referral_account: AccountLoader<'info, ReferralAccount>,

    /// The gateway this referral account belongs to
    pub gateway: Account<'info, PaymentGateway>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = !config.emergency_pause @ TributaryError::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub fee_payer: Signer<'info>,
}

impl<'info> CreateReferralAccount<'info> {
    pub fn handler_create_referral_account(
        ctx: Context<'_, '_, 'info, 'info, CreateReferralAccount<'info>>,
        referral_code: [u8; 6],
    ) -> Result<()> {
        let clock = Clock::get()?;

        for &byte in &referral_code {
            match byte {
                b'0'..=b'9' | b'A'..=b'Z' | b'a'..=b'z' => {}
                _ => return err!(TributaryError::InvalidReferralCode),
            }
        }

        let new_referral_key = ctx.accounts.referral_account.key();
        let new_owner = ctx.accounts.owner.key();
        let gateway_key = ctx.accounts.gateway.key();

        let mut referrer = Pubkey::default();
        let mut referrer_count = 0u32;

        for account_info in ctx.remaining_accounts.iter() {
            if let Ok(loader) = AccountLoader::<ReferralAccount>::try_from(account_info) {
                let data = loader
                    .load()
                    .map_err(|_| TributaryError::CouldNotDeserializeReferrer)?;

                require!(
                    data.gateway == gateway_key,
                    TributaryError::ReferrerAccountInvalid
                );

                require!(
                    data.owner != new_owner,
                    TributaryError::CircularReferralChain
                );

                require!(
                    data.referrer != new_referral_key,
                    TributaryError::CircularReferralChain
                );

                referrer_count = referrer_count.saturating_add(1);

                if referrer == Pubkey::default() {
                    referrer = *account_info.key;
                }
            }
        }

        require!(
            referrer_count <= 3,
            TributaryError::MaxReferralDepthExceeded
        );

        // Initialize the referral account using load_init for zero_copy
        let mut referral_account = ctx.accounts.referral_account.load_init()?;
        referral_account.gateway = ctx.accounts.gateway.key();
        referral_account.owner = ctx.accounts.owner.key();
        referral_account.referral_code = referral_code;
        referral_account._padding_code = [0u8; 2];
        referral_account.referrer = referrer;
        referral_account.created_at = clock.unix_timestamp;
        referral_account.total_earned = 0;
        referral_account.bump = ctx.bumps.referral_account;
        referral_account._padding_bump = [0u8; 7];
        referral_account._padding = [0u64; 8];

        msg!(
            "Referral account created for {} with code: {}",
            ctx.accounts.owner.key(),
            String::from_utf8_lossy(&referral_code)
        );

        Ok(())
    }
}
