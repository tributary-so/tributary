use crate::error::TributaryError;
use anchor_lang::prelude::*;

pub struct FeeBreakdown {
    pub gateway_fee: u64,
    pub protocol_fee: u64,
    pub recipient_amount: u64,
    pub total_from_user: u64,
}

pub fn calculate_fees(
    payment_amount: u64,
    gateway_fee_bps: u16,
    custom_protocol_fee_bps: u16,
    protocol_fee_bps: u16,
    is_custom_protocol_fee: bool,
    is_net_mode: bool,
) -> Result<FeeBreakdown> {
    // Calculate gateway fee
    let gateway_fee = payment_amount
        .checked_mul(gateway_fee_bps as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let protocol_fee_bps = if is_custom_protocol_fee {
        custom_protocol_fee_bps
    } else {
        protocol_fee_bps
    };

    let protocol_fee = payment_amount
        .checked_mul(protocol_fee_bps as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let (recipient_amount, total_from_user) = if is_net_mode {
        let total = payment_amount
            .checked_add(gateway_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_add(protocol_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        (payment_amount, total)
    } else {
        let recipient = payment_amount
            .checked_sub(gateway_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_sub(protocol_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        (recipient, payment_amount)
    };

    Ok(FeeBreakdown {
        gateway_fee,
        protocol_fee,
        recipient_amount,
        total_from_user,
    })
}
