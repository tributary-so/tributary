use anchor_lang::prelude::*;

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";
pub const USER_PAYMENT_SEED: &[u8] = b"user_payment";
pub const GATEWAY_SEED: &[u8] = b"gateway";
pub const PAYMENT_POLICY_SEED: &[u8] = b"payment_policy";
pub const PAYMENTS_SEED: &[u8] = b"payments";
pub const REFERRAL_SEED: &[u8] = b"referral";
pub const COMPOSABLE_POLICY_SEED: &[u8] = b"composable_policy";
pub const VALIDATION_PDA_PRE_SEED: &[u8] = b"composable_validation_pre";
pub const VALIDATION_PDA_POST_SEED: &[u8] = b"composable_validation_post";

pub const ALLOWED_FORWARD_PROGRAMS: &[Pubkey] = &[
    pubkey!("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"), // Meteora DLMM
    pubkey!("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"), // Raydium CPMM
    pubkey!("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"), // Raydium CLMM
];

pub const ALLOWED_VALIDATION_PROGRAMS: &[Pubkey] =
    &[pubkey!("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95")]; // Lighthouse

/// Forward flag bit 0: convert the WSOL intermediate to native SOL via a
/// `closeAccount` sweep whose `destination` is pinned to
/// `composable_policy.recipient` on-chain (see `process_output_and_sweep`).
/// Requires `output_mint == NATIVE_MINT`. See
/// reports/native-output-sweep.md (and bean tributary-hgp7).
pub const FORWARD_FLAG_NATIVE_OUTPUT: u8 = 1;

/// Wrapped SOL mint (`So111…111`), aka NATIVE_MINT. Defined locally
/// because the `solana_program::native_token::NATIVE_MINT` re-export was
/// dropped in solana-program 2.x and the crate graph doesn't expose a
/// stable cross-version constant. This is the canonical WSOL mint; drift
/// would break the NATIVE_OUTPUT create-time guard.
pub const NATIVE_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
