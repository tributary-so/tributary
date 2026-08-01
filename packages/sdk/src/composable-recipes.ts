/**
 * Composable policy recipe (tier 3) — setup bundle + enforcement
 * (tributary-69jm).
 *
 * {@link composablePolicyRecipe} takes a forward config + optional pre/post
 * validation recipe outputs (`{ spec, init }`) and produces the complete
 * argument bundle for `createComposablePolicy`, applying the enforcement
 * posture:
 *
 * | Combo                                      | Behavior                              |
 * |--------------------------------------------|---------------------------------------|
 * | act mode + no post-validation              | THROW (allowUnsafeActMode to override)|
 * | deliver-transform + no post-validation     | warn (redundant — program guards >0)  |
 * | deliver-no-transform + no post-validation  | silent (program sweeps)               |
 * | any forward + no pre-validation            | warn (economic, not security)         |
 *
 * Missing pre/post slots are filled with disabled spec + empty init.
 */

import { PublicKey } from "@solana/web3.js";
import { makeValidationInit } from "./sdk";
import type { ValidationInit } from "./validation-recipes";
import type { ForwardConfig, ValidationSpec } from "./types";

/** A recipe-produced validation phase: spec + on-chain init struct. */
export interface ValidationRecipeOutput {
  spec: ValidationSpec;
  init: ValidationInit;
}

/** Input to {@link composablePolicyRecipe}. */
export interface ComposablePolicyRecipeInput {
  forwardConfig: ForwardConfig;
  /** Pre-validation recipe output (e.g. from `balanceCheck`, `lighthouseValidation`). */
  pre?: ValidationRecipeOutput | null;
  /** Post-validation recipe output. */
  post?: ValidationRecipeOutput | null;
  /** Escape hatch: suppress the act-mode-no-post throw. */
  allowUnsafeActMode?: boolean;
}

/** Output of {@link composablePolicyRecipe} — the `createComposablePolicy` arg bundle. */
export interface ComposablePolicyRecipeOutput {
  forwardConfig: ForwardConfig;
  preValidation: ValidationSpec;
  preValidationInit: ValidationInit;
  postValidation: ValidationSpec;
  postValidationInit: ValidationInit;
}

const ACT_MODE_NO_POST_THROW =
  "composablePolicyRecipe: act mode (sentinel outputMint) + forward enabled requires " +
  "post-validation. Act mode has no on-chain output guard — post_validation is the " +
  "only backstop on the external settlement account. Pass allowUnsafeActMode: true to override.";

const DELIVER_TRANSFORM_NO_POST_WARN =
  "[Tributary] deliver-transform composable policy created without post_validation. " +
  "The program guards output > 0, but post_validation gives the owner a floor on the " +
  "swapped output amount.";

const FORWARD_NO_PRE_WARN =
  "[Tributary] composable policy with forward enabled but no pre_validation. " +
  "This is an economic gap (not a security issue) — without a pre-check the forward " +
  "may execute under unfavorable conditions.";

function disabledSpec(): ValidationSpec {
  return { disabled: {} };
}

function disabledInit(): ValidationInit {
  return makeValidationInit([], Buffer.alloc(0));
}

/**
 * Build the `createComposablePolicy` argument bundle from a forward config
 * + optional validation recipe outputs, applying the enforcement posture
 * (throw security-critical, warn economic gaps).
 *
 * Determines the settlement shape from the forward config:
 * - **act mode**: forward enabled + `outputMint == PublicKey.default()` —
 *   no fungible output; post_validation is the only delivery backstop.
 * - **deliver-transform**: forward enabled + `outputMint != inputMint` —
 *   forward swaps input → output before delivery.
 * - **deliver-no-transform**: forward disabled OR same-mint — direct sweep.
 *
 * Pure except for `console.warn` side-effects on economic gaps.
 */
export function composablePolicyRecipe(
  input: ComposablePolicyRecipeInput
): ComposablePolicyRecipeOutput {
  const { forwardConfig, pre, post, allowUnsafeActMode = false } = input;

  const forwardEnabled = !forwardConfig.instructionConstraint.programId.equals(
    PublicKey.default
  );
  const isActMode =
    forwardEnabled && forwardConfig.outputMint.equals(PublicKey.default);
  const isDeliverTransform =
    forwardEnabled &&
    !isActMode &&
    !forwardConfig.outputMint.equals(forwardConfig.inputMint);

  const hasPre = pre != null;
  const hasPost = post != null;

  if (isActMode && !hasPost && !allowUnsafeActMode) {
    throw new Error(ACT_MODE_NO_POST_THROW);
  }

  if (isDeliverTransform && !hasPost) {
    console.warn(DELIVER_TRANSFORM_NO_POST_WARN);
  }

  if (forwardEnabled && !hasPre) {
    console.warn(FORWARD_NO_PRE_WARN);
  }

  return {
    forwardConfig,
    preValidation: hasPre ? pre!.spec : disabledSpec(),
    preValidationInit: hasPre ? pre!.init : disabledInit(),
    postValidation: hasPost ? post!.spec : disabledSpec(),
    postValidationInit: hasPost ? post!.init : disabledInit(),
  };
}
