// Self-check for composablePolicyRecipe (tributary-p3tf).
//
// Exercises every enforcement branch and the default-fill logic:
//   act mode + no post → throw (unless allowUnsafeActMode)
//   deliver-transform + no post → warn
//   deliver-no-transform + no post → silent
//   forward + no pre → warn
//   pre/post provided → pass-through, no warnings
//
// Run: npx tsx --test src/__tests__/composable-policy-recipe.test.ts

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import {
  composablePolicyRecipe,
  type ValidationRecipeOutput,
} from "../composable-recipes";
import { makeValidationInit } from "../sdk";
import type { ForwardConfig, ValidationSpec } from "../types";

const INPUT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
const OUTPUT_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
const ALLOWED_FORWARD = new PublicKey(
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
);
const POOL = new PublicKey("GThUX1ZkoLtEGduy3FwBDbhZsBH2yHtCAJqZ7L3FgWxR");

type CfgOverrides = Partial<{
  programId: PublicKey;
  outputMint: PublicKey;
}>;

function forwardConfig(o: CfgOverrides = {}): ForwardConfig {
  return {
    inputMint: INPUT_MINT,
    outputMint: o.outputMint ?? OUTPUT_MINT,
    forwardFlags: 0,
    instructionConstraint: {
      programId: o.programId ?? ALLOWED_FORWARD,
      numDataChecks: 1,
      dataChecks: [{ offset: 0, bytes: Array(8).fill(0), operator: "Eq" }],
      numPinnedAccounts: 1,
      pinnedAccounts: [{ index: 3, pubkey: POOL }],
    },
  } as unknown as ForwardConfig;
}

function recipeOutput(
  overrides: Partial<ValidationRecipeOutput> = {}
): ValidationRecipeOutput {
  const spec: ValidationSpec = overrides.spec ?? {
    programCall: { programId: PublicKey.default },
  };
  return {
    spec,
    init: overrides.init ?? makeValidationInit([], Buffer.alloc(0)),
  };
}

let warnCalls: string[];
let originalWarn: typeof console.warn;

beforeEach(() => {
  warnCalls = [];
  originalWarn = console.warn;
  console.warn = ((msg: string) => warnCalls.push(msg)) as typeof console.warn;
});

describe("composablePolicyRecipe — settlement shape + enforcement", () => {
  it("act mode + no post → throws", () => {
    assert.throws(
      () =>
        composablePolicyRecipe({
          forwardConfig: forwardConfig({ outputMint: PublicKey.default }),
        }),
      /act mode.*requires post-validation/
    );
    assert.equal(warnCalls.length, 0, "no warn emitted before throw");
  });

  it("act mode + no post + allowUnsafeActMode → does not throw, still warns economic gap (no pre)", () => {
    const out = composablePolicyRecipe({
      forwardConfig: forwardConfig({ outputMint: PublicKey.default }),
      allowUnsafeActMode: true,
    });
    assert.ok(out, "returns bundle");
    assert.ok(
      warnCalls.some((m) => /no pre_validation/.test(m)),
      "forward + no pre warning emitted"
    );
  });

  it("act mode + post provided → no throw; forward+no-pre warn still fires", () => {
    const post = recipeOutput();
    composablePolicyRecipe({
      forwardConfig: forwardConfig({ outputMint: PublicKey.default }),
      post,
    });
    assert.ok(
      warnCalls.some((m) => /no pre_validation/.test(m)),
      "forward enabled + no pre → economic warn"
    );
    assert.ok(
      !warnCalls.some((m) => /deliver-transform/.test(m)),
      "not deliver-transform"
    );
  });

  it("deliver-transform + no post → warns (redundant)", () => {
    composablePolicyRecipe({
      forwardConfig: forwardConfig({ outputMint: OUTPUT_MINT }),
    });
    assert.ok(
      warnCalls.some((m) => /deliver-transform.*post_validation/.test(m)),
      "deliver-transform warning"
    );
    assert.ok(
      warnCalls.some((m) => /no pre_validation/.test(m)),
      "forward + no pre warning also fires"
    );
  });

  it("deliver-no-transform (forward disabled) + no post → silent", () => {
    composablePolicyRecipe({
      forwardConfig: forwardConfig({ programId: PublicKey.default }),
    });
    assert.equal(
      warnCalls.length,
      0,
      "forward disabled → no economic warnings"
    );
  });

  it("deliver-no-transform (same mint) + no post → silent", () => {
    composablePolicyRecipe({
      forwardConfig: forwardConfig({ outputMint: INPUT_MINT }),
    });
    // Same-mint + forward enabled is deliver-no-transform. No post → silent.
    // But forward enabled + no pre → warn fires.
    assert.ok(
      !warnCalls.some((m) => /deliver-transform/.test(m)),
      "no deliver-transform warning for same-mint"
    );
    assert.ok(
      warnCalls.some((m) => /no pre_validation/.test(m)),
      "forward + no pre warning still fires"
    );
  });

  it("forward + pre provided → no pre warning", () => {
    composablePolicyRecipe({
      forwardConfig: forwardConfig({ outputMint: OUTPUT_MINT }),
      pre: recipeOutput(),
    });
    assert.ok(
      !warnCalls.some((m) => /no pre_validation/.test(m)),
      "pre provided → no pre warning"
    );
  });
});

describe("composablePolicyRecipe — default fill + pass-through", () => {
  it("missing pre/post → disabled spec + empty init", () => {
    const out = composablePolicyRecipe({
      forwardConfig: forwardConfig({ programId: PublicKey.default }),
    });
    assert.deepEqual(
      out.preValidation,
      { disabled: {} },
      "pre defaults to disabled"
    );
    assert.deepEqual(
      out.postValidation,
      { disabled: {} },
      "post defaults to disabled"
    );
    assert.equal(out.preValidationInit.numPinnedAccounts, 0);
    assert.equal(out.postValidationInit.numPinnedAccounts, 0);
    assert.equal(out.preValidationInit.validationData.length, 0);
    assert.equal(out.postValidationInit.validationData.length, 0);
  });

  it("provided pre/post → pass-through", () => {
    const preSpec: ValidationSpec = {
      programCall: { programId: PublicKey.default },
    };
    const postSpec: ValidationSpec = {
      programCall: { programId: PublicKey.default },
    };
    const preInit = makeValidationInit([POOL], Buffer.from([1, 2]));
    const postInit = makeValidationInit([POOL], Buffer.from([3, 4]));
    const out = composablePolicyRecipe({
      forwardConfig: forwardConfig({ programId: PublicKey.default }),
      pre: { spec: preSpec, init: preInit },
      post: { spec: postSpec, init: postInit },
    });
    assert.equal(out.preValidation, preSpec);
    assert.equal(out.postValidation, postSpec);
    assert.equal(out.preValidationInit, preInit);
    assert.equal(out.postValidationInit, postInit);
  });

  it("forwardConfig pass-through", () => {
    const cfg = forwardConfig({ programId: PublicKey.default });
    const out = composablePolicyRecipe({ forwardConfig: cfg });
    assert.equal(out.forwardConfig, cfg);
  });
});
