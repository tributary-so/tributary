use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

pub const CONFIG_SEED: &[u8] = b"config";
pub const USER_PAYMENT_SEED: &[u8] = b"user_payment";
pub const GATEWAY_SEED: &[u8] = b"gateway";
pub const PAYMENT_POLICY_SEED: &[u8] = b"payment_policy";
pub const PAYMENTS_SEED: &[u8] = b"payments";
pub const REFERRAL_SEED: &[u8] = b"referral";
pub const COMPOSABLE_POLICY_SEED: &[u8] = b"composable_policy";

pub const ALLOWED_FORWARD_PROGRAMS: &[Pubkey] = &[Pubkey::new_from_array([
    4, 233, 225, 47, 188, 132, 232, 38, 201, 50, 204, 233, 226, 100, 12, 206, 21, 89, 12, 28, 98,
    115, 176, 146, 87, 8, 186, 59, 133, 32, 176, 188,
])];

pub const ALLOWED_VALIDATION_PROGRAMS: &[Pubkey] = &[Pubkey::new_from_array([
    27, 132, 9, 36, 40, 199, 39, 73, 206, 202, 182, 138, 49, 228, 255, 26, 84, 15, 1, 59, 33, 181,
    20, 108, 33, 121, 11, 218, 102, 79, 120, 118,
])];
