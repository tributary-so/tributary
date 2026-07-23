import {
  Raydium,
  ClmmInstrument,
  PoolUtils,
  getPdaExBitmapAccount,
  MIN_SQRT_PRICE_X64,
  MAX_SQRT_PRICE_X64,
} from "@raydium-io/raydium-sdk-v2";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, type Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type {
  ComposablePolicy,
  ForwardBuilder,
  ForwardConfig,
} from "@tributary-so/sdk";
import { RAYDIUM_CLMM_PUBKEY } from "./constants";

/**
 * Options for {@link createRaydiumClmmForward}.
 */
export interface RaydiumClmmForwardOptions {
  /** The CLMM pool to swap through (PDA, pinned on-chain). */
  pool: PublicKey;
  /** The CLMM amm-config account (locks the fee tier). */
  ammConfig: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
}

/**
 * Build a Raydium CLMM `swap_v2` as a Tributary composable forward step.
 *
 * Delegates to the SDK's `getPoolInfoFromRpc` (handles pool decoding, mint
 * info, tick-array fetch, and compute-pool construction internally) then
 * runs the SDK's swap simulation. Follows the same delegation pattern as
 * the Meteora builder (`DLMM.create` + `dlmmPool.swap`).
 *
 * A dummy `Keypair` is passed to `Raydium.load()` — we only need the RPC
 * helpers, not signing. The swap instruction's payer is `composablePolicyPda`.
 */
export function createRaydiumClmmForward(
  opts: RaydiumClmmForwardOptions
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
      const inputMint = policy.forwardConfig.inputMint;
      const outputMint = policy.forwardConfig.outputMint;

      // ── 1. Load SDK + fetch pool info from RPC ────────────────────
      // getPoolInfoFromRpc returns computePoolInfo + poolKeys + tickArrays
      // — the SDK handles ALL decoding (pool state, ammConfig, bitmap ext,
      // mints, tick arrays) internally. No manual layout decoding needed.
      const raydium = await Raydium.load({
        owner: Keypair.generate(),
        connection,
        cluster: "mainnet",
        disableFeatureCheck: true,
        disableLoadToken: true,
        blockhashCommitment: "confirmed",
      });

      const { poolKeys, computePoolInfo, tickArrays } =
        await raydium.clmm.getPoolInfoFromRpc(opts.pool.toBase58());

      // ── 2. Run swap simulation ────────────────────────────────────
      // getPoolInfoFromRpc returns pre-fetched tickArrays; build the cache
      // the simulation expects (keyed by startTickIndex).
      // ponytail: SDK type mismatch between getPoolInfoFromRpc's tickArrays
      // return and getOutputAmountAndRemainAccounts' cache param — runtime
      // shapes are compatible, TS types aren't. Cast through unknown.
      const tickArrayCache: Record<string, unknown> = {};
      for (const ta of tickArrays) {
        const t = ta as { startTickIndex: number; address: PublicKey };
        tickArrayCache[t.startTickIndex] = { ...ta, address: t.address };
      }

      const isInputMintA =
        computePoolInfo.mintA.address === inputMint.toBase58();
      const blockTimestamp = Math.floor(Date.now() / 1000);

      const { expectedAmountOut, remainingAccounts } =
        PoolUtils.getOutputAmountAndRemainAccounts(
          computePoolInfo,
          computePoolInfo.exBitmapInfo,
          tickArrayCache as never,
          inputMint,
          face,
          blockTimestamp
        );

      if (!remainingAccounts || remainingAccounts.length === 0) {
        throw new Error(
          "CLMM swap simulation returned no tick arrays — swap may be too large for available liquidity"
        );
      }

      // ── 3. Compute min output (slippage) ──────────────────────────
      const minOut = expectedAmountOut
        .muln(10_000 - opts.slippageBps)
        .divn(10_000);

      // ── 4. Build swap_v2 instruction ──────────────────────────────
      const userInputAccount = getAssociatedTokenAddressSync(
        inputMint,
        composablePolicyPda,
        true
      );
      const userOutputAccount = getAssociatedTokenAddressSync(
        outputMint,
        composablePolicyPda,
        true
      );
      const exBitmapPda = getPdaExBitmapAccount(
        RAYDIUM_CLMM_PUBKEY,
        opts.pool
      ).publicKey;
      const sqrtPriceLimitX64 = isInputMintA
        ? MIN_SQRT_PRICE_X64.add(new BN(1))
        : MAX_SQRT_PRICE_X64.sub(new BN(1));

      const swapIx = ClmmInstrument.swapV2Instruction(
        RAYDIUM_CLMM_PUBKEY,
        composablePolicyPda,
        opts.pool,
        new PublicKey(computePoolInfo.ammConfig.id),
        userInputAccount,
        userOutputAccount,
        isInputMintA
          ? new PublicKey(computePoolInfo.vaultA)
          : new PublicKey(computePoolInfo.vaultB),
        isInputMintA
          ? new PublicKey(computePoolInfo.vaultB)
          : new PublicKey(computePoolInfo.vaultA),
        isInputMintA
          ? new PublicKey(computePoolInfo.mintA.address)
          : new PublicKey(computePoolInfo.mintB.address),
        isInputMintA
          ? new PublicKey(computePoolInfo.mintB.address)
          : new PublicKey(computePoolInfo.mintA.address),
        remainingAccounts,
        new PublicKey(poolKeys.observationId),
        face,
        minOut,
        sqrtPriceLimitX64,
        true,
        exBitmapPda
      );

      return {
        instructionData: Buffer.from(swapIx.data),
        forwardAccounts: swapIx.keys.map((k) => ({
          pubkey: k.pubkey,
          isWritable: k.isWritable,
        })),
      };
    },
  };
}

// ── Setup-time: ForwardConfig constraint ──────────────────────────────

/**
 * Anchor discriminator for Raydium CLMM's `swap_v2` instruction —
 * the first 8 bytes of `sha256("global:swap_v2")`.
 */
export const RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR = [
  43, 4, 237, 11, 26, 201, 30, 98,
] as const;

/**
 * Options for {@link raydiumClmmForwardConfig}.
 */
export interface RaydiumClmmForwardConfigOptions {
  inputMint: PublicKey;
  outputMint: PublicKey;
  /** The CLMM pool to swap through. Pinned at `pinnedAccounts[0]` (index 2). */
  pool: PublicKey;
  /** The CLMM amm-config (fee tier). Pinned at `pinnedAccounts[1]` (index 1). */
  ammConfig: PublicKey;
  unwrapNativeSol?: boolean;
}

/**
 * Build the setup-time `ForwardConfig` that constrains a CLMM-swap composable
 * policy. Pins `programId = RAYDIUM_CLMM_PUBKEY`, two `pinnedAccounts`
 * (poolId at index 2 + ammConfig at index 1), and `dataChecks[0]` = the
 * swap_v2 discriminator.
 */
export function raydiumClmmForwardConfig(
  opts: RaydiumClmmForwardConfigOptions
): ForwardConfig {
  const emptyByteRangeCheck = {
    offset: 0,
    length: 0,
    expected: new Array(8).fill(0),
  };
  return {
    instructionConstraint: {
      programId: RAYDIUM_CLMM_PUBKEY,
      numDataChecks: 1,
      dataChecks: [
        {
          offset: 0,
          length: 8,
          expected: [...RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR],
        },
        emptyByteRangeCheck,
        emptyByteRangeCheck,
        emptyByteRangeCheck,
      ],
      numPinnedAccounts: 2,
      pinnedAccounts: [
        { index: 2, pubkey: opts.pool },
        { index: 1, pubkey: opts.ammConfig },
      ],
    },
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    forwardFlags: opts.unwrapNativeSol ? 1 : 0,
  };
}
