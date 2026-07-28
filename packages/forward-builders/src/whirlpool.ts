import {
  setNativeMintWrappingStrategy,
  swapInstructions,
} from "@orca-so/whirlpools";
import {
  address,
  createNoopSigner,
  createSolanaRpc,
  isWritableRole,
} from "@solana/kit";
import { type Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type {
  ComposablePolicy,
  ForwardBuilder,
  ForwardConfig,
} from "@tributary-so/sdk";
import { WHIRLPOOL_PUBKEY } from "./constants";

const WHIRLPOOL_PROGRAM_ADDRESS = address(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
);

/**
 * Options for {@link createWhirlpoolForward}.
 */
export interface WhirlpoolForwardOptions {
  /** The Orca Whirlpool (concentrated-liquidity pool) to swap through. */
  pool: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
}

/**
 * Build an Orca Whirlpool `swap_v2` as a Tributary composable forward step.
 *
 * Uses the Orca `@orca-so/whirlpools` SDK (kit v2) **internally**: a kit RPC
 * is constructed from the v1 Connection endpoint, a noop signer is created
 * for the composable policy PDA, and the SDK's `swapInstructions()` resolves
 * tick arrays + oracle + quote. Only the whirlpool swap instruction is
 * extracted — ATA-create/wrap/cleanup ixs are dropped (Tributary owns the
 * intermediate ATA lifecycle).
 *
 * Kit types are converted back to web3.js v1 types at the boundary; they do
 * not leak into the public API.
 *
 * Returns a {@link ForwardBuilder} whose `build()` returns:
 *
 * - `instructionData` — raw swap_v2 selector + args.
 * - `forwardAccounts` — per-account `{ pubkey, isWritable }`. **No
 *   `isSigner`** (ADR-0008).
 */
export function createWhirlpoolForward(
  opts: WhirlpoolForwardOptions
): ForwardBuilder {
  return {
    async build({
      connection,
      policy,
      composablePolicyPda,
      face,
    }: {
      connection: Connection;
      policy: ComposablePolicy;
      composablePolicyPda: PublicKey;
      face: BN;
    }) {
      // ── kit v2 interop ────────────────────────────────────────────
      // Build a kit RPC from the v1 Connection endpoint. The Orca SDK
      // needs kit v2 types internally.
      setNativeMintWrappingStrategy("ata");

      const rpc = createSolanaRpc(connection.rpcEndpoint);
      const signer = createNoopSigner(address(composablePolicyPda.toBase58()));

      const inputMint = policy.forwardConfig.inputMint;
      const { instructions } = await swapInstructions(
        rpc,
        {
          inputAmount: BigInt(face.toString()),
          mint: address(inputMint.toBase58()),
        },
        address(opts.pool.toBase58()),
        {
          slippageToleranceBps: opts.slippageBps,
          signer,
        }
      );

      // Extract ONLY the whirlpool swap instruction — drop ATA-create /
      // wrap / cleanup ixs (Tributary owns the intermediate lifecycle).
      const swapIx = instructions.find(
        (ix) => ix.programAddress === WHIRLPOOL_PROGRAM_ADDRESS
      );
      if (!swapIx || !swapIx.accounts || !swapIx.data) {
        throw new Error(
          "Whirlpool swap_v2 instruction not found in swapInstructions() output"
        );
      }

      // ── convert kit metas → ForwardAccountMeta ────────────────────
      return {
        instructionData: Buffer.from(swapIx.data),
        forwardAccounts: swapIx.accounts.map((meta) => ({
          pubkey: new PublicKey(meta.address),
          isWritable: isWritableRole(meta.role),
        })),
      };
    },
  };
}

// ── Setup-time: ForwardConfig constraint ──────────────────────────────
// The fire-time {@link createWhirlpoolForward} above and the setup-time
// constraint below are two views of the same swap_v2. Co-locating them
// here makes setup/fire-time drift impossible. See Tributary ADR-0030.

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
