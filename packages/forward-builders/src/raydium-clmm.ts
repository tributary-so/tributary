import {
  ClmmInstrument,
  PoolInfoLayout,
  TickArrayLayout,
  TickArrayBitmapExtensionLayout,
  TickArrayBitmapUtil,
  PoolUtils,
  getPdaTickArrayAddress,
  getPdaPoolVaultId,
  getPdaObservationAccount,
  getPdaExBitmapAccount,
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
 * `build()` does (RPC-heavy, like the DLMM builder):
 *
 * 1. Read pool_state → decode via PoolInfoLayout (tickCurrent, tickSpacing,
 *    liquidity, sqrtPriceX64, tickArrayBitmap, vault addresses).
 * 2. Read the tick-array bitmap extension (may or may not exist).
 * 3. Find initialized tick arrays near the current tick (both directions).
 * 4. Fetch those tick arrays.
 * 5. Run the swap simulation (`PoolUtils.getOutputAmountAndRemainAccounts`)
 *    to determine exactly which tick arrays the swap crosses + the expected
 *    output amount.
 * 6. Compute `otherAmountThreshold` (min output) = expected * slippage.
 * 7. Build `swap_v2` via `ClmmInstrument.swapV2Instruction`.
 *
 * Account layout for `swap_v2`:
 *
 * | idx | account                     | source                                |
 * |-----|-----------------------------|---------------------------------------|
 * | 0   | payer                       | composablePolicyPda (CPI signer)      |
 * | 1   | ammConfig                   | opts.ammConfig                        |
 * | 2   | poolId                      | opts.pool                             |
 * | 3   | inputTokenAccount           | ATA(composablePolicyPda, inputMint)   |
 * | 4   | outputTokenAccount          | ATA(composablePolicyPda, outputMint)  |
 * | 5   | inputVault                  | pool.vault{A|B}                       |
 * | 6   | outputVault                 | pool.vault{A|B}                       |
 * | 7   | observationId               | getPdaObservationAccount(CLMM, pool)  |
 * | 8   | TOKEN_PROGRAM_ID            |                                       |
 * | 9   | TOKEN_2022_PROGRAM_ID       |                                       |
 * | 10  | MEMO_PROGRAM_ID             |                                       |
 * | 11  | inputTokenMint              | policy.forwardConfig.inputMint        |
 * | 12  | outputTokenMint             | policy.forwardConfig.outputMint       |
 * | 13  | tickArrayBitmapExtension    | getPdaExBitmapAccount(CLMM, pool)     |
 * | 14+ | tickArray[]                 | simulation-determined                 |
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

      // ── 1. Read + decode pool_state ──────────────────────────────
      const poolAccount = await connection.getAccountInfo(poolId, "confirmed");
      if (!poolAccount?.data) {
        throw new Error(`CLMM pool ${poolId.toBase58()} not found`);
      }
      const poolState = PoolInfoLayout.decode(poolAccount.data);

      const isInputMintA = poolState.mintA.equals(inputMint);
      const tickSpacing = poolState.tickSpacing;

      // ── 2. Read + decode tick-array bitmap extension ─────────────
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

      // ── 3. Find initialized tick arrays near the current tick ────
      // Both directions — the swap only needs one direction, but passing
      // extras is safe (the program ignores unused arrays).
      const startIndexArray = [
        ...TickArrayBitmapUtil.findTickArrayStartIndex({
          tickSpacing,
          poolBitmap: poolState.tickArrayBitmap,
          tickArrayBitmap: exBitmapInfo,
          findInfo: {
            type: "zeroForOne",
            count: 7,
            tickArrayCurrent: poolState.tickCurrent,
          },
        }),
        ...TickArrayBitmapUtil.findTickArrayStartIndex({
          tickSpacing,
          poolBitmap: poolState.tickArrayBitmap,
          tickArrayBitmap: exBitmapInfo,
          findInfo: {
            type: "oneForZero",
            count: 7,
            tickArrayCurrent: poolState.tickCurrent,
          },
        }),
      ];

      // ── 4. Fetch tick arrays ─────────────────────────────────────
      const tickArrayKeys: PublicKey[] = [];
      const tickArrayKeySet = new Set<string>();
      for (const startIndex of startIndexArray) {
        const { publicKey } = getPdaTickArrayAddress(
          RAYDIUM_CLMM_PUBKEY,
          poolId,
          startIndex
        );
        if (!tickArrayKeySet.has(publicKey.toBase58())) {
          tickArrayKeySet.add(publicKey.toBase58());
          tickArrayKeys.push(publicKey);
        }
      }

      const tickArrayAccounts = await connection.getMultipleAccountsInfo(
        tickArrayKeys
      );
      const tickArrayCache: Record<
        string,
        ReturnType<typeof TickArrayLayout.decode> & { address: PublicKey }
      > = {};
      for (let i = 0; i < tickArrayKeys.length; i++) {
        const acct = tickArrayAccounts[i];
        if (!acct?.data) continue;
        const decoded = TickArrayLayout.decode(acct.data);
        tickArrayCache[decoded.startTickIndex] = {
          ...decoded,
          address: tickArrayKeys[i],
        };
      }

      // ── 5. Run swap simulation to get remainingAccounts + output ─
      // getOutputAmountAndRemainAccounts: known input → expected output +
      // the tick arrays the swap crosses (swap_base_in semantics).
      // ponytail: cast to any — the SDK's ComputeClmmPoolInfo type expects
      // ApiV3Token (from the REST API) + Decimal fields that we build from
      // raw RPC data. The struct is structurally compatible; the types
      // diverge because the SDK assumes API-sourced pool info. Runtime
      // correctness is verified by the swap simulation itself.
      const blockTimestamp = Math.floor(Date.now() / 1000);
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
          index: 0,
          tradeFeeRate: 0,
          protocolFeeRate: 0,
          fundFeeRate: 0,
          tickSpacing,
          fundOwner: PublicKey.default,
        },
        observationId: poolState.observationId,
        exBitmapAccount: exBitmapPda,
        creator: poolState.creator,
        programId: RAYDIUM_CLMM_PUBKEY,
        tickSpacing,
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
          "CLMM swap simulation returned no tick arrays — pool may have no liquidity near the current tick"
        );
      }

      // ── 6. Compute min output (slippage) ────────────────────────
      const minOut = expectedAmountOut
        .muln(10_000 - opts.slippageBps)
        .divn(10_000);

      // ── 7. Build swap_v2 instruction ─────────────────────────────
      const inputVault = getPdaPoolVaultId(
        RAYDIUM_CLMM_PUBKEY,
        poolId,
        inputMint
      ).publicKey;
      const outputVault = getPdaPoolVaultId(
        RAYDIUM_CLMM_PUBKEY,
        poolId,
        outputMint
      ).publicKey;
      const observationId = getPdaObservationAccount(
        RAYDIUM_CLMM_PUBKEY,
        poolId
      ).publicKey;

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
        composablePolicyPda, // payer
        poolId,
        opts.ammConfig,
        userInputAccount,
        userOutputAccount,
        inputVault,
        outputVault,
        inputMint,
        outputMint,
        remainingAccounts, // tickArray[]
        observationId,
        face, // amount
        minOut, // otherAmountThreshold
        sqrtPriceLimitX64,
        true, // isBaseInput
        exBitmapPda // tickArrayBitmapExtension
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
  /** Input mint of the swap (debited from the user's delegate). */
  inputMint: PublicKey;
  /** Output mint of the swap (credited to the recipient). */
  outputMint: PublicKey;
  /** The CLMM pool to swap through. Pinned at `pinnedAccounts[0]` (index 2). */
  pool: PublicKey;
  /**
   * The CLMM amm-config (fee tier). Pinned at `pinnedAccounts[1]` (index 1).
   */
  ammConfig: PublicKey;
  /**
   * Sets bit 0 of `forward_flags` (`FORWARD_FLAG_NATIVE_OUTPUT`).
   * Off by default.
   */
  unwrapNativeSol?: boolean;
}

/**
 * Build the setup-time `ForwardConfig` that constrains a CLMM-swap composable
 * policy.
 *
 * Pins `programId = RAYDIUM_CLMM_PUBKEY`, two `pinnedAccounts` (poolId at
 * index 2 + ammConfig at index 1), and `dataChecks[0]` = the swap_v2
 * discriminator.
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
