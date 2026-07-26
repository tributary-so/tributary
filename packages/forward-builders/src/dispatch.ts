import type { ComposablePolicy, ForwardBuilder } from "@tributary-so/sdk";
import {
  createMeteoraDlmmForward,
  createRaydiumCpmmForward,
  createRaydiumClmmForward,
  createWhirlpoolForward,
} from "./index";
import {
  METEORA_DLMM_PUBKEY,
  RAYDIUM_CPMM_PUBKEY,
  RAYDIUM_CLMM_PUBKEY,
  WHIRLPOOL_PUBKEY,
} from "./constants";

/**
 * Options for {@link getForwardBuilderFor}.
 */
export interface ForwardBuilderDispatchOptions {
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /**
   * Meteora-only: rewrite the host-fee-in account from SystemProgram back
   * to the DLMM program id. See {@link createMeteoraDlmmForward}.
   */
  applyHostFeeInFix?: boolean;
}

/**
 * Dispatch a {@link ForwardBuilder} by reading the composable policy's
 * `instructionConstraint.programId` and matching it against the four
 * allowlisted forward programs.
 *
 * The pool is always at `pinnedAccounts[0].pubkey` in every config;
 * Raydium CPMM / CLMM additionally need `ammConfig` from
 * `pinnedAccounts[1].pubkey`.
 *
 * Throws an explicit error naming the program id if no builder matches —
 * this happens when the on-chain program is not in
 * `ALLOWED_FORWARD_PROGRAMS` or a new forward program is added to the
 * allowlist without a corresponding builder here.
 */
export function getForwardBuilderFor(
  policy: ComposablePolicy,
  opts: ForwardBuilderDispatchOptions
): ForwardBuilder {
  const ic = policy.forwardConfig.instructionConstraint;
  const programId = ic.programId;
  const pool = ic.pinnedAccounts[0]!.pubkey;

  if (programId.equals(METEORA_DLMM_PUBKEY)) {
    return createMeteoraDlmmForward({
      pool,
      slippageBps: opts.slippageBps,
      applyHostFeeInFix: opts.applyHostFeeInFix,
    });
  }

  if (programId.equals(RAYDIUM_CPMM_PUBKEY)) {
    const ammConfig = ic.pinnedAccounts[1]!.pubkey;
    return createRaydiumCpmmForward({
      pool,
      ammConfig,
      slippageBps: opts.slippageBps,
    });
  }

  if (programId.equals(RAYDIUM_CLMM_PUBKEY)) {
    const ammConfig = ic.pinnedAccounts[1]!.pubkey;
    return createRaydiumClmmForward({
      pool,
      ammConfig,
      slippageBps: opts.slippageBps,
    });
  }

  if (programId.equals(WHIRLPOOL_PUBKEY)) {
    return createWhirlpoolForward({
      pool,
      slippageBps: opts.slippageBps,
    });
  }

  throw new Error(
    `No ForwardBuilder for program ${programId.toBase58()} — ` +
      `not in ALLOWED_FORWARD_PROGRAMS or no builder registered`
  );
}
