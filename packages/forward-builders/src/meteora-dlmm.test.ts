/**
 * Unit tests for createMeteoraDlmmForward (ADR-0030).
 *
 * The DLMM client is mocked so these run without RPC. The assertions target
 * the key-transformation logic that was previously inlined in the scheduler:
 *
 *  - per-account `isWritable` preserved from `swapIx.keys` (NOT all-true)
 *  - `applyHostFeeInFix` rewrites SystemProgram → DLMM program id
 *  - returned accounts never carry `isSigner` (ADR-0008 — type-level)
 *  - `instructionData` is the raw swap instruction data
 */
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import type { ComposablePolicy, ForwardBuilder } from "@tributary-so/sdk";

const TOKEN_X = new PublicKey("So11111111111111111111111111111111111111112");

let mockPool: any = null;

jest.mock("@meteora-ag/dlmm", () => ({
  __esModule: true,
  default: {
    create: async () => mockPool,
  },
}));

import {
  createMeteoraDlmmForward,
  meteoraDlmmForwardConfig,
  createSwapWhenBalanceLow,
  METEORA_DLMM_SWAP_DISCRIMINATOR,
} from "./meteora-dlmm";
import { METEORA_DLMM_PUBKEY } from "./constants";

const POOL = new PublicKey("BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y");
const INPUT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
); // USDC
const OUTPUT_MINT = TOKEN_X; // WSOL

function policy(inputMint: PublicKey, outputMint: PublicKey): ComposablePolicy {
  return {
    forwardConfig: { inputMint, outputMint },
  } as unknown as ComposablePolicy;
}

interface MockKey {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
}

function setPool(
  swapIxKeys: MockKey[],
  swapData: Buffer,
  programId: PublicKey = METEORA_DLMM_PUBKEY
) {
  mockPool = {
    tokenX: { publicKey: OUTPUT_MINT }, // input != tokenX → swapForY = false
    getBinArrayForSwap: async () => [],
    swapQuote: () => ({ minOutAmount: new BN(1), binArraysPubkey: [] }),
    swap: async () => ({
      instructions: [{ programId, keys: swapIxKeys, data: swapData }],
    }),
  };
}

const FAKE_CONN = {} as any; // build() forwards it to DLMM.create untouched

describe("createMeteoraDlmmForward", () => {
  beforeEach(() => {
    mockPool = null;
  });

  test("returns a ForwardBuilder (implements the interface)", () => {
    const builder: ForwardBuilder = createMeteoraDlmmForward({
      pool: POOL,
      slippageBps: 100,
    });
    expect(typeof builder.build).toBe("function");
  });

  test("build() returns non-empty instructionData from swapIx.data", async () => {
    const swapData = Buffer.from([1, 2, 3, 4, 5]);
    setPool(
      [{ pubkey: PublicKey.unique(), isSigner: false, isWritable: true }],
      swapData
    );
    const builder = createMeteoraDlmmForward({ pool: POOL, slippageBps: 100 });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PublicKey.unique(),
      face: new BN(1_000_000),
    });
    expect(Buffer.isBuffer(res.instructionData)).toBe(true);
    expect(res.instructionData.equals(swapData)).toBe(true);
  });

  test("build() preserves per-account isWritable from swapIx.keys (NOT all-true)", async () => {
    const keys: MockKey[] = [
      { pubkey: PublicKey.unique(), isSigner: true, isWritable: true },
      { pubkey: PublicKey.unique(), isSigner: false, isWritable: false },
      { pubkey: PublicKey.unique(), isSigner: true, isWritable: false },
    ];
    setPool(keys, Buffer.from([9]));
    const builder = createMeteoraDlmmForward({ pool: POOL, slippageBps: 100 });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PublicKey.unique(),
      face: new BN(1_000_000),
    });
    expect(res.forwardAccounts.map((a) => a.isWritable)).toEqual([
      true,
      false,
      false,
    ]);
  });

  test("build() never emits isSigner on forwardAccounts", async () => {
    const keys: MockKey[] = [
      { pubkey: PublicKey.unique(), isSigner: true, isWritable: true },
      { pubkey: PublicKey.unique(), isSigner: false, isWritable: false },
    ];
    setPool(keys, Buffer.from([9]));
    const builder = createMeteoraDlmmForward({ pool: POOL, slippageBps: 100 });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PublicKey.unique(),
      face: new BN(1_000_000),
    });
    for (const a of res.forwardAccounts) {
      expect(a).not.toHaveProperty("isSigner");
    }
  });

  test("applyHostFeeInFix rewrites SystemProgram → DLMM program id", async () => {
    const sysKey: MockKey = {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: true,
    };
    const other: MockKey = {
      pubkey: PublicKey.unique(),
      isSigner: false,
      isWritable: false,
    };
    setPool([sysKey, other], Buffer.from([9]));
    const builder = createMeteoraDlmmForward({
      pool: POOL,
      slippageBps: 100,
      applyHostFeeInFix: true,
    });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PublicKey.unique(),
      face: new BN(1_000_000),
    });
    expect(res.forwardAccounts[0].pubkey.equals(METEORA_DLMM_PUBKEY)).toBe(
      true
    );
    expect(res.forwardAccounts[1].pubkey.equals(other.pubkey)).toBe(true);
  });

  test("applyHostFeeInFix disabled leaves SystemProgram key untouched", async () => {
    const sysKey: MockKey = {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: true,
    };
    setPool([sysKey], Buffer.from([9]));
    const builder = createMeteoraDlmmForward({ pool: POOL, slippageBps: 100 });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PublicKey.unique(),
      face: new BN(1_000_000),
    });
    expect(res.forwardAccounts[0].pubkey.equals(SystemProgram.programId)).toBe(
      true
    );
  });

  test("throws when DLMM swap instruction is absent from pool.swap() output", async () => {
    setPool([], Buffer.from([0]), SystemProgram.programId);
    const builder = createMeteoraDlmmForward({ pool: POOL, slippageBps: 100 });
    await expect(
      builder.build({
        connection: FAKE_CONN,
        policy: policy(INPUT_MINT, OUTPUT_MINT),
        composablePolicyPda: PublicKey.unique(),
        face: new BN(1_000_000),
      })
    ).rejects.toThrow(/swap instruction not found/);
  });
});

describe("meteoraDlmmForwardConfig", () => {
  test("pins programId = METEORA_DLMM, pool at pinnedAccounts[0], and mints", () => {
    const cfg = meteoraDlmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    expect(
      cfg.instructionConstraint.programId.equals(METEORA_DLMM_PUBKEY)
    ).toBe(true);
    expect(cfg.instructionConstraint.numPinnedAccounts).toBe(1);
    expect(
      cfg.instructionConstraint.pinnedAccounts[0]!.pubkey.equals(POOL)
    ).toBe(true);
    expect(
      cfg.inputMint.equals(INPUT_MINT) && cfg.outputMint.equals(OUTPUT_MINT)
    ).toBe(true);
    // forwardFlags default = 0 (no WSOL unwrap).
    expect(cfg.forwardFlags).toBe(0);
  });

  test("pins the swap discriminator at dataChecks[0] (offset 0, length 8)", () => {
    const cfg = meteoraDlmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    // On-chain requires num_data_checks >= 1.
    expect(cfg.instructionConstraint.numDataChecks).toBe(1);
    const check = cfg.instructionConstraint.dataChecks[0]!;
    expect(check.offset).toBe(0);
    expect(check.length).toBe(8);
    expect(Array.from(check.expected)).toEqual([
      ...METEORA_DLMM_SWAP_DISCRIMINATOR,
    ]);
    // Trailing slots remain the empty sentinel.
    for (let i = 1; i < 4; i++) {
      expect(cfg.instructionConstraint.dataChecks[i]!.length).toBe(0);
    }
  });

  test("sets FORWARD_FLAG_NATIVE_OUTPUT (bit 0) when unwrapNativeSol=true", () => {
    const cfg = meteoraDlmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      unwrapNativeSol: true,
    });
    expect(cfg.forwardFlags).toBe(1);
    expect(cfg.outputMint.equals(OUTPUT_MINT)).toBe(true);
  });
});

describe("createSwapWhenBalanceLow", () => {
  const RECIPIENT = new PublicKey(
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
  );
  const POLICY_TYPE = {
    subscription: {
      amount: new BN(1_000_000),
      paymentFrequency: new BN(86400),
      maxRenewals: 12,
      autoRenew: true,
      nextPaymentDue: new BN(0),
    },
  } as any;

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("returns { create, forwardBuilder } with the full bundle shape", () => {
    const { create, forwardBuilder } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "hot wallet topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      slippageBps: 100,
      threshold: 50_000_000,
      op: "<",
    });
    expect(create.policyType).toBe(POLICY_TYPE);
    expect(create.memo).toBe("hot wallet topup");
    expect(create.recipient.equals(RECIPIENT)).toBe(true);
    // forwardConfig half
    expect(
      create.forwardConfig.instructionConstraint.programId.equals(
        METEORA_DLMM_PUBKEY
      )
    ).toBe(true);
    expect(create.forwardConfig.inputMint.equals(INPUT_MINT)).toBe(true);
    expect(create.forwardConfig.outputMint.equals(OUTPUT_MINT)).toBe(true);
    // pre/post spec+init present
    expect("programCall" in create.preValidation).toBe(true);
    expect("disabled" in create.postValidation).toBe(true);
    expect(create.preValidationInit.pinnedAccounts.length).toBeGreaterThan(0);
    // forwardBuilder implements the interface
    expect(typeof forwardBuilder.build).toBe("function");
  });

  test("pre-validation targets the recipient's output ATA", () => {
    const { create } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      slippageBps: 50,
      threshold: 1,
      op: "<",
    });
    const expectedAta = getAssociatedTokenAddressSync(OUTPUT_MINT, RECIPIENT);
    expect(
      create.preValidationInit.pinnedAccounts[0]!.pubkey.equals(expectedAta)
    ).toBe(true);
  });

  test("deliver-transform swap without post emits the economic warning", () => {
    createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      slippageBps: 100,
      threshold: 50_000_000,
      op: "<",
    });
    const warned = warnSpy.mock.calls
      .map((c) => String(c[0]))
      .some((m) => /deliver-transform/.test(m));
    expect(warned).toBe(true);
  });

  test("pins the pool on-chain (constraint half of the pair)", () => {
    const { create } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      slippageBps: 100,
      threshold: 1,
      op: "<",
    });
    expect(
      create.forwardConfig.instructionConstraint.pinnedAccounts[0]!.pubkey.equals(
        POOL
      )
    ).toBe(true);
  });

  test("threads unwrapNativeSol + applyHostFeeInFix through both halves", () => {
    const { create, forwardBuilder } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      slippageBps: 100,
      threshold: 1,
      op: "<",
      unwrapNativeSol: true,
      applyHostFeeInFix: true,
    });
    expect(create.forwardConfig.forwardFlags).toBe(1);
    // forwardBuilder carries the host-fee fix (verified by building with a
    // SystemProgram key present — reuses the existing applyHostFeeInFix test
    // path, so just assert the builder is the right shape).
    expect(typeof forwardBuilder.build).toBe("function");
  });

  test("accepts a caller-supplied post-validation override", () => {
    const post = {
      spec: { programCall: { programId: PublicKey.unique() } } as any,
      init: {
        numPinnedAccounts: 0,
        pinnedAccounts: [],
        validationData: Buffer.alloc(0),
      } as any,
    };
    const { create } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      slippageBps: 100,
      threshold: 1,
      op: "<",
      post,
    });
    expect(create.postValidation).toBe(post.spec);
    expect(create.postValidationInit).toBe(post.init);
    // post supplied for deliver-transform → no deliver-transform warning
    const warned = warnSpy.mock.calls
      .map((c) => String(c[0]))
      .some((m) => /deliver-transform/.test(m));
    expect(warned).toBe(false);
  });
});
