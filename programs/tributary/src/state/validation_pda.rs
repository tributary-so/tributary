use anchor_lang::prelude::*;

pub const MAX_VALIDATION_DATA_SIZE: usize = 1024;
/// Capacity of the pinned-account set. Covers the highest Lighthouse
/// assertion arity in use today (`accountDelta` = 2 accounts). Sysvar-clock
/// assertions pin 0, single-target assertions (`tokenAccount`, `mintAccount`,
/// `accountInfo`, `accountData`, `stakeAccount`, `merkleTree`) pin 1.
/// See ADR-0016.
pub const MAX_PINNED_ACCOUNTS: usize = 2;

/// Typed Anchor account storing the Lighthouse assertion bytes for a
/// `ComposablePolicy` plus the owner-pinned target accounts the assertion
/// is allowed to read.
///
/// Promoted from a hand-parsed byte blob per ADR-0016 to close the
/// validation-gaming vector (d): a relayer can no longer substitute a
/// positional validation account to trip the assertion against the wrong
/// state. The target pubkeys are fixed at creation; at execute,
/// `remaining_accounts[0..num_pinned_accounts]` must equal `pinned_accounts`
/// or the call reverts.
#[account]
pub struct ValidationPda {
    pub bump: u8,
    /// Assertion family account arity ∈ {0,1,2}. Determines how many
    /// entries of `pinned_accounts` are active.
    pub num_pinned_accounts: u8,
    /// Owner-declared Lighthouse target accounts, positional. Entries
    /// past `num_pinned_accounts` are zero-padded and ignored.
    pub pinned_accounts: [Pubkey; MAX_PINNED_ACCOUNTS],
    /// Length of the active prefix of `data` (in bytes).
    pub data_len: u16,
    /// Assertion bytes, passed verbatim to Lighthouse at execute.
    /// Only `data[..data_len]` is meaningful; the rest is zero-padding.
    pub data: [u8; MAX_VALIDATION_DATA_SIZE],
}

impl ValidationPda {
    /// Fixed account size: 8 (Anchor disc) + 1 (bump) + 1 (num_pinned) +
    /// 64 (pinned_accounts) + 2 (data_len) + MAX_VALIDATION_DATA_SIZE.
    pub const SIZE: usize = 8 + 1 + 1 + (32 * MAX_PINNED_ACCOUNTS) + 2 + MAX_VALIDATION_DATA_SIZE;

    /// Get the active assertion-data slice.
    pub fn get_data(&self) -> &[u8] {
        &self.data[..self.data_len as usize]
    }

    /// Active slice of the pinned-account set.
    pub fn pinned(&self) -> &[Pubkey] {
        &self.pinned_accounts[..self.num_pinned_accounts as usize]
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

impl Default for ValidationPda {
    fn default() -> Self {
        Self {
            bump: 0,
            num_pinned_accounts: 0,
            pinned_accounts: [Pubkey::default(); MAX_PINNED_ACCOUNTS],
            data_len: 0,
            data: [0u8; MAX_VALIDATION_DATA_SIZE],
        }
    }
}

#[cfg(test)]
// ponytail: tests set a few fields on Default then mutate slices — reassign
// reads cleaner than the struct-literal-with-..Default here.
#[allow(clippy::field_reassign_with_default)]
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
        let info = make_info(
            1_000_000,
            anchor_lang::solana_program::system_program::ID,
            0,
        );
        assert!(!ValidationPda::is_fresh(&info));
    }

    #[test]
    fn is_fresh_rejects_non_system_owner() {
        let rogue = Pubkey::new_unique();
        let info = make_info(0, rogue, 32);
        assert!(!ValidationPda::is_fresh(&info));
    }

    /// SIZE must accommodate the discriminator + every fixed field.
    /// Regression guard: an undersized SIZE would silently truncate the
    /// assertion data array and break CPI replay.
    #[test]
    fn size_covers_full_layout() {
        let expected = 8 + 1 + 1 + 64 + 2 + MAX_VALIDATION_DATA_SIZE;
        assert_eq!(ValidationPda::SIZE, expected);
        assert_eq!(ValidationPda::SIZE, 1100);
    }

    /// `pinned()` returns exactly `num_pinned_accounts` entries, not the
    /// full backing array. Off-by-one here would either drop a pinned
    /// target (security) or feed a zero pubkey to Lighthouse (assertion
    /// misfire).
    #[test]
    fn pinned_slice_respects_arity() {
        let mut pda = ValidationPda::default();
        pda.pinned_accounts[0] = Pubkey::new_unique();
        pda.num_pinned_accounts = 1;
        assert_eq!(pda.pinned().len(), 1);
        assert_eq!(pda.pinned()[0], pda.pinned_accounts[0]);

        pda.pinned_accounts[1] = Pubkey::new_unique();
        pda.num_pinned_accounts = 2;
        assert_eq!(pda.pinned().len(), 2);

        pda.num_pinned_accounts = 0;
        assert!(pda.pinned().is_empty());
    }

    /// `get_data()` honours `data_len`, not the backing array size.
    /// Reading past `data_len` would leak stale padding bytes; reading
    /// short would corrupt the assertion replay.
    #[test]
    fn get_data_respects_data_len() {
        let mut pda = ValidationPda::default();
        pda.data[..5].copy_from_slice(&[1, 2, 3, 4, 5]);
        pda.data_len = 5;
        assert_eq!(pda.get_data(), &[1, 2, 3, 4, 5]);

        pda.data_len = 0;
        assert!(pda.get_data().is_empty());
    }

    /// Round-trip via Borsh: serialise, deserialise, compare. Guards the
    /// declaration order of fields — Borsh reads in declaration order, so
    /// any reorder silently corrupts existing on-chain accounts.
    #[test]
    fn borsh_round_trip_preserves_fields() {
        let mut pda = ValidationPda::default();
        pda.bump = 42;
        pda.num_pinned_accounts = 2;
        pda.pinned_accounts = [Pubkey::new_unique(), Pubkey::new_unique()];
        pda.data_len = 7;
        pda.data[..7].copy_from_slice(&[9, 8, 7, 6, 5, 4, 3]);

        let bytes = pda.try_to_vec().unwrap();
        // try_to_vec does NOT include the 8-byte Anchor discriminator — it
        // serialises the inner struct only. Prepend the discriminator to
        // mimic on-chain layout, then deserialise the way the program
        // would (AccountDeserialize::try_deserialize expects the disc).
        let mut full = Vec::with_capacity(8 + bytes.len());
        full.extend_from_slice(ValidationPda::DISCRIMINATOR);
        full.extend_from_slice(&bytes);
        let mut slice: &[u8] = &full;
        let restored = ValidationPda::try_deserialize(&mut slice).unwrap();

        assert_eq!(restored.bump, 42);
        assert_eq!(restored.num_pinned_accounts, 2);
        assert_eq!(restored.pinned_accounts, pda.pinned_accounts);
        assert_eq!(restored.data_len, 7);
        assert_eq!(&restored.data[..7], &[9, 8, 7, 6, 5, 4, 3]);
    }
}
