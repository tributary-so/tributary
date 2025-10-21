use crate::PaymentFrequency;
use anchor_lang::prelude::*;

/// Calculate the next payment due date based on payment frequency
pub fn calculate_next_payment_due(
    current_due: i64,
    frequency: &PaymentFrequency,
    current_timestamp: i64,
) -> Result<i64> {
    let mut next_due = current_due;

    match frequency {
        PaymentFrequency::Daily => {
            // Add 24 hours (86400 seconds)
            while next_due <= current_timestamp {
                next_due += 86400;
            }
        }
        PaymentFrequency::Weekly => {
            // Add 7 days (604800 seconds)
            while next_due <= current_timestamp {
                next_due += 604800;
            }
        }
        PaymentFrequency::Monthly => {
            // Add one month, maintaining the same day
            while next_due <= current_timestamp {
                next_due = add_months(next_due, 1)?;
            }
        }
        PaymentFrequency::Quarterly => {
            // Add 3 months, maintaining the same day
            while next_due <= current_timestamp {
                next_due = add_months(next_due, 3)?;
            }
        }
        PaymentFrequency::SemiAnnually => {
            // Add 6 months, maintaining the same day
            while next_due <= current_timestamp {
                next_due = add_months(next_due, 6)?;
            }
        }
        PaymentFrequency::Annually => {
            // Add 12 months, maintaining the same day
            while next_due <= current_timestamp {
                next_due = add_months(next_due, 12)?;
            }
        }
        PaymentFrequency::Custom(interval_seconds) => {
            // Add custom interval in seconds
            while next_due <= current_timestamp {
                next_due += *interval_seconds as i64;
            }
        }
    }

    Ok(next_due)
}

/// Add months to a Unix timestamp, maintaining the same day of month
fn add_months(timestamp: i64, months: i32) -> Result<i64> {
    // Convert Unix timestamp to date components
    let days_since_epoch = timestamp / 86400;
    let seconds_in_day = timestamp % 86400;

    // Calculate year, month, day from days since epoch (1970-01-01)
    let mut year = 1970;
    let mut remaining_days = days_since_epoch as i32;

    // Handle years
    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days >= days_in_year {
            remaining_days -= days_in_year;
            year += 1;
        } else {
            break;
        }
    }

    // Handle months
    let mut month = 1;
    loop {
        let days_in_month = get_days_in_month(year, month);
        if remaining_days >= days_in_month {
            remaining_days -= days_in_month;
            month += 1;
        } else {
            break;
        }
    }

    let day = remaining_days + 1; // Days are 1-indexed

    // Add the requested months
    let mut new_month = month + months;
    let mut new_year = year;

    // Handle month overflow/underflow
    while new_month > 12 {
        new_month -= 12;
        new_year += 1;
    }
    while new_month < 1 {
        new_month += 12;
        new_year -= 1;
    }

    // Handle day overflow (e.g., Jan 31 + 1 month = Feb 28/29)
    let max_day_in_new_month = get_days_in_month(new_year, new_month);
    let new_day = if day > max_day_in_new_month {
        max_day_in_new_month
    } else {
        day
    };

    // Convert back to Unix timestamp
    let mut new_days_since_epoch = 0i64;

    // Add days for complete years
    for y in 1970..new_year {
        new_days_since_epoch += if is_leap_year(y) { 366 } else { 365 };
    }

    // Add days for complete months in the target year
    for m in 1..new_month {
        new_days_since_epoch += get_days_in_month(new_year, m) as i64;
    }

    // Add remaining days
    new_days_since_epoch += (new_day - 1) as i64;

    // Convert to timestamp
    let new_timestamp = new_days_since_epoch * 86400 + seconds_in_day;

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
