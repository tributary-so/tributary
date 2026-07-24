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
 *
 * Sibling recipes (`balanceCheck` + site variants) are added by
 * tributary-r6kz; `composablePolicyRecipe` (tier 3) is tributary-p3tf.
 */

import type { PublicKey } from "@solana/web3.js";
import { LIGHTHOUSE_PROGRAM_ID, type LighthouseAssertion } from "./lighthouse";
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
