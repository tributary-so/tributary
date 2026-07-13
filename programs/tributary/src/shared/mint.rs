//! Token-2022 mint compatibility checks.
//!
//! Single source of truth for which Token-2022 extensions Tributary will
//! accept. Extracted from `utils.rs` (audit finding M1) — every call site
//! now imports [`validate_mint_compatible`] from here rather than from
//! `crate::utils`.

use crate::error::TributaryError;
use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::{
    extension::{
        confidential_transfer::ConfidentialTransferMint, mint_close_authority::MintCloseAuthority,
        non_transferable::NonTransferable, permanent_delegate::PermanentDelegate,
        transfer_fee::TransferFeeConfig, transfer_hook::TransferHook, BaseStateWithExtensions,
        StateWithExtensions,
    },
    state::Mint as Token2022Mint,
};

/// Validate that a Token-2022 mint is compatible with Tributary.
///
/// Rejects mints carrying any of the following extensions, which would break
/// or interfere with delegated pull-payments:
///   - ConfidentialTransferMint (amounts hidden from program logic)
///   - NonTransferable          (transfers forbidden by design)
///   - PermanentDelegate        (mint authority can seize/reassign at will)
///   - TransferHook             (arbitrary transfer-time CPI)
///   - TransferFeeConfig        (fees distort expected amounts)
///   - MintCloseAuthority       (mint can be closed, breaking continuity)
///
/// Legacy SPL Token mints are always allowed (no extensions possible).
pub fn validate_mint_compatible(mint_info: &AccountInfo) -> Result<()> {
    if *mint_info.owner != anchor_spl::token_2022::ID {
        return Ok(());
    }

    let data = mint_info
        .try_borrow_data()
        .map_err(|_| TributaryError::InvalidTokenAccount)?;

    if let Ok(state) = StateWithExtensions::<Token2022Mint>::unpack(&data) {
        if state.get_extension::<TransferHook>().is_ok() {
            return Err(TributaryError::UnsupportedTokenExtension.into());
        }
        if state.get_extension::<ConfidentialTransferMint>().is_ok() {
            return Err(TributaryError::UnsupportedTokenExtension.into());
        }
        if state.get_extension::<NonTransferable>().is_ok() {
            return Err(TributaryError::UnsupportedTokenExtension.into());
        }
        if state.get_extension::<PermanentDelegate>().is_ok() {
            return Err(TributaryError::UnsupportedTokenExtension.into());
        }
        if state.get_extension::<TransferFeeConfig>().is_ok() {
            return Err(TributaryError::UnsupportedTokenExtension.into());
        }
        if state.get_extension::<MintCloseAuthority>().is_ok() {
            return Err(TributaryError::UnsupportedTokenExtension.into());
        }
    }

    Ok(())
}

// ──────────────────────────────────────────────────────────────────
// C-03: validate_mint_compatible — Token-2022 extension allowlist
// ──────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::account_info::AccountInfo;
    use anchor_spl::token_2022::spl_token_2022::extension::Extension;

    /// Base Token-2022 mint data (82 bytes), marked initialized. No
    /// extensions — this is what a clean mint looks like on-chain.
    fn base_mint_data() -> Vec<u8> {
        let mut data = vec![0u8; 82];
        // spl_token::state::Mint offset layout:
        //   0..36  mint_authority (COption<Pubkey>)
        //   36..44 supply (u64)
        //   44     decimals (u8)
        //   45     is_initialized (bool)
        //   46..82 freeze_authority (COption<Pubkey>)
        data[45] = 1; // is_initialized = true
        data
    }

    /// Pack a mint account that carries one TLV extension record.
    /// Layout: [82 base mint][83 zero padding][AccountType=Mint=1][tlv...].
    fn mint_with_extension<V: Extension>() -> Vec<u8> {
        let mut data = base_mint_data();
        data.extend_from_slice(&[0u8; 83]); // padding to Account::LEN (165)
        data.push(1); // AccountType::Mint
                      // TLV record: [2-byte type LE][2-byte length LE][value bytes]
        let type_bytes: [u8; 2] = V::TYPE.into();
        data.extend_from_slice(&type_bytes);
        let len = core::mem::size_of::<V>() as u16;
        data.extend_from_slice(&len.to_le_bytes());
        data.extend(std::iter::repeat_n(0u8, len as usize));
        data
    }

    /// Run the validator against `data` owned by `owner`.
    fn run_validate(data: &mut [u8], owner: Pubkey) -> Result<()> {
        let key = Pubkey::new_unique();
        let mut lamports = 0u64;
        let info = AccountInfo::new(&key, false, false, &mut lamports, data, &owner, false, 0);
        validate_mint_compatible(&info)
    }

    #[test]
    fn allows_legacy_spl_token_mint() {
        // Legacy SPL Token program owner → early-return Ok regardless of data.
        let mut data = base_mint_data();
        assert!(run_validate(&mut data, anchor_spl::token::ID).is_ok());
    }

    #[test]
    fn allows_clean_token_2022_mint_no_extensions() {
        // 82-byte mint owned by Token-2022 with no extensions unpacks and passes.
        let mut data = base_mint_data();
        assert!(run_validate(&mut data, anchor_spl::token_2022::ID).is_ok());
    }

    #[test]
    fn rejects_permanent_delegate() {
        let mut data = mint_with_extension::<PermanentDelegate>();
        let err = run_validate(&mut data, anchor_spl::token_2022::ID);
        assert!(
            err.is_err(),
            "PermanentDelegate mint must be rejected (vault-drain vector)"
        );
    }

    #[test]
    fn rejects_transfer_hook() {
        let mut data = mint_with_extension::<TransferHook>();
        assert!(run_validate(&mut data, anchor_spl::token_2022::ID).is_err());
    }

    #[test]
    fn rejects_confidential_transfer_mint() {
        let mut data = mint_with_extension::<ConfidentialTransferMint>();
        assert!(run_validate(&mut data, anchor_spl::token_2022::ID).is_err());
    }

    #[test]
    fn rejects_transfer_fee_config() {
        let mut data = mint_with_extension::<TransferFeeConfig>();
        assert!(run_validate(&mut data, anchor_spl::token_2022::ID).is_err());
    }

    #[test]
    fn rejects_non_transferable() {
        let mut data = mint_with_extension::<NonTransferable>();
        assert!(run_validate(&mut data, anchor_spl::token_2022::ID).is_err());
    }

    #[test]
    fn rejects_mint_close_authority() {
        let mut data = mint_with_extension::<MintCloseAuthority>();
        assert!(run_validate(&mut data, anchor_spl::token_2022::ID).is_err());
    }
}
