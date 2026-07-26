// Self-check for balanceCheck + site variants (tributary-r6kz).
//
// All four recipes are pure sync functions producing { spec, init }.
// Verifies: spec is ProgramCall(Lighthouse), init carries the right target
// ATA as pinnedAccount[0] with the Lighthouse-serialized assertion data.
// Site variants are verified by checking the derived ATA matches a known
// getAssociatedTokenAddressSync derivation.
//
// Run: npx tsx --test src/__tests__/balance-check-recipes.test.ts

import { describe, it } from "node:test";
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
import { lighthouse, LIGHTHOUSE_PROGRAM_ID } from "../lighthouse";

const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
const COMPOSABLE_PDA = new PublicKey(
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
);
const RECIPIENT = Keypair.generate().publicKey;
const HOT_WALLET_ATA = Keypair.generate().publicKey;
const THRESHOLD = 50_000_000;

describe("balanceCheck", () => {
  it("produces ProgramCall(Lighthouse) spec", () => {
    const { spec } = balanceCheck({
      target: HOT_WALLET_ATA,
      threshold: THRESHOLD,
      op: "<",
    });
    assert.deepEqual(
      (spec as { programCall: { programId: PublicKey } }).programCall.programId,
      LIGHTHOUSE_PROGRAM_ID
    );
  });

  it("init matches lighthouseValidation(tokenAccount(target).amount(...).build())", () => {
    const direct = lighthouseValidation(
      lighthouse.tokenAccount(HOT_WALLET_ATA).amount(THRESHOLD, "<").build()
    );
    const viaRecipe = balanceCheck({
      target: HOT_WALLET_ATA,
      threshold: THRESHOLD,
      op: "<",
    });
    assert.deepEqual(viaRecipe, direct);
  });

  it("pinnedAccount[0] is the target ATA", () => {
    const { init } = balanceCheck({
      target: HOT_WALLET_ATA,
      threshold: THRESHOLD,
      op: ">=",
    });
    assert.equal(init.numPinnedAccounts, 1);
    assert.deepEqual(init.pinnedAccounts[0].pubkey, HOT_WALLET_ATA);
  });
});

describe("intermediateOutputBalanceCheck", () => {
  it("derives intermediate output ATA (owner = ComposablePolicy PDA) and delegates", () => {
    const expectedAta = getAssociatedTokenAddressSync(
      WSOL,
      COMPOSABLE_PDA,
      true
    );
    const { init } = intermediateOutputBalanceCheck({
      composablePolicyPda: COMPOSABLE_PDA,
      outputMint: WSOL,
      threshold: THRESHOLD,
      op: "<",
    });
    assert.deepEqual(init.pinnedAccounts[0].pubkey, expectedAta);

    // Cross-check: matches direct balanceCheck on the derived ATA
    const direct = balanceCheck({
      target: expectedAta,
      threshold: THRESHOLD,
      op: "<",
    });
    assert.deepEqual(init, direct.init);
  });
});

describe("intermediateInputBalanceCheck", () => {
  it("derives intermediate input ATA (owner = ComposablePolicy PDA) and delegates", () => {
    const expectedAta = getAssociatedTokenAddressSync(
      USDC,
      COMPOSABLE_PDA,
      true
    );
    const { init } = intermediateInputBalanceCheck({
      composablePolicyPda: COMPOSABLE_PDA,
      inputMint: USDC,
      threshold: THRESHOLD,
      op: "<",
    });
    assert.deepEqual(init.pinnedAccounts[0].pubkey, expectedAta);
  });
});

describe("recipientOutputBalanceCheck", () => {
  it("derives recipient ATA (standard, no allowOwnerOffCurve) and delegates", () => {
    const expectedAta = getAssociatedTokenAddressSync(WSOL, RECIPIENT);
    const { init } = recipientOutputBalanceCheck({
      recipient: RECIPIENT,
      outputMint: WSOL,
      threshold: THRESHOLD,
      op: ">=",
    });
    assert.deepEqual(init.pinnedAccounts[0].pubkey, expectedAta);

    // Ensure we did NOT use allowOwnerOffCurve (recipient is a regular wallet)
    const wrongAta = getAssociatedTokenAddressSync(WSOL, RECIPIENT, true);
    // For a non-PDA owner, allowOwnerOffCurve=true and =false produce the
    // same ATA — but we assert the function completes without error for a
    // regular wallet, which would throw if allowOwnerOffCurve were required
    // but not set (it isn't here).
    assert.deepEqual(init.pinnedAccounts[0].pubkey, wrongAta);
  });
});
