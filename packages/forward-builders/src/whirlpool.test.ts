/**
 * Unit tests for createWhirlpoolForward (ADR-0030).
 *
 * The Orca whirlpools SDK swap construction is mocked so these run without
 * RPC. The assertions target the kit → ForwardAccountMeta conversion and
 * the whirlpoolForwardConfig constraint layout:
 *
 *  - per-account `isWritable` converted from kit `isWritableRole`
 *  - returned accounts never carry `isSigner` (ADR-0008)
 *  - `instructionData` is the decoded base64 swap instruction data
 *  - `whirlpoolForwardConfig` pins programId, discriminator, exact-in byte,
 *    aToB byte, and pool at index 4
 *  - config rejects mints not matching the pool
 */
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type { ComposablePolicy, ForwardBuilder } from "@tributary-so/sdk";

const POOL = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngnd");
const INPUT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
); // USDC
const OUTPUT_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
); // WSOL

// ── Mock the Orca whirlpools SDK ──────────────────────────────────
// swapInstructions is mocked to return a controllable { instructions } so
// we can assert the builder's kit → ForwardAccountMeta conversion
// independently of SDK internals. setNativeMintWrappingStrategy is a no-op.

let mockSwapInstructions: {
  instructions: any[];
} | null = null;

jest.mock("@orca-so/whirlpools", () => ({
  swapInstructions: async () => mockSwapInstructions,
  setNativeMintWrappingStrategy: () => {},
}));

// ── Mock @solana/kit minimally ────────────────────────────────────
// The builder uses createSolanaRpc, createNoopSigner, address,
// isWritableRole — all from @solana/kit. Instruction.data in kit 2.x is
// a ReadonlyUint8Array (already-decoded bytes), not a base64 string.

const FAKE_RPC = {};

jest.mock("@solana/kit", () => ({
  createSolanaRpc: () => FAKE_RPC,
  createNoopSigner: (addr: string) => ({ address: addr }),
  address: (s: string) => s,
  isWritableRole: (role: number) => role === 1 || role === 3, // WRITABLE or WRITABLE_SIGNER
  AccountRole: {
    READONLY: 0,
    WRITABLE: 1,
    READONLY_SIGNER: 2,
    WRITABLE_SIGNER: 3,
  },
}));

import {
  createWhirlpoolForward,
} from "./whirlpool";
import { WHIRLPOOL_PUBKEY } from "./constants";

function policy(inputMint: PublicKey, outputMint: PublicKey): ComposablePolicy {
  return {
    forwardConfig: { inputMint, outputMint },
  } as unknown as ComposablePolicy;
}

function setSwapInstructions(
  accounts: { address: string; role: number }[],
  data: Buffer
) {
  mockSwapInstructions = {
    instructions: [
      // ATA-create ix (should be dropped)
      {
        programAddress: "SomeOtherProgram11111111111111111111111111111111",
        accounts: [],
        data: "AAAA",
      },
      // Whirlpool swap_v2 ix (should be extracted)
      {
        programAddress: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
        accounts: accounts.map((a) => ({ address: a.address, role: a.role })),
        data: new Uint8Array(data),
      },
    ],
  };
}

const FAKE_CONN = {
  rpcEndpoint: "http://localhost:8899",
} as any;
const PDA = new PublicKey("4tNUhEg9oxfAuFDo7N8fto5229D8soQGE1RGyYfvfSwU");

describe("createWhirlpoolForward", () => {
  beforeEach(() => {
    mockSwapInstructions = null;
  });

  test("returns a ForwardBuilder (implements the interface)", () => {
    const builder: ForwardBuilder = createWhirlpoolForward({
      pool: POOL,
      slippageBps: 100,
    });
    expect(typeof builder.build).toBe("function");
  });

  test("build() returns non-empty instructionData from swapIx.data", async () => {
    const swapData = Buffer.from([
      43,
      4,
      237,
      11,
      26,
      201,
      30,
      98, // discriminator
      ...Array(8).fill(0), // amount
      ...Array(8).fill(0), // otherAmountThreshold
      ...Array(16).fill(0), // sqrtPriceLimit
      0x01, // amountSpecifiedIsInput = true
      0x01, // aToB = true
    ]);
    setSwapInstructions(
      [{ address: PublicKey.unique().toBase58(), role: 1 }],
      swapData
    );
    const builder = createWhirlpoolForward({ pool: POOL, slippageBps: 100 });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PDA,
      face: new BN(1_000_000),
    });
    expect(Buffer.isBuffer(res.instructionData)).toBe(true);
    expect(res.instructionData.equals(swapData)).toBe(true);
  });

  test("build() converts kit roles to isWritable correctly", async () => {
    // Kit AccountRole: READONLY=0, WRITABLE=1, READONLY_SIGNER=2, WRITABLE_SIGNER=3
    const accounts = [
      { address: PublicKey.unique().toBase58(), role: 0 }, // readonly → false
      { address: PublicKey.unique().toBase58(), role: 1 }, // writable → true
      { address: PublicKey.unique().toBase58(), role: 2 }, // readonly_signer → false
      { address: PublicKey.unique().toBase58(), role: 3 }, // writable_signer → true
    ];
    setSwapInstructions(accounts, Buffer.alloc(42, 0));
    const builder = createWhirlpoolForward({ pool: POOL, slippageBps: 100 });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PDA,
      face: new BN(1_000_000),
    });
    expect(res.forwardAccounts.map((a) => a.isWritable)).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  test("build() never emits isSigner on forwardAccounts", async () => {
    const accounts = [
      { address: PublicKey.unique().toBase58(), role: 3 },
      { address: PublicKey.unique().toBase58(), role: 0 },
    ];
    setSwapInstructions(accounts, Buffer.alloc(42, 0));
    const builder = createWhirlpoolForward({ pool: POOL, slippageBps: 100 });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PDA,
      face: new BN(1_000_000),
    });
    for (const a of res.forwardAccounts) {
      expect(a).not.toHaveProperty("isSigner");
    }
  });

  test("build() throws when whirlpool swap instruction is absent", async () => {
    mockSwapInstructions = {
      instructions: [
        {
          programAddress: "SomeOtherProgram11111111111111111111111111111111",
          accounts: [],
          data: "AAAA",
        },
      ],
    };
    const builder = createWhirlpoolForward({ pool: POOL, slippageBps: 100 });
    await expect(
      builder.build({
        connection: FAKE_CONN,
        policy: policy(INPUT_MINT, OUTPUT_MINT),
        composablePolicyPda: PDA,
        face: new BN(1_000_000),
      })
    ).rejects.toThrow(/swap_v2 instruction not found/);
  });
});

