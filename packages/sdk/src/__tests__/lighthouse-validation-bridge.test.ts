// Self-check for lighthouseValidation bridge (tributary-ezpd).
//
// Pure function: LighthouseAssertion → { spec, init }. Verifies the spec
// points at LIGHTHOUSE_PROGRAM_ID, the init carries the assertion's
// accounts (indexed) + data verbatim, and the escape-hatch contract holds
// (any LighthouseAssertion is accepted, including hand-built ones).
//
// Run: npx tsx --test src/__tests__/lighthouse-validation-bridge.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PublicKey, type AccountMeta } from "@solana/web3.js";
import {
  lighthouseValidation,
  programCallSpec,
  type ValidationInit,
} from "../validation-recipes";
import { LIGHTHOUSE_PROGRAM_ID } from "../lighthouse";
import { makeValidationInit } from "../sdk";

const TARGET_A = new PublicKey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
const TARGET_B = new PublicKey("4Nd1mYbz1NQYxoCKAwSVBz6NXRvV8HgqQzaHWwCLo7Rb");
const SOME_PROGRAM = new PublicKey(
  "GThUX1ZkoLtEGduy3FwBDbhZsBH2yHtCAJqZ7L3FgWxR"
);

function fakeGuard(
  overrides: Partial<{ data: Buffer; accounts: AccountMeta[] }> = {}
): import("../lighthouse").LighthouseAssertion {
  return {
    data: overrides.data ?? Buffer.from([1, 2, 3, 4]),
    numAccounts: overrides.accounts?.length ?? 1,
    accounts: overrides.accounts ?? [
      { pubkey: TARGET_A, isSigner: false, isWritable: false },
    ],
  };
}

describe("programCallSpec", () => {
  it("returns { programCall: { programId } } for the given program", () => {
    const spec = programCallSpec(SOME_PROGRAM);
    assert.deepEqual(
      (spec as { programCall: { programId: PublicKey } }).programCall.programId,
      SOME_PROGRAM
    );
  });
});

describe("lighthouseValidation", () => {
  it("spec points at LIGHTHOUSE_PROGRAM_ID", () => {
    const { spec } = lighthouseValidation(fakeGuard());
    assert.deepEqual(
      (spec as { programCall: { programId: PublicKey } }).programCall.programId,
      LIGHTHOUSE_PROGRAM_ID
    );
  });

  it("init matches makeValidationInit(guard.accounts.pubkeys, guard.data) — single target", () => {
    const guard = fakeGuard();
    const { init } = lighthouseValidation(guard);
    const expected: ValidationInit = makeValidationInit([TARGET_A], guard.data);
    assert.deepEqual(init, expected);
  });

  it("init carries multiple targets indexed positionally", () => {
    const guard = fakeGuard({
      accounts: [
        { pubkey: TARGET_A, isSigner: false, isWritable: false },
        { pubkey: TARGET_B, isSigner: false, isWritable: true },
      ],
      data: Buffer.from([0xde, 0xad]),
    });
    const { init } = lighthouseValidation(guard);
    assert.equal(init.numPinnedAccounts, 2);
    assert.equal(init.pinnedAccounts[0].index, 0);
    assert.deepEqual(init.pinnedAccounts[0].pubkey, TARGET_A);
    assert.equal(init.pinnedAccounts[1].index, 1);
    assert.deepEqual(init.pinnedAccounts[1].pubkey, TARGET_B);
    assert.deepEqual(Array.from(init.validationData), [0xde, 0xad]);
  });

  it("escape hatch: accepts any hand-built LighthouseAssertion (zero accounts)", () => {
    const guard = fakeGuard({
      accounts: [],
      data: Buffer.alloc(0),
    });
    const { spec, init } = lighthouseValidation(guard);
    assert.ok(
      "programCall" in spec,
      "spec still ProgramCall (Lighthouse accepts 0-account assertions like sysvar clock)"
    );
    assert.equal(init.numPinnedAccounts, 0);
  });
});
