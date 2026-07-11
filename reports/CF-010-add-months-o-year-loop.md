# CF-010: `add_months` O(year−1970) Loop — Compute-Budget DoS for Dormant Subscriptions

> **Severity:** 🔵 4 (LOW)  
> **Category:** Performance / DoS  
> **Status:** Open  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**File:** `programs/tributary/src/shared/schedule.rs:179–184`

```rust
// Line 179–184: inside add_months — O(new_year - 1970) per call
for y in 1970..new_year {
    let days = if is_leap_year(y) { 366i64 } else { 365i64 };
    new_days_since_epoch = new_days_since_epoch
        .checked_add(days)
        .ok_or(TributaryError::ArithmeticOverflow)?;
}
```

This loop is inside `skip_months` (line 74–86), which calls `add_months` up to `MAX_MONTHLY_ITERATIONS = 1200` times. Each `add_months` call also has a month-decomposition loop (line 187–192) that is O(month).

---

## Root Cause

`add_months` converts a Unix timestamp to (year, month, day) by iterating from epoch (1970) forward year-by-year, then month-by-month. This is O(year − 1970) + O(month).

For a Monthly subscription created today (2024) and executed normally, the year loop is ~54 iterations — negligible. But if the subscription is dormant for decades:

| Dormancy  | skip_months iterations | add_months calls | Total inner iterations | CU estimate                       |
| --------- | ---------------------- | ---------------- | ---------------------- | --------------------------------- |
| 1 year    | ~12                    | 12               | ~650                   | ~20K CU                           |
| 10 years  | ~120                   | 120              | ~6,500                 | ~200K CU                          |
| 50 years  | ~600                   | 600              | ~78,000                | ~2.4M CU (**exceeds 1.4M limit**) |
| 100 years | ~1200                  | 1200             | ~312,000               | **way over**                      |

A subscription left unexecuted for 50+ years permanently fails to advance. The policy is bricked.

**Mitigating factors:**

- CF-005's fix (creation-time clamp of `next_payment_due` to `now`) prevents the most common trigger (epoch-0 next_payment_due)
- Realistically, a subscription dormant 50+ years is unlikely
- But the compute-budget exhaustion is real — any dormant Monthly/Quarterly/SemiAnnually/Annually subscription can hit this

---

## Exploit Scenario

```
1. User creates a Monthly subscription in 2024.
2. User stops using the service, forgets about the policy.
3. 50 years pass (2074).
4. Gateway tries to execute the subscription.
   advance_policy → calculate_next_payment_due(2024_timestamp, Monthly, 2074_timestamp)
   skip_months: ~600 iterations × ~130 iterations/add_months = ~78,000 iterations
   → CU budget exhausted → transaction reverts
5. Every subsequent execution attempt fails. Policy is permanently stuck.
```

---

## Impact Assessment

| Dimension     | Value                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Fund loss** | None — the user's delegated tokens remain in their account                                                              |
| **DoS**       | Permanent policy bricking after ~50 years of dormancy                                                                   |
| **Scope**     | Monthly/Quarterly/SemiAnnually/Annually frequency subscriptions only (Daily/Weekly/Custom use O(1) fixed-interval math) |
| **Recovery**  | Delete and recreate the policy                                                                                          |

---

## Patch

Replace the iterative year/month decomposition with Howard Hinnant's O(1) `days_from_civil` algorithm:

```rust
/// O(1) conversion from (year, month, day) to days since epoch.
/// Algorithm: Howard Hinnant, "date" library (public domain).
fn days_from_civil(year: i32, month: u32, day: u32) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as u32; // [0, 399]
    let doy = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy; // [0, 146096]
    era as i64 * 146097 + doe as i64 - 719468
}

/// O(1) conversion from days since epoch to (year, month, day).
fn civil_from_days(z: i64) -> (i32, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32; // [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; // [0, 399]
    let y = yoe as i32 + era as i32 * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
    let m = if mp < 10 { mp + 3 } else { mp - 9 }; // [1, 12]
    (if m <= 2 { y + 1 } else { y }, m, d)
}
```

Then `add_months` becomes:

```rust
fn add_months(timestamp: i64, months: i32) -> Result<i64> {
    let days = timestamp / 86400;
    let secs = timestamp % 86400;
    let (year, month, day) = civil_from_days(days);

    let total_months = (year * 12 + (month as i32 - 1)) + months;
    let new_year = total_months.div_euclid(12);
    let new_month = total_months.rem_euclid(12) as u32 + 1;

    // Clamp day to month length
    let max_day = days_in_month(new_year, new_month);
    let new_day = day.min(max_day);

    let new_days = days_from_civil(new_year, new_month, new_day);
    Ok(new_days * 86400 + secs)
}
```

This is O(1) — no loops. The `skip_months` loop still iterates (bounded by `MAX_MONTHLY_ITERATIONS`), but each iteration is now constant-time.
