use anchor_lang::prelude::*;

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";
pub const USER_PAYMENT_SEED: &[u8] = b"user_payment";
pub const GATEWAY_SEED: &[u8] = b"gateway";
pub const PAYMENT_POLICY_SEED: &[u8] = b"payment_policy";
pub const PAYMENTS_SEED: &[u8] = b"payments";
pub const REFERRAL_SEED: &[u8] = b"referral";
pub const COMPOSABLE_POLICY_SEED: &[u8] = b"composable_policy";
pub const VALIDATION_PDA_SEED: &[u8] = b"composable_validation";

pub const ALLOWED_FORWARD_PROGRAMS: &[Pubkey] =
    &[pubkey!("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")]; // meteora dlm

pub const ALLOWED_VALIDATION_PROGRAMS: &[Pubkey] =
    &[pubkey!("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95")]; // Lighthouse
