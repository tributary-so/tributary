//! Local stand-in for the `qedgen_kani_prelude` crate that qedgen >= v2.47
//! imports from generated Kani harnesses (`use qedgen_kani_prelude::{...}`).
//!
//! qedgen scaffolds this crate into a program crate when running full
//! `qedgen codegen` (Rust scaffold). Tributary regenerates ONLY the Kani
//! artifact (`qedgen codegen --kani --kani-output formal_verification/kani.rs`),
//! so we ship the prelude as a sibling crate here. Three helpers, mirror
//! of qedgen's published API; only `mul_div_floor_u128` is currently used
//! by the generated `bps_mul`, but the other two are exported to satisfy
//! the import list without `unused_imports` warnings.

#![cfg(kani)]

/// `(amount * bps) / denom`, rounded down, returning u64.
/// Used by the generated `bps_mul(amount, bps) -> u64` for fee math.
pub fn mul_div_floor_u128(amount: u128, bps: u128, denom: u128) -> u64 {
    ((amount * bps) / denom) as u64
}

/// `(amount * bps) / denom`, rounded up.
pub fn mul_div_ceil_u128(amount: u128, bps: u128, denom: u128) -> u64 {
    let q = (amount * bps) / denom;
    let r = (amount * bps) % denom;
    (q + (if r > 0 { 1 } else { 0 })) as u64
}

/// `(amount * bps) / denom`, rounded half up.
pub fn mul_div_round_half_up_u128(amount: u128, bps: u128, denom: u128) -> u64 {
    let num = amount * bps;
    let half = denom / 2;
    let q = num / denom;
    let r = num % denom;
    (q + (if r >= half { 1 } else { 0 })) as u64
}
