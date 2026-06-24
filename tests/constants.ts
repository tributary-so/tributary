import { PublicKey } from "@solana/web3.js";

/**
 * Test-only program IDs. These MUST match the allowlists in
 * programs/tributary/src/constants.rs (ALLOWED_FORWARD_PROGRAMS,
 * ALLOWED_VALIDATION_PROGRAMS). Drift will cause tests to silently
 * use wrong allowlists. If you update these, also update the program
 * constants.
 *
 * Source of truth: programs/tributary/src/constants.rs
 *   - ALLOWED_FORWARD_PROGRAMS  (Meteora DLMM)
 *   - ALLOWED_VALIDATION_PROGRAMS (Lighthouse)
 */

/**
 * Meteora DLMM — currently the ONLY entry in ALLOWED_FORWARD_PROGRAMS.
 *
 * The Token Program was removed from the forward allowlist because the
 * raw-token-transfer "forward" was a direct user-fund drain vector (see
 * reports/C-1-validation-cpi-signer-leak.md). The forward CPI runs live
 * for allowlisted programs (DLMM); policies whose target_program is
 * Pubkey::default() skip the forward step entirely (sentinel disable —
 * see execute_composable.run_forward_cpi).
 */
export const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);

/**
 * Meteora DLMM SOL/USDC pool — used by topup-balance-swap.test.ts as the
 * forward target for a USDC->WSOL swap. Owned by METEORA_DLMM_PUBKEY
 * (verified on mainnet). Surfpool lazy-forks pool + bin-array state from
 * mainnet when the SDK reads them.
 */
export const METEORA_DLMM_SOL_USDC_POOL = new PublicKey(
  "BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y"
);

/**
 * Lighthouse — currently the ONLY entry in ALLOWED_VALIDATION_PROGRAMS.
 * Used as the validation program in composable policy tests.
 */
export const LIGHTHOUSE_PUBKEY = new PublicKey(
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"
);
