import DLMM from "@meteora-ag/dlmm";
import { PublicKey, SystemProgram, type Connection } from "@solana/web3.js";
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
import { METEORA_DLMM_PUBKEY } from "./constants";
import {
  meteoraDlmmForwardConfig,
  METEORA_DLMM_SWAP_DISCRIMINATOR,
  type MeteoraDlmmForwardConfigOptions,
} from "./config/meteora-dlmm";
export {
  meteoraDlmmForwardConfig,
  METEORA_DLMM_SWAP_DISCRIMINATOR,
  type MeteoraDlmmForwardConfigOptions,
} from "./config/meteora-dlmm";

/**
 * Options for {@link createMeteoraDlmmForward}.
 */
export interface MeteoraDlmmForwardOptions {
  /** The DLMM liquidity-bin pool to swap through. */
  pool: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /**
   * Rewrite the host-fee-in account from SystemProgram back to the DLMM
   * program id. Meteora declares the host-fee input as SystemProgram, which
   * silently disables the host-fee path. Enable this when the gateway is a
   * DLMM fee-host. Off by default.
   */
  applyHostFeeInFix?: boolean;
}

/**
 * Build a Meteora DLMM swap as a Tributary composable forward step.
 *
 * Returns a {@link ForwardBuilder} whose `build()` resolves the swap quote,
 * constructs the DLMM swap instruction, and returns it in the shape
 * `execute_composable` consumes:
 *
 * - `instructionData` — raw DLMM swap selector + args.
 * - `forwardAccounts` — per-account `{ pubkey, isWritable }` taken verbatim
 *   from the swap instruction's account list. **No `isSigner` field** — the
 *   SDK assembler stamps `isSigner: false` on every forward account,
 *   enforcing ADR-0008 (CPI signer sanitization).
 *
 * The builder receives `face` (the amount the forward consumes); the caller
 * resolves it via `resolveDefaultForwardAmount` or a manual override.
 */
export function createMeteoraDlmmForward(
  opts: MeteoraDlmmForwardOptions
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
      const dlmmPool = await DLMM.create(connection, opts.pool, {
        cluster: "mainnet-beta",
        skipSolWrappingOperation: true,
      });

      const inputMint = policy.forwardConfig.inputMint;
      const outputMint = policy.forwardConfig.outputMint;
      const swapForY = inputMint.equals(dlmmPool.tokenX.publicKey);
      const binArrays = await dlmmPool.getBinArrayForSwap(swapForY);
      const quote = dlmmPool.swapQuote(
        face,
        swapForY,
        new BN(opts.slippageBps),
        binArrays
      );

      const swapTx = await dlmmPool.swap({
        lbPair: opts.pool,
        inToken: inputMint,
        outToken: outputMint,
        inAmount: face,
        minOutAmount: quote.minOutAmount,
        user: composablePolicyPda,
        binArraysPubkey: quote.binArraysPubkey as PublicKey[],
      });

      const swapIx = swapTx.instructions.find((i) =>
        i.programId.equals(METEORA_DLMM_PUBKEY)
      );
      if (!swapIx) {
        throw new Error(
          "DLMM swap instruction not found in pool.swap() output"
        );
      }

      let keys = swapIx.keys;
      if (opts.applyHostFeeInFix) {
        keys = keys.map((k) =>
          k.pubkey.equals(SystemProgram.programId)
            ? { ...k, pubkey: METEORA_DLMM_PUBKEY }
            : k
        );
      }

      return {
        instructionData: Buffer.from(swapIx.data),
        forwardAccounts: keys.map((k) => ({
          pubkey: k.pubkey,
          isWritable: k.isWritable,
        })),
      };
    },
  };
}

// ── Named recipe: createSwapWhenBalanceLow ────────────────────
// Composes the three tiers (tributary-69jm) into a single create bundle:
// tier-1 `meteoraDlmmForwardConfig` + `createMeteoraDlmmForward`, tier-2
// `recipientOutputBalanceCheck` (the "balance low" trigger), tier-3
// `composablePolicyRecipe` (enforcement). The integrator provides only
// accounts + programId; the recipe wires everything else.

/**
 * The `create` half of {@link createSwapWhenBalanceLow} — everything
 * `getCreateComposablePolicyInstruction` consumes, bundled.
 */
export interface SwapWhenBalanceLowCreateBundle {
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
 * Options for {@link createSwapWhenBalanceLow}.
 */
export interface CreateSwapWhenBalanceLowOptions {
  // ── Policy identity ──
  policyType: PolicyType;
  /** Memo (max 32 bytes encoded). */
  memo: string;
  recipient: PublicKey;

  // ── Forward params (tier 1) ──
  inputMint: PublicKey;
  outputMint: PublicKey;
  /** DLMM pool to swap through. Pinned on-chain at `pinnedAccounts[0]`. */
  pool: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /** Forward to `meteoraDlmmForwardConfig` (WSOL → native SOL unwrap). */
  unwrapNativeSol?: boolean;
  /** Forward to `createMeteoraDlmmForward` (SystemProgram host-fee patch). */
  applyHostFeeInFix?: boolean;

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
 * policy bundle for Meteora DLMM.
 *
 * The canonical auto-topup recipe: pull `inputMint` from the user, swap it
 * for `outputMint` via the pinned DLMM pool, and deliver to `recipient` —
 * but only when the recipient's output ATA balance has dropped below
 * `threshold`. Composes all three tiers so the integrator needs only
 * `tokenMint` + `gateway` + programId at create time.
 *
 * Returns:
 * - `create` — the argument bundle for `getCreateComposablePolicyInstruction`
 *   (`policyType`, `memo`, `recipient`, `forwardConfig`, pre/post spec+init).
 * - `forwardBuilder` — the fire-time DLMM swap builder for
 *   `buildComposableExecutionPayload`.
 *
 * @example Top up a hot wallet with 50 USDC of WSOL when it drops below 50
 * ```ts
 * const { create, forwardBuilder } = createSwapWhenBalanceLow({
 *   policyType: { subscription: { amount: new BN(50_000_000), ... } },
 *   memo: "hot wallet WSOL topup",
 *   recipient: hotWallet,
 *   inputMint: USDC,
 *   outputMint: WSOL,
 *   pool: DLMM_POOL,
 *   slippageBps: 100,
 *   threshold: 50_000_000,
 *   op: "<",
 * });
 * ```
 */
export function createSwapWhenBalanceLow(
  opts: CreateSwapWhenBalanceLowOptions
): {
  create: SwapWhenBalanceLowCreateBundle;
  forwardBuilder: ForwardBuilder;
} {
  const forwardConfig = meteoraDlmmForwardConfig({
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    pool: opts.pool,
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

  const forwardBuilder = createMeteoraDlmmForward({
    pool: opts.pool,
    slippageBps: opts.slippageBps,
    applyHostFeeInFix: opts.applyHostFeeInFix,
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
