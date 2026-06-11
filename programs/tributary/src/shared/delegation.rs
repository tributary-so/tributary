use crate::{constants::*, error::TributaryError, state::*};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;

pub struct DelegateResolution<'info> {
    pub seeds: Vec<Vec<u8>>,
    pub authority_info: AccountInfo<'info>,
}

pub fn resolve_delegate<'info>(
    user_payment: &Account<'info, UserPayment>,
    user_payment_info: AccountInfo<'info>,
    payments_delegate_info: AccountInfo<'info>,
    payments_delegate_bump: u8,
    delegate: &COption<Pubkey>,
) -> Result<DelegateResolution<'info>> {
    let up_key = user_payment.key();
    let pd_key = payments_delegate_info.key();
    let up_owner = user_payment.owner;
    let up_mint = user_payment.token_mint;
    let up_bump = user_payment.bump;

    match delegate {
        COption::Some(d) if d == &up_key => {
            let seeds: Vec<Vec<u8>> = vec![
                USER_PAYMENT_SEED.to_vec(),
                up_owner.as_ref().to_vec(),
                up_mint.as_ref().to_vec(),
                vec![up_bump],
            ];
            Ok(DelegateResolution {
                seeds,
                authority_info: user_payment_info,
            })
        }
        COption::Some(d) if d == &pd_key => {
            let seeds: Vec<Vec<u8>> = vec![PAYMENTS_SEED.to_vec(), vec![payments_delegate_bump]];
            Ok(DelegateResolution {
                seeds,
                authority_info: payments_delegate_info,
            })
        }
        _ => Err(TributaryError::NoDelegateSet.into()),
    }
}
