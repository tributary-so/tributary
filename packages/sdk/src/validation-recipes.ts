/**
 * Validation recipe layer (tier 2) — pure functions that produce
 * `{ spec: ValidationSpec, init: ValidationInit }` pairs for composable
 * policy validation phases (tributary-69jm).
 *
 * A recipe bundles the two things `createComposablePolicy` needs for a
 * validation hook: the {@link ValidationSpec} (which program to call, or
 * disabled) and the {@link ValidationInit} (the pinned-account list +
 * assertion data stored in the ValidationPda).
 *
 * Day-one scope:
 * - {@link lighthouseValidation} — bridge from a built {@link LighthouseAssertion}
 *   to `{ spec, init }`. Also the escape hatch for custom assertions not
 *   yet recipe'd.
 * - {@link balanceCheck} — generic SPL token-account amount assertion.
 * - {@link intermediateOutputBalanceCheck} / {@link intermediateInputBalanceCheck}
 *   / {@link recipientOutputBalanceCheck} — site variants that derive the
 *   ATA internally (pure sync math) then delegate to {@link balanceCheck}.
 */

import type { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
  type IntegerOperator,
  type IntOpString,
  type LighthouseAssertion,
} from "./lighthouse";
import { makeValidationInit } from "./sdk";
import type { ValidationSpec } from "./types";

/**
 * The on-chain pinned-account + assertion-data struct produced by
 * {@link makeValidationInit}. Stored in the ValidationPda at policy
 * creation and read back by {@link resolveValidationTargets} at execution.
 */
export type ValidationInit = ReturnType<typeof makeValidationInit>;

/**
 * Construct a `ProgramCall` validation spec pointing at `programId`.
 *
 * The generic builder for every validation recipe — site recipes
 * (`balanceCheck`, `recipientOutputBalanceCheck`, …) delegate here after
 * deriving their target accounts.
 */
export function programCallSpec(programId: PublicKey): ValidationSpec {
  return { programCall: { programId } };
}

/**
 * Bridge a built {@link LighthouseAssertion} into a `{ spec, init }` pair
 * suitable for `createComposablePolicy`'s `preValidation` / `postValidation`
 * phase.
 *
 * This is also the **escape hatch** for custom assertions that don't have a
 * dedicated recipe yet — build the assertion via the `lighthouse` facade
 * (`packages/sdk/src/lighthouse.ts`) and pass it here.
 *
 * Pure function — no I/O. The assertion's `accounts` are mapped to their
 * pubkeys and indexed by `makeValidationInit`; the assertion `data` is
 * stored verbatim in the ValidationPda.
 */
export function lighthouseValidation(guard: LighthouseAssertion): {
  spec: ValidationSpec;
  init: ValidationInit;
} {
  return {
    spec: programCallSpec(LIGHTHOUSE_PROGRAM_ID),
    init: makeValidationInit(
      guard.accounts.map((a) => a.pubkey),
      guard.data
    ),
  };
}

// ─── Balance check recipes ──────────────────────────────────────────────

/**
 * Assert that an SPL token account's `amount` field satisfies `threshold op`.
 *
 * Wraps `lighthouse.tokenAccount(target).amount(threshold, op).build()` →
 * {@link lighthouseValidation}. Pure function — no I/O.
 *
 * @example Threshold top-up guard (fires when balance drops below 50 USDC)
 * ```ts
 * balanceCheck({ target: hotWalletAta, threshold: 50_000_000, op: "<" })
 * ```
 */
export function balanceCheck(args: {
  target: PublicKey;
  threshold: number | bigint;
  op: IntegerOperator | IntOpString;
}): { spec: ValidationSpec; init: ValidationInit } {
  const guard = lighthouse
    .tokenAccount(args.target)
    .amount(args.threshold, args.op)
    .build();
  return lighthouseValidation(guard);
}

/**
 * Site variant: assert the intermediate **output** ATA balance (owned by
 * the ComposablePolicy PDA). Derives the ATA via
 * `getAssociatedTokenAddressSync(outputMint, composablePolicyPda, true)`,
 * then delegates to {@link balanceCheck}.
 */
export function intermediateOutputBalanceCheck(args: {
  composablePolicyPda: PublicKey;
  outputMint: PublicKey;
  threshold: number | bigint;
  op: IntegerOperator | IntOpString;
}): { spec: ValidationSpec; init: ValidationInit } {
  const target = getAssociatedTokenAddressSync(
    args.outputMint,
    args.composablePolicyPda,
    true // allowOwnerOffCurve — ComposablePolicy is a PDA
  );
  return balanceCheck({
    target,
    threshold: args.threshold,
    op: args.op,
  });
}

/**
 * Site variant: assert the intermediate **input** ATA balance (owned by
 * the ComposablePolicy PDA). Derives the ATA via
 * `getAssociatedTokenAddressSync(inputMint, composablePolicyPda, true)`,
 * then delegates to {@link balanceCheck}.
 */
export function intermediateInputBalanceCheck(args: {
  composablePolicyPda: PublicKey;
  inputMint: PublicKey;
  threshold: number | bigint;
  op: IntegerOperator | IntOpString;
}): { spec: ValidationSpec; init: ValidationInit } {
  const target = getAssociatedTokenAddressSync(
    args.inputMint,
    args.composablePolicyPda,
    true
  );
  return balanceCheck({
    target,
    threshold: args.threshold,
    op: args.op,
  });
}

/**
 * Site variant: assert the **recipient's** output ATA balance. Derives the
 * ATA via `getAssociatedTokenAddressSync(outputMint, recipient)`, then
 * delegates to {@link balanceCheck}.
 */
export function recipientOutputBalanceCheck(args: {
  recipient: PublicKey;
  outputMint: PublicKey;
  threshold: number | bigint;
  op: IntegerOperator | IntOpString;
}): { spec: ValidationSpec; init: ValidationInit } {
  const target = getAssociatedTokenAddressSync(args.outputMint, args.recipient);
  return balanceCheck({
    target,
    threshold: args.threshold,
    op: args.op,
  });
}
