use crate::{error::TributaryError, state::*, PaymentFrequency};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount as LegacyTokenAccount;
use anchor_spl::token_2022::spl_token_2022::{
    extension::{transfer_hook::TransferHook, BaseStateWithExtensions, StateWithExtensions},
    state::Mint as Token2022Mint,
};
use anchor_spl::token_interface::{self, TransferChecked};

/// Validate that a Token-2022 mint does not have a TransferHook extension configured.
/// Legacy SPL Token mints are always allowed (no extensions possible).
pub fn validate_mint_no_transfer_hook(mint_info: &AccountInfo) -> Result<()> {
    if *mint_info.owner != anchor_spl::token_2022::ID {
        return Ok(());
    }

    let data = mint_info
        .try_borrow_data()
        .map_err(|_| TributaryError::InvalidTokenAccount)?;

    if let Ok(state) = StateWithExtensions::<Token2022Mint>::unpack(&data) {
        if state.get_extension::<TransferHook>().is_ok() {
            return Err(TributaryError::TransferHookNotSupported.into());
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

    let level1_reward = referral_pool
        .checked_mul(referral_tiers_bps[0] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let level2_reward = referral_pool
        .checked_mul(referral_tiers_bps[1] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let level3_reward = referral_pool
        .checked_mul(referral_tiers_bps[2] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let (referral_accounts, token_accounts) =
        parse_remaining_accounts(ctx.remaining_accounts, ctx.expected_mint, ctx.gateway_key)?;

    if referral_accounts.is_empty() {
        return Ok(0);
    }

    let level1_referrer: Option<&AccountLoader<ReferralAccount>> = referral_accounts.last();
    let mut level2_referrer: Option<&AccountLoader<ReferralAccount>> = None;
    let mut level3_referrer: Option<&AccountLoader<ReferralAccount>> = None;
    if referral_accounts.len() == 3 {
        level2_referrer = referral_accounts.get(referral_accounts.len().saturating_sub(2));
        level3_referrer = referral_accounts.first();
    } else if referral_accounts.len() == 2 {
        level2_referrer = referral_accounts.first();
    }

    emit!(ReferralRewardDistributedRecord {
        payment_policy: ctx.payment_policy_key,
        gateway: ctx.gateway_key,
        payment_amount: ctx.payment_amount,
        timestamp: ctx.timestamp,
        rewards: [
            level1_referrer.map(|loader| ReferralReward {
                pubkey: loader.key(),
                reward: level1_reward,
            }),
            level2_referrer.map(|loader| ReferralReward {
                pubkey: loader.key(),
                reward: level2_reward,
            }),
            level3_referrer.map(|loader| ReferralReward {
                pubkey: loader.key(),
                reward: level3_reward,
            }),
        ],
    });

    transfer_referral_reward(&ctx, &token_accounts, level1_referrer, level1_reward)?;
    transfer_referral_reward(&ctx, &token_accounts, level2_referrer, level2_reward)?;
    transfer_referral_reward(&ctx, &token_accounts, level3_referrer, level3_reward)?;

    msg!(
        "Referral pool: {} (L1: {}, L2: {}, L3: {})",
        referral_pool,
        level1_reward,
        level2_reward,
        level3_reward
    );

    Ok(referral_pool)
}

#[inline(never)]
pub fn parse_remaining_accounts<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    expected_mint: Pubkey,
    gateway_key: Pubkey,
) -> Result<(
    Vec<AccountLoader<'info, ReferralAccount>>,
    Vec<(Pubkey, AccountInfo<'info>)>,
)> {
    let mut referral_accounts = Vec::new();
    let mut token_accounts = Vec::new();

    for acc in remaining_accounts {
        if acc.data_len() == ReferralAccount::SIZE {
            if !acc.is_writable {
                return Err(TributaryError::ReferrerMustBeWritable.into());
            }
            if let Ok(loader) = AccountLoader::<ReferralAccount>::try_from(acc) {
                let gateway_check = loader.load().map(|data| data.gateway);
                match gateway_check {
                    Ok(gw) if gw == gateway_key => referral_accounts.push(loader),
                    Ok(_) => return Err(TributaryError::ReferrerAccountInvalid.into()),
                    Err(_) => return Err(TributaryError::ReferrerAccountInvalid.into()),
                }
            } else {
                return Err(TributaryError::ReferrerAccountInvalid.into());
            }
        } else if acc.data_len() >= 165 {
            if let Ok(token_acc) = Account::<LegacyTokenAccount>::try_from(acc.as_ref()) {
                if token_acc.mint == expected_mint {
                    token_accounts.push((token_acc.owner, acc.clone()));
                } else {
                    return Err(TributaryError::ReferrerATAInvalid.into());
                }
            } else {
                return Err(TributaryError::ReferrerATAInvalid.into());
            }
        }
    }

    if referral_accounts.len() != token_accounts.len() {
        msg!(
            "We have {} referrals vs {} atas",
            referral_accounts.len(),
            token_accounts.len()
        );
        return Err(TributaryError::MismatchAtaReferralAccountNumbers.into());
    }

    Ok((referral_accounts, token_accounts))
}

#[inline(never)]
fn transfer_referral_reward<'info>(
    ctx: &ReferralContext<'_, 'info>,
    token_accounts: &[(Pubkey, AccountInfo<'info>)],
    referral_loader: Option<&AccountLoader<'info, ReferralAccount>>,
    reward: u64,
) -> Result<()> {
    if reward == 0 {
        return Ok(());
    }

    if let Some(loader) = referral_loader {
        let referrer_pubkey = loader.load()?.owner;

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

        let mut referral_account = loader.load_mut()?;
        referral_account.total_earned = referral_account
            .total_earned
            .checked_add(reward)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }

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
}
