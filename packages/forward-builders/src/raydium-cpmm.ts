import {
  makeSwapCpmmBaseInInstruction,
  getPdaPoolAuthority,
  getPdaVault,
  getPdaObservationId,
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
import { RAYDIUM_CPMM_PUBKEY } from "./constants";
import {
  raydiumCpmmForwardConfig,
} from "./config/raydium-cpmm";
export {
  raydiumCpmmForwardConfig,
  RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR,
  type RaydiumCpmmForwardConfigOptions,
} from "./config/raydium-cpmm";

/**
 * Options for {@link createRaydiumCpmmForward}.
 */
export interface RaydiumCpmmForwardOptions {
  /** The CPMM constant-product pool to swap through (PDA, pinned on-chain). */
  pool: PublicKey;
  /** The CPMM amm-config account — locks the fee tier (PDA, pinned on-chain). */
  ammConfig: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /**
   * Override the computed minimum-out. When omitted, the builder uses the
   * bps-floor default: `floor(face * (10000 - slippageBps) / 10000)`.
   * Supply your own for exact-quote strategies (requires an RPC reserve
   * read — left to the caller to keep `build()` RPC-light).
   */
  minimumAmountOut?: BN;
}

/**
 * Build a Raydium CPMM `swap_base_input` as a Tributary composable forward
 * step.
 *
 * CPMM is a constant-product AMM (x*y=k): the `swap_base_input` instruction
 * takes a known `amount_in` + `minimum_amount_out`, matching Tributary's
 * known-`face` forward model (we pull a fixed amount, not a target output).
 *
 * Account layout (13 fixed, no DLMM-style dynamic bin arrays):
 *
 * | idx | account            | source                                 |
 * |-----|--------------------|----------------------------------------|
 * | 0   | payer              | composablePolicyPda (CPI signer)       |
 * | 1   | authority          | getPdaPoolAuthority(programId)         |
 * | 2   | amm_config         | opts.ammConfig (fee tier)              |
 * | 3   | pool_state         | opts.pool                              |
 * | 4   | input_user_account | ATA(composablePolicyPda, inputMint)    |
 * | 5   | output_user_account| ATA(composablePolicyPda, outputMint)   |
 * | 6   | input_vault        | getPdaVault(programId, pool, inputMint)|
 * | 7   | output_vault       | getPdaVault(programId, pool, outputMint)|
 * | 8   | input_token_program| TOKEN_PROGRAM_ID                       |
 * | 9   | output_token_program| TOKEN_PROGRAM_ID                      |
 * | 10  | input_token_mint   | policy.forwardConfig.inputMint         |
 * | 11  | output_token_mint  | policy.forwardConfig.outputMint        |
 * | 12  | observation_state  | getPdaObservationId(programId, pool)   |
 *
 * All 13 accounts are pure PDA/ATA derivations — zero RPC calls in
 * `build()`. Unlike the Meteora builder, there is no host-fee SystemProgram
 * quirk to patch.
 *
 * Returns a {@link ForwardBuilder} whose `build()` returns:
 *
 * - `instructionData` — raw `swap_base_input` selector (8 B) + amount_in (8
 *   B) + minimum_amount_out (8 B) = 24 bytes.
 * - `forwardAccounts` — per-account `{ pubkey, isWritable }` from the swap
 *   instruction's account list. **No `isSigner` field** (ADR-0008).
 */
export function createRaydiumCpmmForward(
  opts: RaydiumCpmmForwardOptions
): ForwardBuilder {
  return {
    async build({
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

      const authority = getPdaPoolAuthority(RAYDIUM_CPMM_PUBKEY).publicKey;
      const inputVault = getPdaVault(
        RAYDIUM_CPMM_PUBKEY,
        opts.pool,
        inputMint
      ).publicKey;
      const outputVault = getPdaVault(
        RAYDIUM_CPMM_PUBKEY,
        opts.pool,
        outputMint
      ).publicKey;
      const observationId = getPdaObservationId(
        RAYDIUM_CPMM_PUBKEY,
        opts.pool
      ).publicKey;

      const userInputAccount = getAssociatedTokenAddressSync(
        inputMint,
        composablePolicyPda
      );
      const userOutputAccount = getAssociatedTokenAddressSync(
        outputMint,
        composablePolicyPda
      );

      const minOut =
        opts.minimumAmountOut ??
        face.muln(10_000 - opts.slippageBps).divn(10_000);

      const swapIx = makeSwapCpmmBaseInInstruction(
        RAYDIUM_CPMM_PUBKEY,
        composablePolicyPda,
        authority,
        opts.ammConfig,
        opts.pool,
        userInputAccount,
        userOutputAccount,
        inputVault,
        outputVault,
        TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        inputMint,
        outputMint,
        observationId,
        face,
        minOut
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
// tier-1 `raydiumCpmmForwardConfig` + `createRaydiumCpmmForward`, tier-2
// `recipientOutputBalanceCheck` (the "balance low" trigger), tier-3
// `composablePolicyRecipe` (enforcement). The integrator provides only
// accounts + programId; the recipe wires everything else.

/**
 * The `create` half of {@link createSwapWhenBalanceLow} — everything
 * `getCreateComposablePolicyInstruction` consumes, bundled.
 */
export interface CpmmSwapWhenBalanceLowCreateBundle {
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
 * Options for {@link createSwapWhenBalanceLow} (CPMM variant).
 */
export interface CreateCpmmSwapWhenBalanceLowOptions {
  // ── Policy identity ──
  policyType: PolicyType;
  /** Memo (max 32 bytes encoded). */
  memo: string;
  recipient: PublicKey;

  // ── Forward params (tier 1) ──
  inputMint: PublicKey;
  outputMint: PublicKey;
  /** CPMM pool to swap through. Pinned on-chain at `pinnedAccounts[0]` (index 3). */
  pool: PublicKey;
  /** CPMM amm-config (fee tier). Pinned on-chain at `pinnedAccounts[1]` (index 2). */
  ammConfig: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /** Forward to `raydiumCpmmForwardConfig` (WSOL → native SOL unwrap). */
  unwrapNativeSol?: boolean;
  /** Forward to `createRaydiumCpmmForward` (explicit min-out override). */
  minimumAmountOut?: BN;

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
 * policy bundle for Raydium CPMM.
 *
 * The canonical auto-topup recipe: pull `inputMint` from the user, swap it
 * for `outputMint` via the pinned CPMM pool, and deliver to `recipient` —
 * but only when the recipient's output ATA balance has dropped below
 * `threshold`. Composes all three tiers so the integrator needs only
 * `tokenMint` + `gateway` + programId at create time.
 *
 * Returns:
 * - `create` — the argument bundle for `getCreateComposablePolicyInstruction`
 *   (`policyType`, `memo`, `recipient`, `forwardConfig`, pre/post spec+init).
 * - `forwardBuilder` — the fire-time CPMM swap builder for
 *   `buildComposableExecutionPayload`.
 */
export function createSwapWhenBalanceLow(
  opts: CreateCpmmSwapWhenBalanceLowOptions
): {
  create: CpmmSwapWhenBalanceLowCreateBundle;
  forwardBuilder: ForwardBuilder;
} {
  const forwardConfig = raydiumCpmmForwardConfig({
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

  const forwardBuilder = createRaydiumCpmmForward({
    pool: opts.pool,
    ammConfig: opts.ammConfig,
    slippageBps: opts.slippageBps,
    minimumAmountOut: opts.minimumAmountOut,
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
