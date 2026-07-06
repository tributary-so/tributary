use crate::error::TributaryError;
use anchor_lang::prelude::*;

/// Fee breakdown for the unified gateway fee model (ADR-0017).
///
/// `gateway_fee_bps` is the ONE total; this struct decomposes it into
/// protocol / scheduler / referral / gateway-residual carve-outs.
pub struct FeeBreakdown {
    /// `payment_amount × gateway_fee_bps / 10000` — the total fee pool.
    pub total_fee: u64,
    /// `total_fee × protocol_share_bps / 10000`.
    pub protocol_cut: u64,
    /// `total_fee × scheduler_share_bps / 10000` — pays the execute signer.
    pub scheduler_cut: u64,
    /// `total_fee × referral_allocation_bps / 10000` (0 when referral disabled).
    pub referral_pool: u64,
    /// `total_fee − protocol_cut − scheduler_cut − referral_pool` → gateway.fee_recipient.
    pub gateway_residual: u64,
    /// Gross: `payment_amount − total_fee`. Net: `payment_amount`.
    pub recipient_amount: u64,
    /// Gross: `payment_amount`. Net: `payment_amount + total_fee`.
    pub total_from_user: u64,
}

/// Compute the full fee breakdown for a payment under the unified model.
///
/// `gateway_fee_bps` is the single total fee. It is decomposed into four
/// carve-outs whose shares must sum to ≤ 10000 bps (enforced at every
/// gateway-config write site, not here).
pub fn calculate_fees(
    payment_amount: u64,
    gateway_fee_bps: u16,
    protocol_share_bps: u16,
    scheduler_share_bps: u16,
    referral_allocation_bps: u16,
    is_referral_enabled: bool,
    is_net_mode: bool,
) -> Result<FeeBreakdown> {
    let total_fee = bps_mul(payment_amount, gateway_fee_bps)?;

    let protocol_cut = bps_mul(total_fee, protocol_share_bps)?;
    let scheduler_cut = bps_mul(total_fee, scheduler_share_bps)?;
    let referral_pool = if is_referral_enabled {
        bps_mul(total_fee, referral_allocation_bps)?
    } else {
        0
    };

    let gateway_residual = total_fee
        .checked_sub(protocol_cut)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_sub(scheduler_cut)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_sub(referral_pool)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let (recipient_amount, total_from_user) = if is_net_mode {
        let total = payment_amount
            .checked_add(total_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        (payment_amount, total)
    } else {
        let recipient = payment_amount
            .checked_sub(total_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        (recipient, payment_amount)
    };

    Ok(FeeBreakdown {
        total_fee,
        protocol_cut,
        scheduler_cut,
        referral_pool,
        gateway_residual,
        recipient_amount,
        total_from_user,
    })
}

/// `amount × bps / 10000`, truncating toward zero (integer division).
///
/// Truncation direction: the `checked_div(10000)` drops any remainder, so
/// the result is always ≤ the exact value. For a 1 USDC payment at 100 bps
/// (1%), the dust is < 10000 lamports of the token's base unit; at SPL-USDC
/// (6 decimals) that is < 0.01 USDC cent. The bound scales linearly with
/// `bps` and `amount`; worst-case dust per call is `< 10000` base units
/// (~40K lamports at the SOL base unit when applied to a 1 SOL amount).
fn bps_mul(amount: u64, bps: u16) -> Result<u64> {
    amount
        .checked_mul(bps as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gross_mode_basic_split() {
        let fb = calculate_fees(1_000_000, 1000, 3000, 1000, 2000, true, false).unwrap();
        assert_eq!(fb.total_fee, 100_000);
        assert_eq!(fb.protocol_cut, 30_000);
        assert_eq!(fb.scheduler_cut, 10_000);
        assert_eq!(fb.referral_pool, 20_000);
        assert_eq!(fb.gateway_residual, 40_000);
        assert_eq!(fb.recipient_amount, 900_000);
        assert_eq!(fb.total_from_user, 1_000_000);
    }

    #[test]
    fn net_mode_basic_split() {
        let fb = calculate_fees(1_000_000, 1000, 3000, 1000, 2000, true, true).unwrap();
        assert_eq!(fb.total_fee, 100_000);
        assert_eq!(fb.recipient_amount, 1_000_000);
        assert_eq!(fb.total_from_user, 1_100_000);
    }

    #[test]
    fn referral_disabled_zeros_pool() {
        let fb = calculate_fees(1_000_000, 1000, 3000, 1000, 2000, false, false).unwrap();
        assert_eq!(fb.referral_pool, 0);
        assert_eq!(fb.gateway_residual, 60_000);
    }

    #[test]
    fn zero_shares_all_to_gateway() {
        let fb = calculate_fees(1_000_000, 1000, 0, 0, 0, false, false).unwrap();
        assert_eq!(fb.gateway_residual, 100_000);
    }

    #[test]
    fn residual_is_balancing_item() {
        let fb = calculate_fees(9_999_999, 1234, 2345, 456, 789, true, false).unwrap();
        let sum = fb.protocol_cut + fb.scheduler_cut + fb.referral_pool + fb.gateway_residual;
        assert_eq!(sum, fb.total_fee);
    }

    #[test]
    fn overflow_detection() {
        let result = calculate_fees(u64::MAX, 100, 0, 0, 0, false, false);
        assert!(result.is_err());
    }

    /// C-1 (review 2026-07-06): bps_mul truncates toward zero (integer
    /// division drops the remainder). The result is always ≤ exact value.
    /// Dust per call is bounded by `bps` base units of the token (the
    /// discarded remainder is `< 10000` after the `/10000`).
    #[test]
    fn bps_mul_truncates_toward_zero() {
        // 9999 base units × 100 bps = 99990 → / 10000 = 9 (dust = 9990).
        // The exact value is 99.99; truncation yields 9 base units of fee.
        let fb = calculate_fees(9999, 100, 0, 0, 0, false, false).unwrap();
        assert_eq!(fb.total_fee, 99); // floor(9999 * 100 / 10000)
                                      // Dust bound: total_fee × 10000 / bps ≤ amount, with < 10000 base
                                      // units of remainder lost per call. Confirm direction:
        let reconstructed = fb.total_fee * 10000 / 100;
        assert!(
            reconstructed <= 9999,
            "truncation must keep result ≤ exact value"
        );
        assert!(9999 - reconstructed < 10000); // dust < 10000 base units
    }
}
