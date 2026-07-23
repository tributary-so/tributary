// Self-check for act-mode post_validation warning (tributary-nog1, ADR-0031).
//
// Act mode has NO on-chain output guard — the owner's post_validation is the
// only backstop. The SDK emits a console.warn when an act-mode policy is
// created without one. The decision logic is a pure function; this test
// exercises it directly without Anchor plumbing.
//
// Run: npx tsx --test src/__tests__/act-mode-post-validation-warning.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { actModePostValidationWarning } from "../sdk";

// Deterministic test keys.
const ALLOWED_FORWARD = new PublicKey(
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
);
const INPUT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);
const OUTPUT_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112",
);
const POOL = new PublicKey("GThUX1ZkoLtEGduy3FwBDbhZsBH2yHtCAJqZ7L3FgWxR");

function forwardConfig(
  overrides: Partial<{
    programId: PublicKey;
    outputMint: PublicKey;
  }>,
): any {
  return {
    inputMint: INPUT_MINT,
    outputMint: overrides.outputMint ?? OUTPUT_MINT,
    forwardFlags: 0,
    instructionConstraint: {
      programId: overrides.programId ?? ALLOWED_FORWARD,
      numDataChecks: 1,
      dataChecks: [{ offset: 0, bytes: Array(8).fill(0), operator: "Eq" }],
      numPinnedAccounts: 1,
      pinnedAccounts: [{ index: 3, pubkey: POOL }],
    },
  };
}

describe("actModePostValidationWarning", () => {
  it("warns: act mode (sentinel outputMint) + forward enabled + no post_validation", () => {
    const cfg = forwardConfig({ outputMint: PublicKey.default });
    const msg = actModePostValidationWarning(cfg, { disabled: {} });
    assert.ok(msg, "expected a warning message");
    assert.match(msg!, /Act-mode composable policy/i);
    assert.match(msg!, /post_validation/i);
    assert.match(msg!, /docs\.tributary\.so/);
  });

  it("silent: act mode + post_validation ProgramCall present", () => {
    const cfg = forwardConfig({ outputMint: PublicKey.default });
    const msg = actModePostValidationWarning(cfg, {
      programCall: {
        programId: new PublicKey("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"),
      },
    });
    assert.equal(msg, null);
  });

  it("silent: deliver-transform (real outputMint) + no post_validation", () => {
    const cfg = forwardConfig({ outputMint: OUTPUT_MINT });
    const msg = actModePostValidationWarning(cfg, { disabled: {} });
    assert.equal(msg, null);
  });

  it("silent: deliver-no-transform (forward disabled) + sentinel outputMint", () => {
    // Sentinel outputMint without forward enabled is NOT act mode — the
    // program rejects this at create time. The warning should not fire.
    const cfg = forwardConfig({
      programId: PublicKey.default,
      outputMint: PublicKey.default,
    });
    const msg = actModePostValidationWarning(cfg, { disabled: {} });
    assert.equal(msg, null);
  });
});
