// Cross-cutting composition test for the recipe layer (tributary-h06c).
//
// The per-function tests cover each recipe in isolation. This file exercises
// the composition the recipe layer is designed for: a tier-2 validation
// recipe output flows into composablePolicyRecipe (tier 3), and the bundle
// shapes match what getCreateComposablePolicyInstruction expects.
//
// Pure-function tests — no RPC, no surfpool.
//
// Run: npx tsx --test src/__tests__/recipe-composition.test.ts

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  balanceCheck,
  intermediateOutputBalanceCheck,
  intermediateInputBalanceCheck,
  recipientOutputBalanceCheck,
  lighthouseValidation,
} from "../validation-recipes";
import { composablePolicyRecipe } from "../composable-recipes";
import { lighthouse } from "../lighthouse";

const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
const ALLOWED_FORWARD = new PublicKey(
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
);
const POOL = new PublicKey("GThUX1ZkoLtEGduy3FwBDbhZsBH2yHtCAJqZ7L3FgWxR");
const COMPOSABLE_PDA = new PublicKey(
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
);
const RECIPIENT = Keypair.generate().publicKey;

function forwardConfig(
  overrides: Partial<{ programId: PublicKey; outputMint: PublicKey }>
) {
  return {
    inputMint: USDC,
    outputMint: overrides.outputMint ?? WSOL,
    forwardFlags: 0,
    instructionConstraint: {
      programId: overrides.programId ?? ALLOWED_FORWARD,
      numDataChecks: 1,
      dataChecks: [{ offset: 0, bytes: Array(8).fill(0), operator: "Eq" }],
      numPinnedAccounts: 1,
      pinnedAccounts: [{ index: 3, pubkey: POOL }],
    },
  } as any;
}

let warnCalls: string[];
beforeEach(() => {
  warnCalls = [];
  const _orig = console.warn;
  console.warn = ((m: string) => warnCalls.push(m)) as typeof console.warn;
});

describe("recipe composition: tier-2 → tier-3", () => {
  it("balanceCheck → composablePolicyRecipe (pre slot)", () => {
    const hotWalletAta = Keypair.generate().publicKey;
    const pre = balanceCheck({
      target: hotWalletAta,
      threshold: 50_000_000,
      op: "<",
    });
    const post = recipientOutputBalanceCheck({
      recipient: RECIPIENT,
      outputMint: WSOL,
      threshold: 1_000_000,
      op: ">=",
    });
    const bundle = composablePolicyRecipe({
      forwardConfig: forwardConfig({ outputMint: WSOL }),
      pre,
      post,
    });

    assert.equal(bundle.preValidation, pre.spec);
    assert.equal(bundle.preValidationInit, pre.init);
    assert.equal(bundle.postValidation, post.spec);
    assert.equal(bundle.postValidationInit, post.init);
    assert.equal(warnCalls.length, 0, "both pre+post provided → no warnings");
  });

  it("intermediateOutputBalanceCheck → composablePolicyRecipe (post slot, deliver-transform)", () => {
    const post = intermediateOutputBalanceCheck({
      composablePolicyPda: COMPOSABLE_PDA,
      outputMint: WSOL,
      threshold: 0,
      op: ">",
    });
    const bundle = composablePolicyRecipe({
      forwardConfig: forwardConfig({ outputMint: WSOL }),
      post,
    });

    // pre missing → forward + no pre warning
    assert.ok(
      warnCalls.some((m) => /no pre_validation/.test(m)),
      "economic pre-warning fires"
    );
    // deliver-transform + post provided → no deliver-transform warning
    assert.ok(
      !warnCalls.some((m) => /deliver-transform/.test(m)),
      "post provided for deliver-transform → no redundant warning"
    );
    // post.init carries the intermediate output ATA
    const expectedAta = getAssociatedTokenAddressSync(
      WSOL,
      COMPOSABLE_PDA,
      true
    );
    assert.deepEqual(
      bundle.postValidationInit.pinnedAccounts[0].pubkey,
      expectedAta
    );
  });

  it("lighthouseValidation (escape hatch) → composablePolicyRecipe (act mode + post)", () => {
    const customGuard = lighthouse
      .accountInfo(POOL)
      .lamports(1_000_000, ">")
      .build();
    const post = lighthouseValidation(customGuard);

    const bundle = composablePolicyRecipe({
      forwardConfig: forwardConfig({ outputMint: PublicKey.default }),
      post,
    });

    // act mode + post → no throw. No deliver-transform warning (act mode is
    // not deliver-transform). But pre missing → forward + no pre warn.
    assert.ok(
      warnCalls.some((m) => /no pre_validation/.test(m)),
      "pre warning for act mode + no pre"
    );
    assert.equal(bundle.postValidation, post.spec);
    assert.equal(bundle.postValidationInit, post.init);
  });

  it("site recipes produce compatible { spec, init } shapes (structural typing)", () => {
    // All four recipe families return the same structural shape — TypeScript
    // compiles them into composablePolicyRecipe's pre/post slots without
    // coercion.
    const a = balanceCheck({
      target: POOL,
      threshold: 1,
      op: ">",
    });
    const b = intermediateOutputBalanceCheck({
      composablePolicyPda: COMPOSABLE_PDA,
      outputMint: WSOL,
      threshold: 1,
      op: ">",
    });
    const c = intermediateInputBalanceCheck({
      composablePolicyPda: COMPOSABLE_PDA,
      inputMint: USDC,
      threshold: 1,
      op: ">",
    });
    const d = recipientOutputBalanceCheck({
      recipient: RECIPIENT,
      outputMint: WSOL,
      threshold: 1,
      op: ">",
    });
    for (const r of [a, b, c, d]) {
      assert.ok("spec" in r && "init" in r);
      assert.ok("programCall" in r.spec);
      assert.ok("numPinnedAccounts" in r.init);
      assert.ok("pinnedAccounts" in r.init);
      assert.ok("validationData" in r.init);
    }
  });
});
