// Self-check for buildComposableExecutionPayload (tributary-54ob, ADR-0030 §1
// amended).
//
// The orchestrator is a straight-line composition of four primitives:
// isForwardEnabled → ForwardBuilder.build → resolveValidationTargets(pre/post)
// → assembleComposableRemainingAccounts. This test exercises each branch of
// the composition with fakes — no Anchor, no real RPC.
//
// Run: npx tsx --test src/__tests__/build-composable-execution-payload.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PublicKey, type Connection, type AccountMeta } from "@solana/web3.js";
import BN from "bn.js";
import {
  buildComposableExecutionPayload,
  type ForwardAccountMeta,
  type ForwardBuilder,
} from "../composable";
import { getPreValidationPda, getPostValidationPda } from "../pda";

// Deterministic test keys.
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
const PROGRAM_ID = new PublicKey("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");
const COMPOSABLE_PDA = new PublicKey(
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
);

// Hand-derive the pre/post ValidationPda addresses for PROGRAM_ID so the
// fake connection can assert routing. Mirrors pda.ts seed layout.
const PRE_VALIDATION_PDA = getPreValidationPda(
  COMPOSABLE_PDA,
  PROGRAM_ID
).address;
const POST_VALIDATION_PDA = getPostValidationPda(
  COMPOSABLE_PDA,
  PROGRAM_ID
).address;

type PolicyShape = Parameters<
  typeof buildComposableExecutionPayload
>[0]["policy"];

function policy(): PolicyShape {
  return {
    forwardConfig: {
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      forwardFlags: 0,
      instructionConstraint: {
        programId: ALLOWED_FORWARD,
        numDataChecks: 1,
        dataChecks: [{ offset: 0, bytes: Array(8).fill(0), operator: "Eq" }],
        numPinnedAccounts: 1,
        pinnedAccounts: [{ index: 3, pubkey: POOL }],
      },
    },
    preValidation: { disabled: {} },
    postValidation: { disabled: {} },
  } as unknown as PolicyShape;
}

function nullConnection(): Connection {
  return { getAccountInfo: async () => null } as unknown as Connection;
}

function recordingConnection(calls: string[]): Connection {
  return {
    getAccountInfo: async (pk: PublicKey) => {
      calls.push(pk.toBase58());
      return null;
    },
  } as unknown as Connection;
}

function fakeBuilder(
  result: { instructionData: Buffer; forwardAccounts: ForwardAccountMeta[] },
  captured: Array<{ face: BN; pda: PublicKey }> = []
): ForwardBuilder {
  return {
    build: async (ctx) => {
      captured.push({ face: ctx.face, pda: ctx.composablePolicyPda });
      return result;
    },
  };
}

describe("buildComposableExecutionPayload", () => {
  it("forward disabled + both validations disabled → empty payload, builder ignored", async () => {
    const p = policy();
    p.forwardConfig!.instructionConstraint.programId = PublicKey.default;

    const captured: Array<{ face: BN; pda: PublicKey }> = [];
    const builder = fakeBuilder(
      {
        instructionData: Buffer.from([9]),
        forwardAccounts: [{ pubkey: POOL, isWritable: true }],
      },
      captured
    );

    const res = await buildComposableExecutionPayload({
      connection: nullConnection(),
      policy: p,
      composablePolicyPda: COMPOSABLE_PDA,
      programId: PROGRAM_ID,
      forwardBuilder: builder,
      face: new BN(1_000),
    });

    assert.equal(res.instructionData.length, 0, "instructionData empty");
    assert.equal(res.remainingAccounts.length, 0, "no remaining accounts");
    assert.equal(
      captured.length,
      0,
      "builder not invoked when forward disabled"
    );
  });

  it("forward enabled + builder supplied → builder called with caller-resolved face + pda; forward slice preserved in order, isSigner:false", async () => {
    const fwdAccounts: ForwardAccountMeta[] = [
      { pubkey: POOL, isWritable: true },
      { pubkey: ALLOWED_FORWARD, isWritable: false },
    ];
    const captured: Array<{ face: BN; pda: PublicKey }> = [];
    const builder = fakeBuilder(
      { instructionData: Buffer.from([1, 2, 3]), forwardAccounts: fwdAccounts },
      captured
    );

    const res = await buildComposableExecutionPayload({
      connection: nullConnection(),
      policy: policy(),
      composablePolicyPda: COMPOSABLE_PDA,
      programId: PROGRAM_ID,
      forwardBuilder: builder,
      face: new BN(5_000),
    });

    assert.deepEqual(Array.from(res.instructionData), [1, 2, 3]);
    assert.deepEqual(
      captured,
      [{ face: new BN(5_000), pda: COMPOSABLE_PDA }],
      "builder invoked exactly once with caller-resolved face + pda"
    );
    assert.deepEqual(
      res.remainingAccounts.map((m: AccountMeta) => ({
        pubkey: m.pubkey.toBase58(),
        isSigner: m.isSigner,
        isWritable: m.isWritable,
      })),
      [
        { pubkey: POOL.toBase58(), isSigner: false, isWritable: true },
        {
          pubkey: ALLOWED_FORWARD.toBase58(),
          isSigner: false,
          isWritable: false,
        },
      ],
      "forward accounts preserved in program-declared order with isSigner:false"
    );
  });

  it("forward enabled + no builder → throws", async () => {
    await assert.rejects(
      () =>
        buildComposableExecutionPayload({
          connection: nullConnection(),
          policy: policy(),
          composablePolicyPda: COMPOSABLE_PDA,
          programId: PROGRAM_ID,
          face: new BN(1),
        }),
      /forward is enabled on the policy but no forwardBuilder was supplied/
    );
  });

  it("ProgramCall pre+post → both ValidationPdas queried (routing contract); empty validation slices collapse to forward-only", async () => {
    const p = policy();
    p.preValidation = { programCall: { programId: PublicKey.default } };
    p.postValidation = { programCall: { programId: PublicKey.default } };

    const fwdAccounts: ForwardAccountMeta[] = [
      { pubkey: POOL, isWritable: true },
    ];
    // Return null for both ValidationPdas → resolveValidationTargets yields
    // [] (its "missing/unreadable → []" contract). We are NOT re-testing
    // parseValidationPda here — only that the orchestrator routes both
    // phases through resolveValidationTargets with the right PDA + phase.
    const queried: string[] = [];

    const res = await buildComposableExecutionPayload({
      connection: recordingConnection(queried),
      policy: p,
      composablePolicyPda: COMPOSABLE_PDA,
      programId: PROGRAM_ID,
      forwardBuilder: fakeBuilder({
        instructionData: Buffer.alloc(0),
        forwardAccounts: fwdAccounts,
      }),
      face: new BN(1),
    });

    assert.ok(
      queried.includes(PRE_VALIDATION_PDA.toBase58()),
      "pre ValidationPda queried"
    );
    assert.ok(
      queried.includes(POST_VALIDATION_PDA.toBase58()),
      "post ValidationPda queried"
    );
    // Both pre/post resolved to [] (null account) → remaining slice is just
    // the forward accounts, in program-declared order, isSigner:false.
    assert.deepEqual(
      res.remainingAccounts.map((m) => ({
        pubkey: m.pubkey.toBase58(),
        isSigner: m.isSigner,
      })),
      [{ pubkey: POOL.toBase58(), isSigner: false }],
      "ADR-0016 order with empty validation slices"
    );
  });
});
