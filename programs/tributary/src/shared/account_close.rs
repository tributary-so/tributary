use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::error::TributaryError;

/// Close an account exactly the way Anchor's `close = <dest>` constraint does.
///
/// Anchor's `close =` constraint does two things: (1) it validates the destination
/// at the framework level, then (2) runs the close routine from
/// `anchor_lang::common::close`. Because we select the destination at runtime (from
/// a stored `rent_payer` field), we cannot use the static `close = <account>`
/// attribute, so we replicate *both* halves here.
///
/// The close routine matches Anchor 0.31 byte-for-behaviour:
/// 1. Drain all lamports from `info` into `destination` (checked add).
/// 2. Zero `info`'s lamport balance.
/// 3. Reassign `info` ownership to the System Program via `assign`.
/// 4. Shrink `info` data to 0 bytes via `realloc(0, false)`.
///
/// Two independent lifetimes so an account sourced from `ctx.remaining_accounts`
/// can be closed against a destination derived from a named struct field without
/// lifetime fights.
pub fn close_account<'info, 'dest>(
    info: &AccountInfo<'info>,
    destination: &AccountInfo<'dest>,
) -> Result<()> {
    // --- framework-level safety that Anchor's `close =` would otherwise enforce ---
    require_keys_neq!(*info.key, *destination.key);
    require!(
        destination.owner == &system_program::ID,
        TributaryError::InvalidRentPayer
    );
    require!(destination.is_writable, TributaryError::InvalidRentPayer);

    // --- Anchor's close routine (anchor_lang::common::close) ---
    let dest_starting_lamports = destination.lamports();
    let src_lamports = info.lamports();
    **destination.try_borrow_mut_lamports()? = dest_starting_lamports
        .checked_add(src_lamports)
        .ok_or(TributaryError::ArithmeticOverflow)?;
    **info.try_borrow_mut_lamports()? = 0;

    info.assign(&system_program::ID);
    info.realloc(0, false)?;

    Ok(())
}

/// Resolve where closed-account lamports should be refunded.
///
/// If `stored_rent_payer` is `Pubkey::default()`, refunds go to `owner`
/// (the historical default). Otherwise `rent_payer` must be present and
/// its key must match `stored_rent_payer` exactly.
///
/// Returns a cloned `AccountInfo` so callers can pass it to `close_account`
/// without borrowing against their own `ctx.accounts` fields.
pub fn resolve_rent_destination<'info>(
    stored_rent_payer: Pubkey,
    owner: &AccountInfo<'info>,
    rent_payer: &AccountInfo<'info>,
) -> Result<AccountInfo<'info>> {
    if stored_rent_payer == Pubkey::default() {
        Ok(owner.clone())
    } else {
        require_keys_eq!(
            rent_payer.key(),
            stored_rent_payer,
            crate::error::TributaryError::InvalidRentPayer
        );
        Ok(rent_payer.clone())
    }
}
