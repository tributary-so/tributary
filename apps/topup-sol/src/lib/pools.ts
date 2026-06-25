import { PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";

/**
 * Meteora DLMM program id — the sole entry in Tributary's
 * ALLOWED_FORWARD_PROGRAMS. Must match programs/tributary/src/constants.rs.
 */
export const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);

/** USDC (mainnet, 6 decimals) — the input/funding mint. */
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

/** WSOL — the swap output mint (unwrapped to native SOL when NATIVE_OUTPUT on). */
export const WSOL_MINT = NATIVE_MINT;

export interface PresetPool {
  label: string;
  /** DLMM LbPair address. */
  address: PublicKey;
  /** Mint the user pays in (input). */
  inMint: PublicKey;
  /** Mint the swap produces (output). */
  outMint: PublicKey;
}

/**
 * Preset Meteora DLMM pools. Currently only SOL/USDC is wired (the pool used
 * by tests/topup-balance-sol.test.ts). Users can also paste a custom LbPair.
 */
export const PRESET_POOLS: PresetPool[] = [
  {
    label: "SOL / USDC",
    address: new PublicKey("BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y"),
    inMint: USDC_MINT,
    outMint: WSOL_MINT,
  },
];
