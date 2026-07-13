//! Token mint compatibility check.
//!
//! Only legacy SPL Token mints are supported. Token-2022 mints — even
//! clean ones carrying no extensions — are rejected because every
//! execution instruction's `token_program` field is typed
//! `Program<'info, Token>` (legacy only). A Token-2022 mint would pass
//! creation but fail every CPI `transfer_checked` with `AccountNotOwned`,
//! silently locking the user out of execution after rent is paid (CF-009).
//!
//! When Token-2022 execution support lands (switch `token_program` to
//! `Interface<'info, TokenInterface>` across all execution paths), restore
//! the extension blocklist that lived here before this change — see git
//! history at commit `4506a59` and ADR-0012 for the six blocked extensions
//! (TransferHook, ConfidentialTransferMint, NonTransferable,
//! PermanentDelegate, TransferFeeConfig, MintCloseAuthority).

use crate::error::TributaryError;
use anchor_lang::prelude::*;

/// Validate that a mint is compatible with Tributary.
///
/// Accepts legacy SPL Token mints (owner == `spl_token::ID`). Rejects all
/// Token-2022 mints regardless of extensions — see module docs and ADR-0012.
pub fn validate_mint_compatible(mint_info: &AccountInfo) -> Result<()> {
    if *mint_info.owner == anchor_spl::token_2022::ID {
        return Err(TributaryError::UnsupportedTokenExtension.into());
    }
    Ok(())
}

// ──────────────────────────────────────────────────────────────────
// C-03 / CF-009: validate_mint_compatible — legacy SPL Token only
// ──────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::account_info::AccountInfo;

    /// Base mint data (82 bytes), marked initialized. Sufficient for the
    /// owner check; contents are not inspected.
    fn base_mint_data() -> Vec<u8> {
        let mut data = vec![0u8; 82];
        data[45] = 1; // is_initialized = true
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
        // Legacy SPL Token program owner → always accepted.
        let mut data = base_mint_data();
        assert!(run_validate(&mut data, anchor_spl::token::ID).is_ok());
    }

    #[test]
    fn rejects_clean_token_2022_mint() {
        // CF-009: a Token-2022 mint with no extensions previously passed
        // validation but failed at CPI execution because token_program is
        // legacy-only. Now rejected up-front at the owner check.
        let mut data = base_mint_data();
        assert!(
            run_validate(&mut data, anchor_spl::token_2022::ID).is_err(),
            "Token-2022 mints must be rejected even without extensions (CF-009)"
        );
    }

    #[test]
    fn rejects_token_2022_mint_with_extension() {
        // A Token-2022 mint carrying an extension is rejected by the same
        // owner check — the extension blocklist is deferred until
        // Token-2022 execution support lands (ADR-0012).
        let mut data = base_mint_data();
        data.extend_from_slice(&[0u8; 83]); // padding to Account::LEN (165)
        data.push(1); // AccountType::Mint
        data.extend_from_slice(&[0u8; 4]); // a dummy TLV record
        assert!(run_validate(&mut data, anchor_spl::token_2022::ID).is_err());
    }
}
