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
  PolicyType,
  ValidationInit,
  ValidationRecipeOutput,
  ValidationSpec,
} from "@tributary-so/sdk";
import {
  composablePolicyRecipe,
  recipientOutputBalanceCheck,
  type IntegerOperator,
  type IntOpString,
} from "@tributary-so/sdk";
import { RAYDIUM_CLMM_PUBKEY } from "./constants";
import {
  raydiumClmmForwardConfig,
  RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR,
  type RaydiumClmmForwardConfigOptions,
} from "./config/raydium-clmm";
export {
  raydiumClmmForwardConfig,
  RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR,
  type RaydiumClmmForwardConfigOptions,
} from "./config/raydium-clmm";

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

// ── Named recipe: createSwapWhenBalanceLow ────────────────────────────
// Composes the three tiers (tributary-69jm) into a single create bundle:
// tier-1 `raydiumClmmForwardConfig` + `createRaydiumClmmForward`, tier-2
// `recipientOutputBalanceCheck` (the "balance low" trigger), tier-3
// `composablePolicyRecipe` (enforcement). The integrator provides only
// accounts + programId; the recipe wires everything else.

/**
 * The `create` half of {@link createSwapWhenBalanceLow} — everything
 * `getCreateComposablePolicyInstruction` consumes, bundled.
 */
export interface ClmmSwapWhenBalanceLowCreateBundle {
  policyType: PolicyType;
  memo: string;
  recipient: PublicKey;
  forwardConfig: ForwardConfig;
  preValidation: ValidationSpec;
  preValidationInit: ValidationInit;
  postValidation: ValidationSpec;
  postValidationInit: ValidationInit;
}

/**
 * Options for {@link createSwapWhenBalanceLow} (CLMM variant).
 */
export interface CreateClmmSwapWhenBalanceLowOptions {
  // ── Policy identity ──
  policyType: PolicyType;
  /** Memo (max 32 bytes encoded). */
  memo: string;
  recipient: PublicKey;

  // ── Forward params (tier 1) ──
  inputMint: PublicKey;
  outputMint: PublicKey;
  /** CLMM pool to swap through. Pinned on-chain at `pinnedAccounts[0]`. */
  pool: PublicKey;
  /** CLMM amm-config (fee tier). Pinned on-chain at `pinnedAccounts[1]`. */
  ammConfig: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /** Forward to `raydiumClmmForwardConfig` (WSOL → native SOL unwrap). */
  unwrapNativeSol?: boolean;

  // ── Validation params (tier 2) ──
  /**
   * The recipient's output ATA balance is checked pre-swap; the policy
   * only fires when `amount op threshold` holds (e.g. `<` threshold →
   * top up). This is the "balance low" trigger.
   */
  threshold: number | bigint;
  op: IntegerOperator | IntOpString;
  /**
   * Optional post-validation recipe (e.g. a floor on swapped output).
   * Defaults to none — `composablePolicyRecipe` will warn that a
   * deliver-transform swap lacks a post floor (economic, not security).
   */
  post?: ValidationRecipeOutput | null;
  /** Escape hatch: suppress the act-mode-no-post throw. */
  allowUnsafeActMode?: boolean;
}

/**
 * Build a complete "swap when the recipient's balance is low" composable
 * policy bundle for Raydium CLMM.
 *
 * The canonical auto-topup recipe: pull `inputMint` from the user, swap it
 * for `outputMint` via the pinned CLMM pool, and deliver to `recipient` —
 * but only when the recipient's output ATA balance has dropped below
 * `threshold`. Composes all three tiers so the integrator needs only
 * `tokenMint` + `gateway` + programId at create time.
 *
 * Returns:
 * - `create` — the argument bundle for `getCreateComposablePolicyInstruction`
 *   (`policyType`, `memo`, `recipient`, `forwardConfig`, pre/post spec+init).
 * - `forwardBuilder` — the fire-time CLMM swap builder for
 *   `buildComposableExecutionPayload`.
 */
export function createSwapWhenBalanceLow(
  opts: CreateClmmSwapWhenBalanceLowOptions
): {
  create: ClmmSwapWhenBalanceLowCreateBundle;
  forwardBuilder: ForwardBuilder;
} {
  const forwardConfig = raydiumClmmForwardConfig({
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    pool: opts.pool,
    ammConfig: opts.ammConfig,
    unwrapNativeSol: opts.unwrapNativeSol,
  });

  const pre = recipientOutputBalanceCheck({
    recipient: opts.recipient,
    outputMint: opts.outputMint,
    threshold: opts.threshold,
    op: opts.op,
  });

  const recipe = composablePolicyRecipe({
    forwardConfig,
    pre,
    post: opts.post,
    allowUnsafeActMode: opts.allowUnsafeActMode,
  });

  const forwardBuilder = createRaydiumClmmForward({
    pool: opts.pool,
    ammConfig: opts.ammConfig,
    slippageBps: opts.slippageBps,
  });

  return {
    create: {
      policyType: opts.policyType,
      memo: opts.memo,
      recipient: opts.recipient,
      ...recipe,
    },
    forwardBuilder,
  };
}
