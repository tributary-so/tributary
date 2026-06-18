use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::error::TributaryError;

/// Sentinel discriminator Anchor writes when closing an account.
/// Defined here so manual closes match Anchor's `close` constraint byte-for-byte.
pub const CLOSE_DISCRIMINATOR: [u8; 8] = [u8::MAX; 8];

/// Close an account the same way Anchor's `close = <dest>` constraint does.
///
/// Performs, in order:
/// 1. Validates `destination` is owned by the System Program and is writable
///    (defence-in-depth against rent being parked in a program-owned account).
/// 2. Zeroes the full data buffer of `info`.
/// 3. Writes `CLOSE_DISCRIMINATOR` to the first 8 bytes so any cached reads
///    observe an unambiguously closed account.
/// 4. Moves all lamports from `info` to `destination`. The runtime GCs `info`
///    once its lamport balance hits zero, reassigning ownership to the System
///    Program implicitly.
///
/// Use this whenever the rent destination is selected at runtime (e.g. from a
/// stored `rent_payer` field) — Anchor's `close = <account>` constraint only
/// accepts a static named account and cannot express that.
///
/// Two independent lifetimes are used so callers can close an account sourced
/// from `ctx.remaining_accounts` against a destination derived from a named
/// struct field without fighting invariance.
pub fn close_account<'info, 'dest>(
    info: &AccountInfo<'info>,
    destination: &AccountInfo<'dest>,
) -> Result<()> {
    require_keys_neq!(*info.key, *destination.key);

    require!(
        destination.owner == &system_program::ID,
        TributaryError::InvalidRentPayer
    );
    require!(destination.is_writable, TributaryError::InvalidRentPayer);

    {
        let mut data = info.try_borrow_mut_data()?;
        data.fill(0);
        data[..CLOSE_DISCRIMINATOR.len()].copy_from_slice(&CLOSE_DISCRIMINATOR);
    }

    **destination.try_borrow_mut_lamports()? = destination
        .lamports()
        .checked_add(info.lamports())
        .ok_or(TributaryError::ArithmeticOverflow)?;
    **info.try_borrow_mut_lamports()? = 0;

    Ok(())
}
