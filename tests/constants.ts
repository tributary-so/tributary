import { PublicKey, type Connection } from "@solana/web3.js";

/**
 * Test-only program IDs. These MUST match the allowlists in
 * programs/tributary/src/constants.rs (ALLOWED_FORWARD_PROGRAMS,
 * ALLOWED_VALIDATION_PROGRAMS). Drift will cause tests to silently
 * use wrong allowlists. If you update these, also update the program
 * constants.
 *
 * Source of truth: programs/tributary/src/constants.rs
 *   - ALLOWED_FORWARD_PROGRAMS  (Meteora DLMM + Raydium CPMM — ADR-0032)
 *   - ALLOWED_VALIDATION_PROGRAMS (Lighthouse)
 */

/**
 * Meteora DLMM — first entry in ALLOWED_FORWARD_PROGRAMS.
 *
 * The Token Program was removed from the forward allowlist because the
 * raw-token-transfer "forward" was a direct user-fund drain vector (see
 * reports/C-1-validation-cpi-signer-leak.md). The forward CPI runs live
 * for allowlisted programs (DLMM + CPMM); policies whose target_program
 * is Pubkey::default() skip the forward step entirely (sentinel disable
 * — see execute_composable.run_forward_cpi).
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
 * Raydium CPMM — second entry in ALLOWED_FORWARD_PROGRAMS (ADR-0032).
 * Constant-product AMM (x*y=k). Mirrored from
 * packages/forward-builders/src/constants.ts.
 */
export const RAYDIUM_CPMM_PUBKEY = new PublicKey(
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
);

/**
 * Raydium CPMM USDC/WSOL pool — used by topup-balance-swap-raydium.test.ts
 * as the forward target for a USDC→WSOL swap. Owned by RAYDIUM_CPMM_PUBKEY.
 * Surfpool lazy-forks the pool + vault + observation_state accounts from
 * mainnet when the test reads them.
 *
 * The paired `amm_config` (fee tier) is read on-chain via
 * {@link loadCpmmPoolAmmConfig} rather than hardcoded — the config is a
 * PDA derived from the program + an index, and its bytes live at offset 8
 * of the pool_state account (configId is the first field after the 8-byte
 * discriminator).
 */
export const RAYDIUM_CPMM_USDC_WSOL_POOL = new PublicKey(
  "3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv"
);

/**
 * Lighthouse — currently the ONLY entry in ALLOWED_VALIDATION_PROGRAMS.
 * Used as the validation program in composable policy tests.
 */
export const LIGHTHOUSE_PUBKEY = new PublicKey(
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"
);

/**
 * CPMM pool_state layout (Raydium) — only the field we need:
 *   disc(8) + configId(32) + poolCreator(32) + vaultA(32) + vaultB(32)
 *   + mintLp(32) + mintA(32) + mintB(32) + ...
 *
 * → configId @ offset 8 (the amm_config PDA, first field after discriminator)
 *
 * Full layout lives in @raydium-io/raydium-sdk-v2 CpmmPoolInfoLayout; we
 * only read the one field, so no need to pull in the full struct here.
 */
const CPMM_POOL_CONFIG_OFFSET = 8;

/**
 * Read the `amm_config` PDA for a fixed Raydium CPMM pool.
 *
 * The `amm_config` is the fee-tier account paired with the pool. It's a
 * PDA derived from `(programId, config_index)` — not derivable from the
 * pool address alone — so we read it from the pool_state account (offset 8,
 * right after the 8-byte discriminator).
 *
 * Used by topup-balance-swap-raydium.test.ts to get the second pin slot
 * (`pinnedAccounts[1]` = amm_config at swap-account index 2, ADR-0032).
 *
 * Throws if the pool account is missing or not owned by the CPMM program.
 */
export async function loadCpmmPoolAmmConfig(
  connection: Connection,
  pool: PublicKey
): Promise<PublicKey> {
  const acct = await connection.getAccountInfo(pool, "confirmed");
  if (!acct?.data) {
    throw new Error(
      `Raydium CPMM pool ${pool.toBase58()} not found on the current fork`
    );
  }
  if (!acct.owner.equals(RAYDIUM_CPMM_PUBKEY)) {
    throw new Error(
      `Account ${pool.toBase58()} is not a Raydium CPMM pool (owner=${acct.owner.toBase58()})`
    );
  }
  return new PublicKey(
    acct.data.subarray(CPMM_POOL_CONFIG_OFFSET, CPMM_POOL_CONFIG_OFFSET + 32)
  );
}
