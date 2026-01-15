use crate::state::ReferralAccount;
use anchor_lang::prelude::{AccountInfo, AccountLoader, Pubkey};
use anchor_lang::Result;
use std::collections::BTreeMap;

pub struct ReferralAccountMap<'a>(pub BTreeMap<Pubkey, AccountLoader<'a, ReferralAccount>>);

impl<'a> ReferralAccountMap<'a> {
    pub fn load<'b: 'a>(
        account_info_iter: &mut std::slice::Iter<'b, AccountInfo<'a>>,
    ) -> Result<ReferralAccountMap<'a>> {
        let mut map = ReferralAccountMap(BTreeMap::new());

        for account_info in account_info_iter {
            if account_info.is_writable {
                break;
            }

            if account_info.data_len() < ReferralAccount::SIZE {
                break;
            }

            // Try to load as AccountLoader - this validates the discriminator
            let loader = match AccountLoader::<ReferralAccount>::try_from(account_info) {
                Ok(l) => l,
                Err(_) => break,
            };

            // Verify we can actually load the data
            if loader.load().is_err() {
                break;
            }

            map.0.insert(*account_info.key, loader);
        }

        Ok(map)
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
}
