use crate::{error::TributaryError, state::*, PaymentFrequency};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount as LegacyTokenAccount;
use anchor_spl::token_2022::spl_token_2022::{
    extension::{
        confidential_transfer::ConfidentialTransferMint, mint_close_authority::MintCloseAuthority,
        non_transferable::NonTransferable, permanent_delegate::PermanentDelegate,
        transfer_fee::TransferFeeConfig, transfer_hook::TransferHook, BaseStateWithExtensions,
        StateWithExtensions,
    },
    state::Mint as Token2022Mint,
};
use anchor_spl::token_interface::{self, TransferChecked};

/// Maximum depth of the referral reward chain (L1, L2, L3).
pub const MAX_REFERRAL_CHAIN_DEPTH: usize = 3;

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

const MAX_MONTHLY_ITERATIONS: u32 = 1200;

/// Calculate the next payment due date based on payment frequency.
/// Fixed-interval frequencies (Daily, Weekly, Custom) use O(1) arithmetic.
/// Variable-interval frequencies (Monthly, Quarterly, etc.) use a bounded loop.
pub fn calculate_next_payment_due(
    current_due: i64,
    frequency: &PaymentFrequency,
    current_timestamp: i64,
) -> Result<i64> {
    if current_due > current_timestamp {
        return Ok(current_due);
    }

    match frequency {
        PaymentFrequency::Daily => skip_fixed_interval(current_due, current_timestamp, 86400),
        PaymentFrequency::Weekly => skip_fixed_interval(current_due, current_timestamp, 604800),
        PaymentFrequency::Monthly => skip_months(current_due, current_timestamp, 1),
        PaymentFrequency::Quarterly => skip_months(current_due, current_timestamp, 3),
        PaymentFrequency::SemiAnnually => skip_months(current_due, current_timestamp, 6),
        PaymentFrequency::Annually => skip_months(current_due, current_timestamp, 12),
        PaymentFrequency::Custom(interval_seconds) => {
            require!(*interval_seconds > 0, TributaryError::InvalidFrequency);
            require!(
                *interval_seconds <= i64::MAX as u64,
                TributaryError::InvalidFrequency
            );
            skip_fixed_interval(current_due, current_timestamp, *interval_seconds as i64)
        }
    }
}

fn skip_fixed_interval(current_due: i64, current_timestamp: i64, interval: i64) -> Result<i64> {
    let elapsed = current_timestamp.saturating_sub(current_due);
    let intervals_to_skip = (elapsed / interval)
        .checked_add(1)
        .ok_or(TributaryError::ArithmeticOverflow)?;
    current_due
        .checked_add(
            intervals_to_skip
                .checked_mul(interval)
                .ok_or(TributaryError::ArithmeticOverflow)?,
        )
        .ok_or(TributaryError::ArithmeticOverflow.into())
}

fn skip_months(current_due: i64, current_timestamp: i64, months: i32) -> Result<i64> {
    let mut next_due = current_due;
    let mut iterations = 0u32;
    while next_due <= current_timestamp {
        require!(
            iterations < MAX_MONTHLY_ITERATIONS,
            TributaryError::ArithmeticOverflow
        );
        next_due = add_months(next_due, months)?;
        iterations = iterations.saturating_add(1);
    }
    Ok(next_due)
}

/// Add months to a Unix timestamp, maintaining the same day of month
fn add_months(timestamp: i64, months: i32) -> Result<i64> {
    // Convert Unix timestamp to date components
    let days_since_epoch = timestamp / 86400;
    let seconds_in_day = timestamp % 86400;

    // Check for overflow in cast
    if days_since_epoch > i32::MAX as i64 || days_since_epoch < i32::MIN as i64 {
        return err!(TributaryError::ArithmeticOverflow);
    }

    // Calculate year, month, day from days since epoch (1970-01-01)
    let mut year = 1970;
    let mut remaining_days = days_since_epoch as i32;

    // Handle years
    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days >= days_in_year {
            remaining_days = remaining_days
                .checked_sub(days_in_year)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            year = year
                .checked_add(1)
                .ok_or(TributaryError::ArithmeticOverflow)?;
        } else {
            break;
        }
    }

    // Handle months
    let mut month = 1;
    loop {
        let days_in_month = get_days_in_month(year, month);
        if remaining_days >= days_in_month {
            remaining_days = remaining_days
                .checked_sub(days_in_month)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            month = month
                .checked_add(1)
                .ok_or(TributaryError::ArithmeticOverflow)?;
        } else {
            break;
        }
    }

    let day = remaining_days
        .checked_add(1)
        .ok_or(TributaryError::ArithmeticOverflow)?; // Days are 1-indexed

    // Add the requested months
    let mut new_month = month
        .checked_add(months)
        .ok_or(TributaryError::ArithmeticOverflow)?;
    let mut new_year = year;

    // Handle month overflow/underflow
    while new_month > 12 {
        new_month = new_month
            .checked_sub(12)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        new_year = new_year
            .checked_add(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }
    while new_month < 1 {
        new_month = new_month
            .checked_add(12)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        new_year = new_year
            .checked_sub(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }

    // Handle day overflow (e.g., Jan 31 + 1 month = Feb 28/29)
    let max_day_in_new_month = get_days_in_month(new_year, new_month);
    let new_day = if day > max_day_in_new_month {
        max_day_in_new_month
    } else {
        day
    };

    // Convert back to Unix timestamp
    let mut new_days_since_epoch: i64 = 0;

    // Add days for complete years
    for y in 1970..new_year {
        let days = if is_leap_year(y) { 366i64 } else { 365i64 };
        new_days_since_epoch = new_days_since_epoch
            .checked_add(days)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }

    // Add days for complete months in the target year
    for m in 1..new_month {
        let days = get_days_in_month(new_year, m) as i64;
        new_days_since_epoch = new_days_since_epoch
            .checked_add(days)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }

    // Add remaining days
    new_days_since_epoch = new_days_since_epoch
        .checked_add((new_day - 1) as i64)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    // Convert to timestamp
    let new_timestamp = new_days_since_epoch
        .checked_mul(86400)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_add(seconds_in_day)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    Ok(new_timestamp)
}

/// Check if a year is a leap year
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

/// Get the number of days in a given month and year
fn get_days_in_month(year: i32, month: i32) -> i32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

pub enum AuthorityMode<'a> {
    Direct,
    PdaSigner(&'a [&'a [&'a [u8]]]),
}

pub struct ReferralContext<'a, 'info> {
    pub remaining_accounts: &'info [AccountInfo<'info>],
    pub source_token_account: AccountInfo<'info>,
    pub authority_info: AccountInfo<'info>,
    pub authority_mode: AuthorityMode<'a>,
    pub token_program: AccountInfo<'info>,
    pub mint_info: AccountInfo<'info>,
    pub mint_decimals: u8,
    pub expected_mint: Pubkey,
    pub gateway_key: Pubkey,
    pub payment_policy_key: Pubkey,
    pub payment_amount: u64,
    pub timestamp: i64,
    /// Wallet of the paying user. Used to bind the supplied referral chain
    /// to the actual payer via their own `ReferralAccount`.
    pub payer_wallet: Pubkey,
}

/// Validation of a referral chain's topology.
///
/// Given the payer's own `referrer` field (i.e. the L1 ReferralAccount PDA
/// stored on the paying user's `ReferralAccount`) and a slice of
/// `(account_key, referrer_field)` tuples representing the supplied chain
/// `[L1, L2, L3]`, verify that:
///
/// 1. The chain is non-empty and does not exceed `MAX_REFERRAL_CHAIN_DEPTH`.
/// 2. `chain[0].key == payer_referrer` — binds the chain to the payer.
/// 3. `chain[i].referrer == chain[i+1].key` for all adjacent pairs — the
///    supplied accounts form a real ancestor chain, not arbitrary accounts.
/// 4. If the chain is shorter than `MAX_REFERRAL_CHAIN_DEPTH`, the final
///    element's `referrer` MUST be `Pubkey::default()` (no deeper level
///    exists on-chain). When the chain is at max depth the tail is allowed
///    to point anywhere — rewards are capped at depth 3 regardless.
///
/// Duplicate detection across `chain` keys is the caller's responsibility
/// (it holds a small `Vec<Pubkey>` seen-set covering payer + chain — the
/// chain is bounded by `MAX_REFERRAL_CHAIN_DEPTH`, so O(n²) is cheaper than
/// a `BTreeSet` and avoids the BPF stack overflow from `core::slice::sort`).
fn validate_referral_chain_topology(
    payer_referrer: Pubkey,
    chain: &[(Pubkey, Pubkey)],
) -> Result<()> {
    require!(
        !chain.is_empty(),
        TributaryError::InvalidReferralChainOrdering
    );
    require!(
        chain.len() <= MAX_REFERRAL_CHAIN_DEPTH,
        TributaryError::MaxReferralDepthExceeded
    );

    // Bind chain origin to the payer.
    require!(
        chain[0].0 == payer_referrer,
        TributaryError::InvalidReferralChainOrdering
    );

    // Walk the chain: each element's referrer must equal the next element's key.
    for window in chain.windows(2) {
        let (cur_key, cur_referrer) = window[0];
        let (next_key, _) = window[1];
        require!(
            cur_referrer == next_key,
            TributaryError::InvalidReferralChainOrdering
        );
        // Defensive: cur_referrer cannot point at itself.
        require!(
            cur_referrer != cur_key,
            TributaryError::CircularReferralChain
        );
    }

    // If chain is shorter than max depth, the tail must terminate at default
    // (no deeper ancestor exists on-chain).
    if chain.len() < MAX_REFERRAL_CHAIN_DEPTH {
        let (tail_key, tail_referrer) = *chain.last().unwrap();
        require!(
            tail_referrer == Pubkey::default(),
            TributaryError::InvalidReferralChainOrdering
        );
        // Defensive: tail must not self-reference.
        require!(
            tail_key != Pubkey::default(),
            TributaryError::CircularReferralChain
        );
    }

    Ok(())
}

#[inline(never)]
pub fn process_referral_rewards<'a, 'info>(
    ctx: ReferralContext<'a, 'info>,
    gateway_fee: u64,
    referral_allocation_bps: u16,
    referral_tiers_bps: &[u16; 3],
) -> Result<u64> {
    let referral_pool = gateway_fee
        .checked_mul(referral_allocation_bps as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    if referral_pool == 0 {
        return Ok(referral_pool);
    }

    // Empty remaining_accounts → caller opted out of referral rewards.
    if ctx.remaining_accounts.is_empty() {
        return Ok(0);
    }

    let (payer_loader, chain_loaders, token_accounts) = parse_and_validate_referral_accounts(
        ctx.remaining_accounts,
        ctx.expected_mint,
        ctx.gateway_key,
        ctx.payer_wallet,
    )?;

    // If the payer has no referrer, there is nothing to pay.
    if chain_loaders.is_empty() {
        return Ok(0);
    }

    let tier_rewards: [u64; MAX_REFERRAL_CHAIN_DEPTH] = [
        referral_pool
            .checked_mul(referral_tiers_bps[0] as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?,
        referral_pool
            .checked_mul(referral_tiers_bps[1] as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?,
        referral_pool
            .checked_mul(referral_tiers_bps[2] as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?,
    ];

    // Build the event payload: tier index = chain depth (L1=direct referrer).
    let mut rewards: [Option<ReferralReward>; MAX_REFERRAL_CHAIN_DEPTH] = [None, None, None];
    for (idx, loader) in chain_loaders.iter().enumerate() {
        rewards[idx] = Some(ReferralReward {
            pubkey: loader.key(),
            reward: tier_rewards[idx],
        });
    }

    emit!(ReferralRewardDistributedRecord {
        payment_policy: ctx.payment_policy_key,
        gateway: ctx.gateway_key,
        payment_amount: ctx.payment_amount,
        timestamp: ctx.timestamp,
        rewards,
    });

    for (idx, loader) in chain_loaders.iter().enumerate() {
        transfer_referral_reward(&ctx, &token_accounts, loader, tier_rewards[idx])?;
    }

    msg!(
        "Referral pool: {} distributed across {} levels",
        referral_pool,
        chain_loaders.len()
    );

    // Suppress unused-binding warning for `payer_loader` — its data is consumed
    // inside `parse_and_validate_referral_accounts` to anchor the chain, but
    // we hold the loader here so the underlying account stays loaded for the
    // duration of this call.
    drop(payer_loader);

    Ok(referral_pool)
}

/// Parse and fully validate the `remaining_accounts` slice for a referral
/// reward distribution.
///
/// Expected layout (only when referral rewards should be distributed):
///
/// ```text
/// remaining_accounts = [
///   payer_referral_info,       // ReferralAccount of paying user
///   R1_info, R2_info, R3_info, // 1..=3 ancestor ReferralAccounts (writable)
///   ATA_R1, ATA_R2, ATA_R3,    // matching token accounts (writable)
/// ]
/// ```
///
/// The number of ancestors `K` must match the number of ATAs and may be 0..=3.
/// When `K == 0` only the payer_referral is supplied (or remaining_accounts is
/// empty), and no rewards are distributed.
///
/// Returns the payer loader, the chain loaders ordered `[L1, L2, L3]`, and
/// the matching token accounts in chain order.
#[inline(never)]
pub fn parse_and_validate_referral_accounts<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    expected_mint: Pubkey,
    gateway_key: Pubkey,
    payer_wallet: Pubkey,
) -> Result<(
    Option<AccountLoader<'info, ReferralAccount>>,
    Vec<AccountLoader<'info, ReferralAccount>>,
    Vec<(Pubkey, AccountInfo<'info>)>,
)> {
    if remaining_accounts.is_empty() {
        return Ok((None, Vec::new(), Vec::new()));
    }

    // ── Position 0: payer's own ReferralAccount ───────────────────────
    let payer_info = &remaining_accounts[0];
    let payer_loader = load_referral_account(payer_info, gateway_key)?;

    // Extract scalar fields we need before the borrow on `payer_loader` is
    // released — we move `payer_loader` into the return value below.
    let (payer_owner, payer_referrer, payer_key) = {
        let data = payer_loader.load()?;
        (data.owner, data.referrer, payer_loader.key())
    };
    require!(
        payer_owner == payer_wallet,
        TributaryError::PayerReferralMismatch
    );

    // Payer has no referrer → no chain to pay. Still require that the caller
    // did not sneak in extra accounts that would otherwise go unvalidated.
    if payer_referrer == Pubkey::default() {
        require!(
            remaining_accounts.len() == 1,
            TributaryError::InvalidReferralChainOrdering
        );
        return Ok((Some(payer_loader), Vec::new(), Vec::new()));
    }

    // ── Determine K = number of ancestor referral accounts ────────────
    let remaining_after_payer = remaining_accounts.len().saturating_sub(1);
    require!(
        remaining_after_payer % 2 == 0,
        TributaryError::MismatchAtaReferralAccountNumbers
    );
    let chain_len = remaining_after_payer / 2;
    require!(
        chain_len >= 1 && chain_len <= MAX_REFERRAL_CHAIN_DEPTH,
        TributaryError::MaxReferralDepthExceeded
    );

    // ── Load chain referral accounts (positions 1..=chain_len) ────────
    let mut chain_loaders: Vec<AccountLoader<'info, ReferralAccount>> =
        Vec::with_capacity(chain_len);
    let mut chain_owners: Vec<Pubkey> = Vec::with_capacity(chain_len);
    // Track all seen keys (payer + chain) for duplicate detection.
    // Chain depth is bounded by MAX_REFERRAL_CHAIN_DEPTH (3), so a small
    // fixed-size buffer beats a heap BTreeSet and avoids BPF stack overflow
    // from core::slice::sort::driftsort_main.
    let mut seen_keys: Vec<Pubkey> = Vec::with_capacity(MAX_REFERRAL_CHAIN_DEPTH + 1);
    seen_keys.push(payer_key);

    let mut topology: Vec<(Pubkey, Pubkey)> = Vec::with_capacity(chain_len);

    for i in 1..=chain_len {
        let info = &remaining_accounts[i];
        if info.data_len() != ReferralAccount::SIZE {
            return Err(TributaryError::ReferralAccountSizeMismatch.into());
        }
        if !info.is_writable {
            return Err(TributaryError::ReferrerMustBeWritable.into());
        }
        let loader = load_referral_account(info, gateway_key)?;
        // Extract scalar fields before pushing the loader (avoids holding
        // a Ref borrow across the push).
        let (key, referrer, owner) = {
            let data = loader.load()?;
            (loader.key(), data.referrer, data.owner)
        };
        if seen_keys.iter().any(|k| *k == key) {
            return Err(TributaryError::DuplicateReferralAccount.into());
        }
        seen_keys.push(key);

        topology.push((key, referrer));
        chain_owners.push(owner);
        chain_loaders.push(loader);
    }

    // ── Validate the chain topology (binds to payer) ──────────────────
    validate_referral_chain_topology(payer_referrer, &topology)?;

    // ── Load matching token accounts (positions chain_len+1..) ────────
    let mut token_accounts: Vec<(Pubkey, AccountInfo<'info>)> = Vec::with_capacity(chain_len);
    let token_start = chain_len.saturating_add(1);
    for (idx, expected_owner) in chain_owners.iter().enumerate() {
        let ata_info = &remaining_accounts[token_start + idx];
        let token_acc = Account::<LegacyTokenAccount>::try_from(ata_info.as_ref())
            .map_err(|_| TributaryError::ReferrerATAInvalid)?;

        require!(
            token_acc.mint == expected_mint,
            TributaryError::ReferrerATAMintInvalid
        );
        require!(
            token_acc.owner == *expected_owner,
            TributaryError::MissingReferralAta
        );

        token_accounts.push((*expected_owner, ata_info.clone()));
    }

    Ok((Some(payer_loader), chain_loaders, token_accounts))
}

/// Load a `ReferralAccount` from an `AccountInfo`, enforcing size, ownership,
/// discriminator, and gateway scoping. Centralizes the checks that previously
/// were inlined in `parse_remaining_accounts` so both payer and chain loaders
/// share the same rigour.
#[inline(never)]
fn load_referral_account<'info>(
    info: &'info AccountInfo<'info>,
    gateway_key: Pubkey,
) -> Result<AccountLoader<'info, ReferralAccount>> {
    if info.data_len() != ReferralAccount::SIZE {
        return Err(TributaryError::ReferralAccountSizeMismatch.into());
    }
    let loader = AccountLoader::<ReferralAccount>::try_from(info)
        .map_err(|_| TributaryError::InvalidReferralAccountDiscriminator)?;
    // Scope the borrow so we can return `loader` by value.
    {
        let data = loader
            .load()
            .map_err(|_| TributaryError::CouldNotDeserializeReferrer)?;
        require!(
            data.gateway == gateway_key,
            TributaryError::ReferrerAccountInvalid
        );
    }
    Ok(loader)
}

#[inline(never)]
fn transfer_referral_reward<'info>(
    ctx: &ReferralContext<'_, 'info>,
    token_accounts: &[(Pubkey, AccountInfo<'info>)],
    referral_loader: &AccountLoader<'info, ReferralAccount>,
    reward: u64,
) -> Result<()> {
    if reward == 0 {
        return Ok(());
    }

    let referrer_pubkey = referral_loader.load()?.owner;

    let (_, ata_info) = token_accounts
        .iter()
        .find(|(owner, _)| *owner == referrer_pubkey)
        .ok_or(TributaryError::MissingReferralAta)?;

    let cpi_accounts = TransferChecked {
        from: ctx.source_token_account.clone(),
        mint: ctx.mint_info.clone(),
        to: ata_info.clone(),
        authority: ctx.authority_info.clone(),
    };
    let cpi_ctx = match &ctx.authority_mode {
        AuthorityMode::Direct => CpiContext::new(ctx.token_program.clone(), cpi_accounts),
        AuthorityMode::PdaSigner(seeds) => {
            CpiContext::new_with_signer(ctx.token_program.clone(), cpi_accounts, *seeds)
        }
    };
    token_interface::transfer_checked(cpi_ctx, reward, ctx.mint_decimals)?;

    let mut referral_account = referral_loader.load_mut()?;
    referral_account.total_earned = referral_account
        .total_earned
        .checked_add(reward)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{DateTime, Datelike, TimeZone, Timelike, Utc};

    /// Convert Unix timestamp to chrono DateTime for testing
    fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_timestamp(timestamp, 0).expect("Invalid timestamp")
    }

    /// Create a timestamp for a specific date/time (UTC)
    fn create_timestamp(year: i32, month: u32, day: u32, hour: u32, min: u32, sec: u32) -> i64 {
        let dt = Utc
            .with_ymd_and_hms(year, month, day, hour, min, sec)
            .single()
            .expect("Invalid date/time");
        dt.timestamp()
    }

    #[test]
    fn test_calculate_next_payment_due_monthly_edge_cases() {
        // Test January 30th -> February (should handle month boundary correctly)
        let jan_30_2024 = create_timestamp(2024, 1, 30, 12, 0, 0);
        let feb_29_2024 = create_timestamp(2024, 2, 29, 12, 0, 0); // 2024 is leap year

        let next_due =
            calculate_next_payment_due(jan_30_2024, &PaymentFrequency::Monthly, feb_29_2024)
                .unwrap();

        // NOTE: A consequence of this is that every year, the day will be capped to 28th once it
        // goes from january -> february!
        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 3);
        assert_eq!(next_dt.day(), 29);

        // Test January 31st -> February (non-leap year)
        let jan_31_2023 = create_timestamp(2023, 1, 31, 12, 0, 0);
        let mar_1_2023 = create_timestamp(2023, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(jan_31_2023, &PaymentFrequency::Monthly, mar_1_2023)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2023);
        assert_eq!(next_dt.month(), 3);
        // NOTE: we see the above mentioned capping in action here!
        assert_eq!(next_dt.day(), 28);

        // Test December 31st -> January next year
        let dec_31_2023 = create_timestamp(2023, 12, 31, 12, 0, 0);
        let jan_15_2024 = create_timestamp(2024, 1, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(dec_31_2023, &PaymentFrequency::Monthly, jan_15_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 1);
        assert_eq!(next_dt.day(), 31);

        // Test February 28th (non-leap year) -> March
        let feb_28_2023 = create_timestamp(2023, 2, 28, 12, 0, 0);
        let mar_15_2023 = create_timestamp(2023, 3, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_28_2023, &PaymentFrequency::Monthly, mar_15_2023)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2023);
        assert_eq!(next_dt.month(), 3);
        assert_eq!(next_dt.day(), 28);

        // Test February 29th (leap year) -> March
        let feb_29_2024 = create_timestamp(2024, 2, 29, 12, 0, 0);
        let mar_15_2024 = create_timestamp(2024, 3, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_29_2024, &PaymentFrequency::Monthly, mar_15_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 3);
        // Since current timestamp is Mar 15, next due should be Apr 29 (one month after Mar 29)
        assert_eq!(next_dt.day(), 29);

        // Test multiple monthly increments
        let jan_15_2024 = create_timestamp(2024, 1, 15, 12, 0, 0);
        let jun_15_2024 = create_timestamp(2024, 6, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(jan_15_2024, &PaymentFrequency::Monthly, jun_15_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 7);
        // Since current timestamp is Jun 15, next due should be Jul 15 (one month after Jun 15)
        assert_eq!(next_dt.day(), 15);
    }

    #[test]
    fn test_calculate_next_payment_due_annual_edge_cases() {
        // Test leap year (2024) -> non-leap year (2025)
        let feb_29_2024 = create_timestamp(2024, 2, 29, 12, 0, 0);
        let mar_1_2025 = create_timestamp(2025, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_29_2024, &PaymentFrequency::Annually, mar_1_2025)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2026);
        assert_eq!(next_dt.month(), 2);
        // Since current timestamp is Mar 1, 2025, next due should be Feb 28, 2026 (one year after Feb 28, 2025)
        assert_eq!(next_dt.day(), 28);

        // Test non-leap year -> leap year
        let feb_28_2023 = create_timestamp(2023, 2, 28, 12, 0, 0);
        let mar_1_2024 = create_timestamp(2024, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_28_2023, &PaymentFrequency::Annually, mar_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2025);
        assert_eq!(next_dt.month(), 2);
        // Since current timestamp is Mar 1, 2024, next due should be Feb 28, 2025 (one year after Feb 28, 2024)
        assert_eq!(next_dt.day(), 28);

        // Test December 31st -> December 31st next year
        let dec_31_2023 = create_timestamp(2023, 12, 31, 12, 0, 0);
        let jan_15_2025 = create_timestamp(2025, 1, 15, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(dec_31_2023, &PaymentFrequency::Annually, jan_15_2025)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2025);
        assert_eq!(next_dt.month(), 12);
        // Since current timestamp is Jan 15, 2025, next due should be Dec 31, 2025 (one year after Dec 31, 2024)
        assert_eq!(next_dt.day(), 31);

        // Test February 29th across multiple leap years
        let feb_29_2020 = create_timestamp(2020, 2, 29, 12, 0, 0);
        let mar_1_2024 = create_timestamp(2024, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(feb_29_2020, &PaymentFrequency::Annually, mar_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2025);
        assert_eq!(next_dt.month(), 2);
        // Since current timestamp is Mar 1, 2024, next due should be Feb 28, 2025 (one year after Feb 29, 2024)
        assert_eq!(next_dt.day(), 28);

        // Test March 1st (day after leap day) -> March 1st
        let mar_1_2020 = create_timestamp(2020, 3, 1, 12, 0, 0);
        let apr_1_2024 = create_timestamp(2024, 4, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(mar_1_2020, &PaymentFrequency::Annually, apr_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2025);
        assert_eq!(next_dt.month(), 3);
        // Since current timestamp is Apr 1, 2024, next due should be Mar 1, 2025 (one year after Mar 1, 2024)
        assert_eq!(next_dt.day(), 1);

        // Test multiple year increments
        let jan_1_2020 = create_timestamp(2020, 1, 1, 12, 0, 0);
        let jan_1_2025 = create_timestamp(2025, 1, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(jan_1_2020, &PaymentFrequency::Annually, jan_1_2025)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2026);
        assert_eq!(next_dt.month(), 1);
        // Since current timestamp is Jan 1, 2025, next due should be Jan 1, 2026 (one year after Jan 1, 2025)
        assert_eq!(next_dt.day(), 1);
    }

    #[test]
    fn test_calculate_next_payment_due_quarterly_edge_cases() {
        // Test quarterly with month boundaries
        let jan_31_2024 = create_timestamp(2024, 1, 31, 12, 0, 0);
        let may_1_2024 = create_timestamp(2024, 5, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(jan_31_2024, &PaymentFrequency::Quarterly, may_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 7);
        // Jan 31 + 3 months = Apr 30, but since Apr 30 <= current timestamp (May 1),
        // we add another 3 months: Apr 30 + 3 months = Jul 30
        assert_eq!(next_dt.day(), 30);

        // Test quarterly across leap year
        let nov_30_2023 = create_timestamp(2023, 11, 30, 12, 0, 0);
        let mar_1_2024 = create_timestamp(2024, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(nov_30_2023, &PaymentFrequency::Quarterly, mar_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 5);
        assert_eq!(next_dt.day(), 29);
    }

    #[test]
    fn test_calculate_next_payment_due_semi_annually_edge_cases() {
        // Test semi-annually with month boundaries
        let aug_31_2023 = create_timestamp(2023, 8, 31, 12, 0, 0);
        let mar_1_2024 = create_timestamp(2024, 3, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(aug_31_2023, &PaymentFrequency::SemiAnnually, mar_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 8);
        // Aug 31 + 6 months = Feb 29 (leap year), but since Feb 29 <= current timestamp (Mar 1),
        // we add another 6 months: Feb 29 + 6 months = Aug 29
        assert_eq!(next_dt.day(), 29);

        // Test semi-annually across year boundary
        let dec_31_2023 = create_timestamp(2023, 12, 31, 12, 0, 0);
        let jul_1_2024 = create_timestamp(2024, 7, 1, 12, 0, 0);

        let next_due =
            calculate_next_payment_due(dec_31_2023, &PaymentFrequency::SemiAnnually, jul_1_2024)
                .unwrap();

        let next_dt = timestamp_to_datetime(next_due);
        assert_eq!(next_dt.year(), 2024);
        assert_eq!(next_dt.month(), 12);
        // Since current timestamp is Jul 1, next due should be Dec 31 (6 months after Jun 30)
        assert_eq!(next_dt.day(), 30);
    }

    #[test]
    fn test_calculate_next_payment_due_time_preservation() {
        // Test that time of day is preserved across all frequencies
        let original_time = create_timestamp(2024, 1, 15, 14, 30, 45); // 14:30:45

        // Test Monthly
        let monthly_due = calculate_next_payment_due(
            original_time,
            &PaymentFrequency::Monthly,
            create_timestamp(2024, 2, 15, 15, 0, 0),
        )
        .unwrap();

        let monthly_dt = timestamp_to_datetime(monthly_due);
        assert_eq!(monthly_dt.hour(), 14);
        assert_eq!(monthly_dt.minute(), 30);
        assert_eq!(monthly_dt.second(), 45);

        // Test Annually
        let annual_due = calculate_next_payment_due(
            original_time,
            &PaymentFrequency::Annually,
            create_timestamp(2025, 1, 15, 15, 0, 0),
        )
        .unwrap();

        let annual_dt = timestamp_to_datetime(annual_due);
        assert_eq!(annual_dt.hour(), 14);
        assert_eq!(annual_dt.minute(), 30);
        assert_eq!(annual_dt.second(), 45);

        // Test Quarterly
        let quarterly_due = calculate_next_payment_due(
            original_time,
            &PaymentFrequency::Quarterly,
            create_timestamp(2024, 4, 15, 15, 0, 0),
        )
        .unwrap();

        let quarterly_dt = timestamp_to_datetime(quarterly_due);
        assert_eq!(quarterly_dt.hour(), 14);
        assert_eq!(quarterly_dt.minute(), 30);
        assert_eq!(quarterly_dt.second(), 45);
    }

    #[test]
    fn test_calculate_next_payment_due_multiple_iterations() {
        // Test that the while loop correctly handles multiple iterations
        let start_time = create_timestamp(2024, 1, 15, 12, 0, 0);
        let far_future = create_timestamp(2024, 12, 15, 12, 0, 0);

        // Monthly should handle multiple iterations
        let monthly_due =
            calculate_next_payment_due(start_time, &PaymentFrequency::Monthly, far_future).unwrap();

        let monthly_dt = timestamp_to_datetime(monthly_due);
        assert_eq!(monthly_dt.year(), 2025);
        assert_eq!(monthly_dt.month(), 1);
        // Since current timestamp is Dec 15, next due should be Jan 15, 2025 (one month after Dec 15, 2024)
        assert_eq!(monthly_dt.day(), 15);

        // Annually should handle multiple iterations
        let annual_due = calculate_next_payment_due(
            start_time,
            &PaymentFrequency::Annually,
            create_timestamp(2026, 1, 15, 12, 0, 0),
        )
        .unwrap();

        let annual_dt = timestamp_to_datetime(annual_due);
        assert_eq!(annual_dt.year(), 2027);
        assert_eq!(annual_dt.month(), 1);
        // Since current timestamp is Jan 15, 2026, next due should be Jan 15, 2027 (one year after Jan 15, 2026)
        assert_eq!(annual_dt.day(), 15);
    }

    #[test]
    fn test_add_months_edge_cases() {
        // Test adding months that cross multiple years
        let dec_2023 = create_timestamp(2023, 12, 15, 12, 0, 0);
        let result = add_months(dec_2023, 24).unwrap(); // +24 months = +2 years
        let result_dt = timestamp_to_datetime(result);
        assert_eq!(result_dt.year(), 2025);
        assert_eq!(result_dt.month(), 12);
        assert_eq!(result_dt.day(), 15);

        // Test adding negative months (should work with underflow)
        let jan_2024 = create_timestamp(2024, 1, 15, 12, 0, 0);
        let result = add_months(jan_2024, -12).unwrap(); // -12 months = -1 year
        let result_dt = timestamp_to_datetime(result);
        assert_eq!(result_dt.year(), 2023);
        assert_eq!(result_dt.month(), 1);
        assert_eq!(result_dt.day(), 15);
    }

    #[test]
    fn test_is_leap_year_comprehensive() {
        // Test known leap years
        assert!(is_leap_year(2020));
        assert!(is_leap_year(2024));
        assert!(is_leap_year(2000)); // Divisible by 400

        // Test known non-leap years
        assert!(!is_leap_year(2023));
        assert!(!is_leap_year(2025));
        assert!(!is_leap_year(1900)); // Divisible by 100 but not 400
        assert!(!is_leap_year(2100)); // Divisible by 100 but not 400
    }

    #[test]
    fn test_get_days_in_month_comprehensive() {
        // Test all months in a non-leap year
        assert_eq!(get_days_in_month(2023, 1), 31);
        assert_eq!(get_days_in_month(2023, 2), 28);
        assert_eq!(get_days_in_month(2023, 3), 31);
        assert_eq!(get_days_in_month(2023, 4), 30);
        assert_eq!(get_days_in_month(2023, 5), 31);
        assert_eq!(get_days_in_month(2023, 6), 30);
        assert_eq!(get_days_in_month(2023, 7), 31);
        assert_eq!(get_days_in_month(2023, 8), 31);
        assert_eq!(get_days_in_month(2023, 9), 30);
        assert_eq!(get_days_in_month(2023, 10), 31);
        assert_eq!(get_days_in_month(2023, 11), 30);
        assert_eq!(get_days_in_month(2023, 12), 31);

        // Test February in leap year
        assert_eq!(get_days_in_month(2024, 2), 29);
        assert_eq!(get_days_in_month(2020, 2), 29);
        assert_eq!(get_days_in_month(2000, 2), 29);
    }

    // ──────────────────────────────────────────────────────────────────
    // C-02: referral chain topology validation
    // ──────────────────────────────────────────────────────────────────

    /// Helper: derive a fresh pubkey for tests.
    fn pk(seed: u8) -> Pubkey {
        Pubkey::new_from_array([seed; 32])
    }

    #[test]
    fn test_validate_chain_single_level_bound_to_payer() {
        // payer.referrer = L1
        // chain = [L1]
        // L1.referrer = default (root)
        let payer_referrer = pk(1);
        let chain = vec![(payer_referrer, Pubkey::default())];
        assert!(validate_referral_chain_topology(payer_referrer, &chain).is_ok());
    }

    #[test]
    fn test_validate_chain_full_depth_three_levels() {
        // payer.referrer = L1, L1.referrer = L2, L2.referrer = L3
        // chain = [L1, L2, L3]; L3.referrer is unconstrained at max depth
        let l1 = pk(1);
        let l2 = pk(2);
        let l3 = pk(3);
        let chain = vec![(l1, l2), (l2, l3), (l3, pk(99))];
        assert!(validate_referral_chain_topology(l1, &chain).is_ok());
    }

    #[test]
    fn test_validate_chain_rejects_origin_not_bound_to_payer() {
        // payer.referrer = L1, but chain starts with L_EVIL
        let chain = vec![(pk(99), Pubkey::default())];
        assert!(validate_referral_chain_topology(pk(1), &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_broken_link_in_middle() {
        // chain[0].referrer != chain[1].key
        let l1 = pk(1);
        let l2 = pk(2);
        let l3 = pk(3);
        let chain = vec![(l1, pk(50)), (l2, l3), (l3, Pubkey::default())];
        assert!(validate_referral_chain_topology(l1, &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_short_chain_without_default_terminator() {
        // chain length < MAX but tail points somewhere non-default
        let l1 = pk(1);
        let chain = vec![(l1, pk(2))]; // claims L1.referrer = pk(2), but no L2 supplied
        assert!(validate_referral_chain_topology(l1, &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_empty() {
        let chain: Vec<(Pubkey, Pubkey)> = vec![];
        assert!(validate_referral_chain_topology(pk(1), &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_depth_above_max() {
        let l1 = pk(1);
        let l2 = pk(2);
        let l3 = pk(3);
        let l4 = pk(4);
        let chain = vec![(l1, l2), (l2, l3), (l3, l4), (l4, Pubkey::default())];
        assert!(validate_referral_chain_topology(l1, &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_self_reference() {
        let l1 = pk(1);
        // L1.referrer = L1 (self-cycle)
        let chain = vec![(l1, l1)];
        assert!(validate_referral_chain_topology(l1, &chain).is_err());
    }

    #[test]
    fn test_validate_chain_two_levels_terminates_correctly() {
        let l1 = pk(1);
        let l2 = pk(2);
        let chain = vec![(l1, l2), (l2, Pubkey::default())];
        assert!(validate_referral_chain_topology(l1, &chain).is_ok());
    }
}

// ──────────────────────────────────────────────────────────────────
// C-03: validate_mint_compatible — Token-2022 extension allowlist
// ──────────────────────────────────────────────────────────────────
#[cfg(test)]
mod validate_mint_compatible_tests {
    use super::*;
    use anchor_lang::solana_program::account_info::AccountInfo;
    use anchor_spl::token_2022::spl_token_2022::extension::{
        confidential_transfer::ConfidentialTransferMint, mint_close_authority::MintCloseAuthority,
        non_transferable::NonTransferable, permanent_delegate::PermanentDelegate,
        transfer_fee::TransferFeeConfig, transfer_hook::TransferHook, Extension,
    };

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
