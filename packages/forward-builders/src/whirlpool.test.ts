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
import * as crypto from "crypto";

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
  whirlpoolForwardConfig,
  WHIRLPOOL_SWAP_V2_DISCRIMINATOR,
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

// ── whirlpoolForwardConfig ─────────────────────────────────────────

/**
 * Build a fake whirlpool account buffer with the two token mints at the
 * known offsets (tokenMintA at 101, tokenMintB at 181). All other bytes
 * are zero.
 */
function fakePoolAccount(tokenMintA: PublicKey, tokenMintB: PublicKey): Buffer {
  const buf = Buffer.alloc(500, 0);
  tokenMintA.toBuffer().copy(buf, 101);
  tokenMintB.toBuffer().copy(buf, 181);
  return buf;
}

function fakeConnection(poolData: Buffer): any {
  return {
    getAccountInfo: async (pubkey: PublicKey) => {
      if (pubkey.equals(POOL)) {
        return { data: poolData };
      }
      return null;
    },
  };
}

describe("whirlpoolForwardConfig", () => {
  test("discriminator equals sha256('global:swap_v2')[0..8]", () => {
    const expected = Array.from(
      crypto
        .createHash("sha256")
        .update("global:swap_v2")
        .digest()
        .subarray(0, 8)
    );
    expect(Array.from(WHIRLPOOL_SWAP_V2_DISCRIMINATOR)).toEqual(expected);
  });

  test("pins programId = WHIRLPOOL, pool at index 4, and mints", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const cfg = await whirlpoolForwardConfig(fakeConnection(poolData), {
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    expect(cfg.instructionConstraint.programId.equals(WHIRLPOOL_PUBKEY)).toBe(
      true
    );
    expect(cfg.instructionConstraint.numPinnedAccounts).toBe(1);
    expect(cfg.instructionConstraint.pinnedAccounts[0]!.index).toBe(4);
    expect(
      cfg.instructionConstraint.pinnedAccounts[0]!.pubkey.equals(POOL)
    ).toBe(true);
    expect(
      cfg.inputMint.equals(INPUT_MINT) && cfg.outputMint.equals(OUTPUT_MINT)
    ).toBe(true);
    expect(cfg.forwardFlags).toBe(0);
  });

  test("pins swap_v2 discriminator at dataChecks[0] (offset 0, length 8)", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const cfg = await whirlpoolForwardConfig(fakeConnection(poolData), {
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    expect(cfg.instructionConstraint.numDataChecks).toBe(3);
    const check = cfg.instructionConstraint.dataChecks[0]!;
    expect(check.offset).toBe(0);
    expect(check.length).toBe(8);
    expect(Array.from(check.expected)).toEqual([
      ...WHIRLPOOL_SWAP_V2_DISCRIMINATOR,
    ]);
  });

  test("pins exact-in byte at dataChecks[1] (offset 40, length 1, 0x01)", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const cfg = await whirlpoolForwardConfig(fakeConnection(poolData), {
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    const check = cfg.instructionConstraint.dataChecks[1]!;
    expect(check.offset).toBe(40);
    expect(check.length).toBe(1);
    expect(Array.from(check.expected)).toEqual([0x01]);
  });

  test("pins aToB=0x01 at dataChecks[2] when inputMint == pool tokenMintA", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const cfg = await whirlpoolForwardConfig(fakeConnection(poolData), {
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    const check = cfg.instructionConstraint.dataChecks[2]!;
    expect(check.offset).toBe(41);
    expect(check.length).toBe(1);
    expect(Array.from(check.expected)).toEqual([0x01]);
  });

  test("pins aToB=0x00 at dataChecks[2] when inputMint == pool tokenMintB", async () => {
    // Pool has mints in [OUTPUT_MINT, INPUT_MINT] order — so inputMint=B → aToB=false
    const poolData = fakePoolAccount(OUTPUT_MINT, INPUT_MINT);
    const cfg = await whirlpoolForwardConfig(fakeConnection(poolData), {
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    const check = cfg.instructionConstraint.dataChecks[2]!;
    expect(Array.from(check.expected)).toEqual([0x00]);
  });

  test("sets FORWARD_FLAG_NATIVE_OUTPUT (bit 0) when unwrapNativeSol=true", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const cfg = await whirlpoolForwardConfig(fakeConnection(poolData), {
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      unwrapNativeSol: true,
    });
    expect(cfg.forwardFlags).toBe(1);
    expect(cfg.outputMint.equals(OUTPUT_MINT)).toBe(true);
  });

  test("rejects input mint not matching either pool mint", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const wrongMint = new PublicKey(
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"
    );
    await expect(
      whirlpoolForwardConfig(fakeConnection(poolData), {
        inputMint: wrongMint,
        outputMint: OUTPUT_MINT,
        pool: POOL,
      })
    ).rejects.toThrow(/does not match pool's complementary mint/);
  });

  test("rejects output mint not matching the complementary pool mint", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const wrongMint = new PublicKey(
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"
    );
    await expect(
      whirlpoolForwardConfig(fakeConnection(poolData), {
        inputMint: INPUT_MINT,
        outputMint: wrongMint,
        pool: POOL,
      })
    ).rejects.toThrow(/does not match pool's complementary mint/);
  });

  test("throws when pool account is not found", async () => {
    const conn = {
      getAccountInfo: async () => null,
    };
    await expect(
      whirlpoolForwardConfig(conn as any, {
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        pool: POOL,
      })
    ).rejects.toThrow(/Whirlpool account not found/);
  });
});
