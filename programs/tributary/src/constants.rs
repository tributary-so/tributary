use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

pub const CONFIG_SEED: &[u8] = b"config";
pub const USER_PAYMENT_SEED: &[u8] = b"user_payment";
pub const GATEWAY_SEED: &[u8] = b"gateway";
pub const PAYMENT_POLICY_SEED: &[u8] = b"payment_policy";
pub const PAYMENTS_SEED: &[u8] = b"payments";
