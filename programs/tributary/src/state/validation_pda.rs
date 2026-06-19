use anchor_lang::prelude::*;

pub const MAX_VALIDATION_DATA_SIZE: usize = 1024;

#[account]
pub struct ValidationPda {
    pub data_len: u16,
    pub data: [u8; MAX_VALIDATION_DATA_SIZE],
}

impl ValidationPda {
    /// Account size: 8 (Anchor disc) + 2 (data_len) + MAX_VALIDATION_DATA_SIZE
    pub const SIZE: usize = 8 + 2 + MAX_VALIDATION_DATA_SIZE;

    /// Calculate exact account size needed for a given data length
    /// Rounds up to 8-byte alignment for rent efficiency
    pub fn space_for(data_len: usize) -> usize {
        let raw = 8 + 2 + data_len;
        (raw + 7) & !7
    }

    /// Get the validation data slice
    pub fn get_data(&self) -> &[u8] {
        &self.data[..self.data_len as usize]
    }

    /// Returns true iff `info` is an uninitialized account safe for the
    /// manual `create_account` init path: zero lamports and owned by the
    /// system program. This is the freshness invariant Anchor's `init`
    /// enforces automatically; the manual init in `create_composable_policy`
    /// checks it explicitly as defense-in-depth against type cosplay and
    /// re-initialization. See reports/M-02-manual-validation-pda-write.md.
    pub fn is_fresh(info: &AccountInfo) -> bool {
        info.lamports() == 0 && info.owner == &anchor_lang::solana_program::system_program::ID
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::{account_info::AccountInfo, pubkey::Pubkey};

    fn make_info(lamports: u64, owner: Pubkey, data_len: usize) -> AccountInfo<'static> {
        let key = Pubkey::new_unique();
        AccountInfo::new(
            Box::leak(Box::new(key)),
            false,
            true,
            Box::leak(Box::new(lamports)),
            Box::leak(vec![0u8; data_len].into_boxed_slice()),
            Box::leak(Box::new(owner)),
            false,
            0,
        )
    }

    #[test]
    fn is_fresh_accepts_zero_lamport_system_owned_account() {
        let info = make_info(0, anchor_lang::solana_program::system_program::ID, 0);
        assert!(ValidationPda::is_fresh(&info));
    }

    #[test]
    fn is_fresh_rejects_non_zero_lamports() {
        // Pre-funded account — e.g. front-run or stale half-init.
        let info = make_info(
            1_000_000,
            anchor_lang::solana_program::system_program::ID,
            0,
        );
        assert!(!ValidationPda::is_fresh(&info));
    }

    #[test]
    fn is_fresh_rejects_non_system_owner() {
        // Account already owned by another program (type cosplay vector).
        let rogue = Pubkey::new_unique();
        let info = make_info(0, rogue, 32);
        assert!(!ValidationPda::is_fresh(&info));
    }
}
