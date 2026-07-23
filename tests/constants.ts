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
 * Raydium CLMM — third entry in ALLOWED_FORWARD_PROGRAMS (concentrated
 * liquidity AMM, Uniswap V3 model). Mirrored from
 * packages/forward-builders/src/constants.ts.
 */
export const RAYDIUM_CLMM_PUBKEY = new PublicKey(
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
);

/**
 * Raydium CLMM USDC/WSOL pool — used by topup-balance-swap-raydium.test.ts
 * as the forward target for a USDC→WSOL swap. Owned by RAYDIUM_CLMM_PUBKEY.
 * Surfpool lazy-forks pool + tick-arrays + observation state from mainnet.
 *
 * The paired `amm_config` (fee tier) is read on-chain via
 * {@link loadClmmPoolAmmConfig} (configId @ offset 9 of pool_state —
 * after disc(8) + bump(1)).
 */
export const RAYDIUM_CLMM_USDC_WSOL_POOL = new PublicKey(
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
 * CLMM pool_state layout (Raydium) — only the field we need:
 *   disc(8) + bump(1) + configId(32) + creator(32) + mintA(32) + mintB(32)
 *   + vaultA(32) + vaultB(32) + observationId(32) + ...
 *
 * → configId @ offset 9 (after disc(8) + bump(1))
 *
 * Full layout lives in @raydium-io/raydium-sdk-v2 PoolInfoLayout; we only
 * read the one field.
 */
const CLMM_POOL_CONFIG_OFFSET = 9;

/**
 * Read the `amm_config` PDA for a fixed Raydium CLMM pool.
 *
 * The `amm_config` is the fee-tier account paired with the pool. It's a
 * PDA derived from `(programId, config_index)` — not derivable from the
 * pool address alone — so we read it from the pool_state account (offset 9,
 * after disc(8) + bump(1)).
 *
 * Throws if the pool account is missing or not owned by the CLMM program.
 */
export async function loadClmmPoolAmmConfig(
  connection: Connection,
  pool: PublicKey
): Promise<PublicKey> {
  const acct = await connection.getAccountInfo(pool, "confirmed");
  if (!acct?.data) {
    throw new Error(
      `Raydium CLMM pool ${pool.toBase58()} not found on the current fork`
    );
  }
  if (!acct.owner.equals(RAYDIUM_CLMM_PUBKEY)) {
    throw new Error(
      `Account ${pool.toBase58()} is not a Raydium CLMM pool (owner=${acct.owner.toBase58()})`
    );
  }
  return new PublicKey(
    acct.data.subarray(CLMM_POOL_CONFIG_OFFSET, CLMM_POOL_CONFIG_OFFSET + 32)
  );
}
