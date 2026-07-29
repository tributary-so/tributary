/**
 * Pure unit tests for the browser-safe `whirlpoolForwardConfig` constraint
 * builder. Lives next to src/config/whirlpool.ts and imports it directly —
 * proving the config module is venue-SDK-free (no @orca-so/@solana/kit mock
 * needed). The one setup-time RPC (getAccountInfo) is satisfied by a minimal
 * connection stub. See TRIBUTARY-WASM-FIX.md.
 */
import { type Connection, PublicKey } from "@solana/web3.js";
import * as crypto from "crypto";
import {
  whirlpoolForwardConfig,
  WHIRLPOOL_SWAP_V2_DISCRIMINATOR,
} from "./whirlpool";
import { WHIRLPOOL_PUBKEY } from "../constants";

const POOL = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngnd");
const INPUT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
); // USDC
const OUTPUT_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
); // WSOL

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

// Minimal connection stub: whirlpoolForwardConfig only calls getAccountInfo.
// Widened to the full Connection at the call boundary via `as unknown as`
// (the stub implements only the slice the config fn reads).
function fakeConnection(poolData: Buffer): {
  getAccountInfo: (pubkey: PublicKey) => Promise<{ data: Buffer } | null>;
} {
  return {
    getAccountInfo: async (pubkey: PublicKey) =>
      pubkey.equals(POOL) ? { data: poolData } : null,
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
    const cfg = await whirlpoolForwardConfig(
      fakeConnection(poolData) as unknown as Connection,
      {
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        pool: POOL,
      }
    );
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
    const cfg = await whirlpoolForwardConfig(
      fakeConnection(poolData) as unknown as Connection,
      {
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        pool: POOL,
      }
    );
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
    const cfg = await whirlpoolForwardConfig(
      fakeConnection(poolData) as unknown as Connection,
      {
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        pool: POOL,
      }
    );
    const check = cfg.instructionConstraint.dataChecks[1]!;
    expect(check.offset).toBe(40);
    expect(check.length).toBe(1);
    expect(Array.from(check.expected)).toEqual([0x01]);
  });

  test("pins aToB=0x01 at dataChecks[2] when inputMint == pool tokenMintA", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const cfg = await whirlpoolForwardConfig(
      fakeConnection(poolData) as unknown as Connection,
      {
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        pool: POOL,
      }
    );
    const check = cfg.instructionConstraint.dataChecks[2]!;
    expect(check.offset).toBe(41);
    expect(check.length).toBe(1);
    expect(Array.from(check.expected)).toEqual([0x01]);
  });

  test("pins aToB=0x00 at dataChecks[2] when inputMint == pool tokenMintB", async () => {
    // Pool has mints in [OUTPUT_MINT, INPUT_MINT] order — so inputMint=B → aToB=false
    const poolData = fakePoolAccount(OUTPUT_MINT, INPUT_MINT);
    const cfg = await whirlpoolForwardConfig(
      fakeConnection(poolData) as unknown as Connection,
      {
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        pool: POOL,
      }
    );
    const check = cfg.instructionConstraint.dataChecks[2]!;
    expect(Array.from(check.expected)).toEqual([0x00]);
  });

  test("sets FORWARD_FLAG_NATIVE_OUTPUT (bit 0) when unwrapNativeSol=true", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const cfg = await whirlpoolForwardConfig(
      fakeConnection(poolData) as unknown as Connection,
      {
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        pool: POOL,
        unwrapNativeSol: true,
      }
    );
    expect(cfg.forwardFlags).toBe(1);
    expect(cfg.outputMint.equals(OUTPUT_MINT)).toBe(true);
  });

  test("rejects input mint not matching either pool mint", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const wrongMint = new PublicKey(
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"
    );
    await expect(
      whirlpoolForwardConfig(
        fakeConnection(poolData) as unknown as Connection,
        {
          inputMint: wrongMint,
          outputMint: OUTPUT_MINT,
          pool: POOL,
        }
      )
    ).rejects.toThrow(/does not match pool's complementary mint/);
  });

  test("rejects output mint not matching the complementary pool mint", async () => {
    const poolData = fakePoolAccount(INPUT_MINT, OUTPUT_MINT);
    const wrongMint = new PublicKey(
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"
    );
    await expect(
      whirlpoolForwardConfig(
        fakeConnection(poolData) as unknown as Connection,
        {
          inputMint: INPUT_MINT,
          outputMint: wrongMint,
          pool: POOL,
        }
      )
    ).rejects.toThrow(/does not match pool's complementary mint/);
  });

  test("throws when pool account is not found", async () => {
    const conn = {
      getAccountInfo: async () => null,
    };
    await expect(
      whirlpoolForwardConfig(conn as unknown as Connection, {
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        pool: POOL,
      })
    ).rejects.toThrow(/Whirlpool account not found/);
  });
});
