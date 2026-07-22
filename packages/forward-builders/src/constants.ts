import { PublicKey } from "@solana/web3.js";

/**
 * Meteora DLMM program id (single entry in Tributary's
 * `ALLOWED_FORWARD_PROGRAMS`, programs/tributary/src/constants.rs).
 *
 * Used to locate the swap instruction in `pool.swap()` output and as the
 * host-fee-in rewrite target (Meteora's host-fee input is incorrectly
 * declared as SystemProgram; the rewrite forces it back to the DLMM program
 * so the host-fee path is honored — legacy Meteora quirk).
 */
export const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);

/**
 * Raydium CPMM program id (second entry in Tributary's
 * `ALLOWED_FORWARD_PROGRAMS`).
 *
 * Constant-product AMM (x*y=k) pools — simpler than DLMM's bin model: fixed
 * 13-account swap, no dynamic bin arrays, no host-fee SystemProgram quirk.
 */
export const RAYDIUM_CPMM_PUBKEY = new PublicKey(
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
);
