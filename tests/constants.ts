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
 * reports/C-1-validation-cpi-signer-leak.md). The forward CPI itself is
 * currently commented out in execute_composable, so in tests this value
 * is effectively a placeholder that satisfies the create-time allowlist
 * check; per-test data_checks only gate Step-1 byte validation.
 */
export const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);

/**
 * Lighthouse — currently the ONLY entry in ALLOWED_VALIDATION_PROGRAMS.
 * Used as the validation program in composable policy tests.
 */
export const LIGHTHOUSE_PUBKEY = new PublicKey(
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"
);
