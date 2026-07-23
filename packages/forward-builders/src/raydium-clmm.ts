import {
  ClmmInstrument,
  ClmmConfigLayout,
  PoolInfoLayout,
  TickArrayLayout,
  TickArrayBitmapExtensionLayout,
  PoolUtils,
  fetchTickArrays,
  getPdaExBitmapAccount,
  getPdaObservationAccount,
  MIN_SQRT_PRICE_X64,
  MAX_SQRT_PRICE_X64,
} from "@raydium-io/raydium-sdk-v2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { type Connection, PublicKey } from "@solana/web3.js";
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
 * CLMM is a concentrated-liquidity AMM (Uniswap V3 model). Unlike CPMM's
 * fixed 13-account swap, CLMM needs **dynamic tick-array accounts** that
 * depend on the current pool price — analogous to Meteora DLMM's bin arrays.
 *
 * `build()` follows the same pattern as the Raydium SDK's own
 * `Clmm.swap()` (see raydium-sdk-V2/src/raydium/clmm/clmm.ts), but without
 * the wallet/ATA-management layer — Tributary owns the intermediates:
 *
 * 1. Read pool_state + ammConfig + tick-array bitmap extension from RPC.
 * 2. Fetch tick arrays via the SDK's `fetchTickArrays()` (handles bitmap
 *    logic + batch fetch internally).
 * 3. Run the SDK's swap simulation (`PoolUtils.getOutputAmountAndRemainAccounts`)
 *    to determine which tick arrays the swap crosses + the expected output.
 * 4. Compute `otherAmountThreshold` (min output) = expected × (1 − slippage).
 * 5. Build `swap_v2` via `ClmmInstrument.swapV2Instruction`.
 *
 * Account layout for `swap_v2`:
 *
 * | idx | account                  | source                              |
 * |-----|--------------------------|-------------------------------------|
 * | 0   | payer                    | composablePolicyPda (CPI signer)    |
 * | 1   | ammConfig                | opts.ammConfig                      |
 * | 2   | poolId                   | opts.pool                           |
 * | 3   | inputTokenAccount        | ATA(composablePolicyPda, inputMint) |
 * | 4   | outputTokenAccount       | ATA(composablePolicyPda, outputMint)|
 * | 5   | inputVault               | pool.vault{A|B} (from pool_state)   |
 * | 6   | outputVault              | pool.vault{A|B} (from pool_state)   |
 * | 7   | observationId            | pool.observationId (from pool_state)|
 * | 8   | TOKEN_PROGRAM_ID         |                                     |
 * | 9   | TOKEN_2022_PROGRAM_ID    |                                     |
 * | 10  | MEMO_PROGRAM_ID          |                                     |
 * | 11  | inputTokenMint           |                                     |
 * | 12  | outputTokenMint          |                                     |
 * | 13  | tickArrayBitmapExtension | getPdaExBitmapAccount(CLMM, pool)   |
 * | 14+ | tickArray[]              | simulation-determined               |
 *
 * Vault + observation addresses are taken FROM the pool_state account
 * (matching the SDK's `makeSwapBaseInInstructions` pattern) rather than
 * derived — the stored values are authoritative.
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
      const poolId = opts.pool;

      // ── 1. Read pool_state + ammConfig + bitmap extension ────────
      const poolAccount = await connection.getAccountInfo(poolId, "confirmed");
      if (!poolAccount?.data) {
        throw new Error(`CLMM pool ${poolId.toBase58()} not found`);
      }
      const poolState = PoolInfoLayout.decode(poolAccount.data);

      const configAccount = await connection.getAccountInfo(
        opts.ammConfig,
        "confirmed"
      );
      if (!configAccount?.data) {
        throw new Error(
          `CLMM ammConfig ${opts.ammConfig.toBase58()} not found`
        );
      }
      const configState = ClmmConfigLayout.decode(configAccount.data);

      const exBitmapPda = getPdaExBitmapAccount(
        RAYDIUM_CLMM_PUBKEY,
        poolId
      ).publicKey;
      const exBitmapAccount = await connection.getAccountInfo(
        exBitmapPda,
        "confirmed"
      );
      const exBitmapInfo = exBitmapAccount?.data
        ? TickArrayBitmapExtensionLayout.decode(exBitmapAccount.data)
        : TickArrayBitmapExtensionLayout.decode(Buffer.alloc(120, 0));

      // ── 2. Determine swap direction + fetch tick arrays ──────────
      // Use the SDK's fetchTickArrays() — it handles the bitmap logic
      // (findTickArrayAddress) + batch fetch internally. Matches the
      // pattern in Clmm.swap() / PoolUtils.fetchMultiplePoolTickArrays.
      const isInputMintA = poolState.mintA.equals(inputMint);
      const zeroForOne = isInputMintA; // selling A → price goes down

      const tickArrays = await fetchTickArrays(
        RAYDIUM_CLMM_PUBKEY,
        connection,
        poolId,
        poolState.tickCurrent,
        poolState.tickSpacing,
        poolState.tickArrayBitmap,
        zeroForOne
      );

      if (tickArrays.length === 0) {
        throw new Error(
          "No initialized tick arrays found near the current tick — pool may have no liquidity"
        );
      }

      // ── 3. Run swap simulation ───────────────────────────────────
      // Build ComputeClmmPoolInfo from raw RPC data. The SDK's type
      // expects ApiV3Token/Decimal (from REST API); we construct the
      // structurally-compatible shape from on-chain data. Runtime
      // correctness is verified by the simulation itself.
      const blockTimestamp = Math.floor(Date.now() / 1000);

      const tickArrayCache: Record<
        string,
        ReturnType<typeof TickArrayLayout.decode> & { address: PublicKey }
      > = {};
      for (const ta of tickArrays) {
        tickArrayCache[ta.value.startTickIndex] = {
          ...ta.value,
          address: ta.address,
        };
      }

      const computePoolInfo = {
        accInfo: poolState,
        id: poolId,
        version: 6,
        mintA: {
          address: poolState.mintA.toBase58(),
          decimals: poolState.mintDecimalsA,
          programId: TOKEN_PROGRAM_ID,
        },
        mintB: {
          address: poolState.mintB.toBase58(),
          decimals: poolState.mintDecimalsB,
          programId: TOKEN_PROGRAM_ID,
        },
        vaultA: poolState.vaultA,
        vaultB: poolState.vaultB,
        ammConfig: {
          id: opts.ammConfig,
          index: configState.index,
          tradeFeeRate: configState.tradeFeeRate,
          protocolFeeRate: configState.protocolFeeRate,
          fundFeeRate: configState.fundFeeRate,
          tickSpacing: configState.tickSpacing,
          fundOwner: configState.fundOwner,
        },
        observationId: poolState.observationId,
        exBitmapAccount: exBitmapPda,
        creator: poolState.creator,
        programId: RAYDIUM_CLMM_PUBKEY,
        tickSpacing: poolState.tickSpacing,
        liquidity: poolState.liquidity,
        sqrtPriceX64: poolState.sqrtPriceX64,
        currentPrice: null,
        tickCurrent: poolState.tickCurrent,
        feeGrowthGlobalX64A: poolState.feeGrowthGlobalX64A,
        feeGrowthGlobalX64B: poolState.feeGrowthGlobalX64B,
        protocolFeesTokenA: poolState.protocolFeesTokenA,
        protocolFeesTokenB: poolState.protocolFeesTokenB,
        tickArrayBitmap: poolState.tickArrayBitmap,
        startTime: poolState.startTime.toNumber(),
        exBitmapInfo,
        rewardInfos: poolState.rewardInfos,
      } as any;

      const { expectedAmountOut, remainingAccounts } =
        PoolUtils.getOutputAmountAndRemainAccounts(
          computePoolInfo,
          exBitmapInfo,
          tickArrayCache,
          inputMint,
          face,
          blockTimestamp
        );

      if (!remainingAccounts || remainingAccounts.length === 0) {
        throw new Error(
          "CLMM swap simulation returned no tick arrays — swap may be too large for available liquidity"
        );
      }

      // ── 4. Compute min output (slippage) ─────────────────────────
      const minOut = expectedAmountOut
        .muln(10_000 - opts.slippageBps)
        .divn(10_000);

      // ── 5. Build swap_v2 instruction ─────────────────────────────
      // Vault + observation addresses from pool_state (authoritative),
      // matching the SDK's makeSwapBaseInInstructions pattern.
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

      const sqrtPriceLimitX64 = isInputMintA
        ? MIN_SQRT_PRICE_X64.add(new BN(1))
        : MAX_SQRT_PRICE_X64.sub(new BN(1));

      const swapIx = ClmmInstrument.swapV2Instruction(
        RAYDIUM_CLMM_PUBKEY,
        composablePolicyPda,
        poolId,
        opts.ammConfig,
        userInputAccount,
        userOutputAccount,
        isInputMintA ? poolState.vaultA : poolState.vaultB,
        isInputMintA ? poolState.vaultB : poolState.vaultA,
        isInputMintA ? poolState.mintA : poolState.mintB,
        isInputMintA ? poolState.mintB : poolState.mintA,
        remainingAccounts,
        poolState.observationId,
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
