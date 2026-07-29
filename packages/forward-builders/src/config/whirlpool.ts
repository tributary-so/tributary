// Browser-safe setup-time surface for Orca Whirlpool composable forwards.
//
// This module MUST NOT import any venue SDK (@meteora-ag/dlmm,
// @raydium-io/raydium-sdk-v2, @orca-so/whirlpools, @solana/kit). The pure
// constraint builder needs only PublicKey + Connection + the discriminator +
// the ForwardConfig type — the one setup-time RPC (getAccountInfo) reads raw
// account bytes and never touches the Orca SDK — so the browser subpath
// (@tributary-so/forward-builders/config) can re-export it without dragging
// @orca-so/whirlpools-core's wasm into a Vite browser build. The fire-time
// half (createWhirlpoolForward) stays on the main entry. See Tributary
// ADR-0030 and TRIBUTARY-WASM-FIX.md.
import { type Connection, PublicKey } from "@solana/web3.js";
import type { ForwardConfig } from "@tributary-so/sdk";
import { WHIRLPOOL_PUBKEY } from "../constants";

/**
 * Anchor discriminator for Orca Whirlpool's `swap_v2` instruction — the
 * first 8 bytes of `sha256("global:swap_v2")`. Tributary's
 * `create_composable_policy` requires at least one `ByteRangeCheck`
 * covering offset 0; pinning the swap selector there closes the boundary
 * so the gateway signer can't substitute a different Whirlpool instruction
 * (e.g. increaseLiquidity, initializePool) at execute time.
 */
export const WHIRLPOOL_SWAP_V2_DISCRIMINATOR = [
  43, 4, 237, 11, 26, 201, 30, 98,
] as const;

// Whirlpool account field offsets (after 8-byte Anchor discriminator):
// tokenMintA at [101, 133), tokenMintB at [181, 213).
// Computed from the whirlpools-client struct decoder field order.
const POOL_TOKEN_MINT_A_OFFSET = 101;
const POOL_TOKEN_MINT_B_OFFSET = 181;
const PUBKEY_LEN = 32;

/**
 * Options for {@link whirlpoolForwardConfig}.
 */
export interface WhirlpoolForwardConfigOptions {
  /** Input mint of the swap (debited from the user's delegate). */
  inputMint: PublicKey;
  /** Output mint of the swap (credited to the recipient). */
  outputMint: PublicKey;
  /**
   * The Whirlpool to swap through. Pinned at `pinnedAccounts[0]` (index 4
   * — the `whirlpool` account in swap_v2's account list).
   */
  pool: PublicKey;
  /**
   * Sets bit 0 of `forward_flags` (`FORWARD_FLAG_NATIVE_OUTPUT`), which makes
   * Tributary unwrap WSOL → native SOL via a closeAccount sweep at settle.
   * Requires `outputMint == NATIVE_MINT`; see `composable_policy.rs`.
   * Off by default.
   */
  unwrapNativeSol?: boolean;
}

/**
 * Build the setup-time `ForwardConfig` that constrains a Whirlpool-swap
 * composable policy.
 *
 * **Async** — unlike the sync Meteora / Raydium configs, this function
 * fetches the pool account once at setup time to (a) validate that
 * `inputMint` / `outputMint` match the pool's two token mints, and (b)
 * derive `aToB` (swap direction) from the pool's mint ordering. Getting
 * `aToB` wrong would route the swap backwards through the pool.
 *
 * Pins:
 * - `programId = WHIRLPOOL_PUBKEY`
 * - `dataChecks[0]` = swap_v2 discriminator (offset 0, length 8)
 * - `dataChecks[1]` = exact-in flag (offset 40, length 1, `0x01`)
 * - `dataChecks[2]` = swap direction `aToB` (offset 41, length 1)
 * - `pinnedAccounts[0]` = pool at account index 4 (the `whirlpool` slot)
 *
 * Stronger than the Meteora config (which pins only selector + pool):
 * direction + exact-in pinning matters because swap_v2's data layout puts
 * these as boolean flags that a gateway signer could otherwise flip.
 */
export async function whirlpoolForwardConfig(
  connection: Connection,
  opts: WhirlpoolForwardConfigOptions
): Promise<ForwardConfig> {
  // Fetch pool to derive aToB and validate mints.
  const account = await connection.getAccountInfo(opts.pool);
  if (!account) {
    throw new Error(`Whirlpool account not found: ${opts.pool.toBase58()}`);
  }
  const data = account.data;

  const poolTokenMintA = new PublicKey(
    data.subarray(
      POOL_TOKEN_MINT_A_OFFSET,
      POOL_TOKEN_MINT_A_OFFSET + PUBKEY_LEN
    )
  );
  const poolTokenMintB = new PublicKey(
    data.subarray(
      POOL_TOKEN_MINT_B_OFFSET,
      POOL_TOKEN_MINT_B_OFFSET + PUBKEY_LEN
    )
  );

  const aToB = opts.inputMint.equals(poolTokenMintA);
  const expectedOutput = aToB ? poolTokenMintB : poolTokenMintA;

  if (!opts.outputMint.equals(expectedOutput)) {
    throw new Error(
      `Output mint ${opts.outputMint.toBase58()} does not match pool's ` +
        `complementary mint ${expectedOutput.toBase58()} ` +
        `(pool ${opts.pool.toBase58()})`
    );
  }

  const emptyByteRangeCheck = {
    offset: 0,
    length: 0,
    expected: new Array(8).fill(0),
  };

  return {
    instructionConstraint: {
      programId: WHIRLPOOL_PUBKEY,
      numDataChecks: 3,
      dataChecks: [
        {
          offset: 0,
          length: 8,
          expected: [...WHIRLPOOL_SWAP_V2_DISCRIMINATOR],
        },
        {
          offset: 40,
          length: 1,
          expected: [0x01], // amountSpecifiedIsInput = true (exact-in only)
        },
        {
          offset: 41,
          length: 1,
          expected: [aToB ? 0x01 : 0x00],
        },
        emptyByteRangeCheck,
      ],
      numPinnedAccounts: 1,
      pinnedAccounts: [
        { index: 4, pubkey: opts.pool },
        { index: 0, pubkey: PublicKey.default },
        { index: 0, pubkey: PublicKey.default },
        { index: 0, pubkey: PublicKey.default },
      ],
    },
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    forwardFlags: opts.unwrapNativeSol ? 1 : 0,
  };
}
