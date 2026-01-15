use crate::error::TributaryError;
use anchor_lang::prelude::{Account, AccountInfo, Pubkey};
use anchor_lang::Result;
use anchor_spl::token::TokenAccount;
use arrayref::array_ref;
use std::collections::BTreeMap;

pub struct TokenAccountMap<'a>(pub BTreeMap<Pubkey, Account<'a, TokenAccount>>);

impl<'a> TokenAccountMap<'a> {
    pub fn load<'b: 'a>(
        account_info_iter: &mut std::slice::Iter<'b, AccountInfo<'a>>,
        expected_mint: Pubkey,
    ) -> Result<TokenAccountMap<'a>> {
        let mut map = TokenAccountMap(BTreeMap::new());

        for account_info in account_info_iter {
            if !account_info.is_writable {
                continue;
            }

            let data = match account_info.try_borrow_data() {
                Ok(d) => d,
                Err(_) => continue,
            };

            if data.len() < 72 {
                continue;
            }

            let mint_slice = array_ref![data, 32, 32];
            let account_mint = Pubkey::from(*mint_slice);

            if account_mint != expected_mint {
                continue;
            }

            let token_account =
                Account::try_from(account_info).map_err(|_| TributaryError::InvalidTokenAccount)?;

            map.0.insert(*account_info.key, token_account);
        }

        Ok(map)
    }

    #[inline(always)]
    pub fn get(&self, pubkey: &Pubkey) -> Option<&Account<'a, TokenAccount>> {
        self.0.get(pubkey)
    }

    #[inline(always)]
    pub fn len(&self) -> usize {
        self.0.len()
    }

    #[inline(always)]
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    #[inline(always)]
    pub fn keys(&self) -> Vec<Pubkey> {
        self.0.keys().cloned().collect()
    }

    pub fn get_by_owner(&self, owner_pubkey: &Pubkey) -> Option<&Account<'a, TokenAccount>> {
        self.0.values().find(|ta| ta.owner == *owner_pubkey)
    }
}
