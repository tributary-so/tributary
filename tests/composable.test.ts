import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Commitment,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import { getAssociatedTokenAddressSync, approve } from "@solana/spl-token";
import { Tributary } from "../target/types/tributary";
import {
  SEEDS,
  IWallet,
  Tributary as TributarySDK,
  parseValidationPda,
} from "../packages/sdk/src";
import { Buffer } from "buffer";
import { getOnChainNow } from "./helpers/onChainNow";
import { METEORA_DLMM_PUBKEY, LIGHTHOUSE_PUBKEY } from "./constants";
import { SurfpoolHelper, USDC_MINT, USDT_MINT } from "./surfpool-helpers";

const ADMIN_KEYPAIR = [
  238, 31, 185, 140, 54, 107, 145, 78, 166, 97, 25, 234, 169, 89, 102, 11, 16,
  50, 119, 229, 213, 144, 251, 250, 231, 231, 38, 93, 42, 152, 13, 182, 86, 67,
  104, 166, 174, 90, 212, 150, 51, 38, 47, 161, 242, 15, 132, 164, 55, 200, 136,
  167, 125, 249, 228, 30, 132, 100, 67, 255, 185, 242, 47, 145,
];

function getComposablePolicyPda(
  userPayment: PublicKey,
  policyId: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.COMPOSABLE_POLICY),
      userPayment.toBuffer(),
      new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
    ],
    programId
  );
}

function getValidationPda(
  composablePolicy: PublicKey,
  programId: PublicKey,
  phase: "pre" | "post" = "pre"
): [PublicKey, number] {
  const seed =
    phase === "pre" ? SEEDS.VALIDATION_PDA_PRE : SEEDS.VALIDATION_PDA_POST;
  return PublicKey.findProgramAddressSync(
    [Buffer.from(seed), composablePolicy.toBuffer()],
    programId
  );
}

function defaultByteRangeChecks(): any[] {
  return [
    { offset: 0, length: 8, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
  ];
}

function defaultForwardConfig(
  inputMint: PublicKey,
  outputMint: PublicKey
): any {
  return {
    inputMint: inputMint,
    outputMint: outputMint,
    forwardFlags: 0,
    instructionConstraint: {
      programId: METEORA_DLMM_PUBKEY,
      numDataChecks: 1,
      dataChecks: defaultByteRangeChecks(),
      numPinnedAccounts: 1,
      pinnedAccounts: [
        PublicKey.unique(),
        PublicKey.default,
        PublicKey.default,
        PublicKey.default,
      ],
    },
  };
}

const DISABLED_SPEC = { disabled: {} } as any;
const DISABLED_INIT = {
  numPinnedAccounts: 0,
  pinnedAccounts: [PublicKey.default, PublicKey.default],
  validationData: Buffer.alloc(0),
} as any;

function programCallSpec(programId: PublicKey): any {
  return { programCall: { programId } };
}

function validationInit(pinnedAccounts: PublicKey[], data: Buffer): any {
  return {
    numPinnedAccounts: pinnedAccounts.length,
    pinnedAccounts: [
      pinnedAccounts[0] ?? PublicKey.default,
      pinnedAccounts[1] ?? PublicKey.default,
    ],
    validationData: data,
  };
}

function defaultSubscriptionPolicy(amount: number, nextDue: number): any {
  return {
    subscription: {
      amount: new anchor.BN(amount),
      autoRenew: true,
      maxRenewals: null,
      paymentFrequency: { monthly: {} },
      nextPaymentDue: new anchor.BN(nextDue),
    },
  };
}

describe("Composable Policies", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let sdk: TributarySDK;

  // ── Keypairs ──────────────────────────────────────────────────────────
  const admin = Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR));
  let user: Keypair;
  let mintAuthority: Keypair;
  let gatewayAuthority: Keypair;
  let feeRecipient: Keypair;

  // ── PDAs / shared state ───────────────────────────────────────────────
  let configPDA: PublicKey;
  let tokenMint: PublicKey;
  let secondMint: PublicKey; // different mint for output
  let userTokenAccount: PublicKey;
  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let paymentsDelegate: PublicKey;
  let userSecondMintTokenAccount: PublicKey; // token account for gateway signer (= recipient in composable) — OUTPUT mint
  let gatewaySignerInputTokenAccount: PublicKey; // token account for gateway signer — INPUT mint (still used for some setups)

  // Surfpool cheatcode handle — set in beforeAll.
  let surfpool: SurfpoolHelper;

  async function fund(account: PublicKey, amount: number): Promise<void> {
    await surfpool.setAccount({
      publicKey: account,
      lamports: amount * LAMPORTS_PER_SOL,
    });
  }

  // Surfpool's setTokenAccount creates the ATA implicitly and sets an absolute
  // balance — a combined createAssociatedTokenAccountIdempotent + mintTo.
  async function ensureTokenAccount(
    owner: PublicKey,
    mint: PublicKey,
    amount = 0
  ): Promise<PublicKey> {
    const ata = getAssociatedTokenAddressSync(mint, owner);
    await surfpool.setTokenAccount({ owner, mint, amount });
    return ata;
  }

  beforeAll(async () => {
    sdk = new TributarySDK(connection, wallet as IWallet);

    // Fail fast unless we're on a Surfpool mainnet-fork.
    surfpool = new SurfpoolHelper(connection);
    if (!(await surfpool.isSurfpool())) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    user = Keypair.generate();
    mintAuthority = Keypair.generate();
    gatewayAuthority = Keypair.generate();
    feeRecipient = Keypair.generate();

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    await Promise.all([
      fund(admin.publicKey, 10),
      fund(user.publicKey, 10),
      fund(mintAuthority.publicKey, 10),
      fund(gatewayAuthority.publicKey, 10),
      fund(feeRecipient.publicKey, 1),
    ]);

    // Two real mainnet mints (6 decimals each), forked via Surfpool — no
    // createMint / mintAuthority needed. INPUT = USDC, OUTPUT = USDT so the
    // forward/swap path still exercises two distinct mints.
    tokenMint = USDC_MINT;
    secondMint = USDT_MINT;

    // User token account (input mint) — 100 USDC.
    userTokenAccount = await ensureTokenAccount(
      user.publicKey,
      tokenMint,
      100_000_000
    );

    // Gateway PDA
    [gatewayPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), gatewayAuthority.publicKey.toBuffer()],
      program.programId
    );

    // User payment PDA
    [userPaymentPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_payment"),
        user.publicKey.toBuffer(),
        tokenMint.toBuffer(),
      ],
      program.programId
    );

    // Payments delegate PDA
    [paymentsDelegate] = PublicKey.findProgramAddressSync(
      [Buffer.from("payments")],
      program.programId
    );

    // Recipient token account (OUTPUT mint = secondMint) — receives swept output
    userSecondMintTokenAccount = await ensureTokenAccount(
      gatewayAuthority.publicKey,
      secondMint
    );

    // Also create an INPUT-mint account for the gateway signer (used by some
    // older assertions / funding paths; harmless to keep around).
    gatewaySignerInputTokenAccount = await ensureTokenAccount(
      gatewayAuthority.publicKey,
      tokenMint
    );

    // Fee recipient token accounts — both INPUT and OUTPUT mint, since the
    // composable fee path is input-side post-ADR-0026 (fees skimmed from
    // the gross pull in input_mint BEFORE the forward), but legacy code
    // paths and other tests may still reference output-mint fee accounts.
    await ensureTokenAccount(feeRecipient.publicKey, tokenMint);
    await ensureTokenAccount(feeRecipient.publicKey, secondMint);
    await ensureTokenAccount(admin.publicKey, tokenMint);
    await ensureTokenAccount(admin.publicKey, secondMint);
  });

  // ── Bootstrap: init program, create user payment, create gateway ──────
  beforeAll(async () => {
    try {
      // Init program
      await sdk.updateWallet(new anchor.Wallet(admin));
      const initIx = await sdk.initialize(
        provider.wallet.publicKey,
        admin.publicKey
      );
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(initIx),
        [provider.wallet.payer!, admin],
        { commitment: "processed" as Commitment }
      );
    } catch {
      // might fail if we already did all of this through tributary.test
    }

    // Create user payment
    await sdk.updateWallet(new anchor.Wallet(user));
    const createUserIx = await sdk.createUserPayment(tokenMint);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createUserIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Create gateway
    await sdk.updateWallet(new anchor.Wallet(admin));
    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      250, // 2.5% fee
      0, // schedulerShareBps — no scheduler cut in this test
      feeRecipient.publicKey,
      "composable test gateway",
      "https://test.tributary.so"
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(gatewayIx),
      [admin],
      { commitment: "processed" as Commitment }
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Create composable policy — subscription policy, no validation
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — subscription policy, no validation", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composableCountBefore =
      userPaymentBefore!.createdComposableCount ?? 0;

    const now = await getOnChainNow(connection);
    const nextDue = now + 30 * 24 * 3600;
    const policyType = defaultSubscriptionPolicy(1_000_000, nextDue);
    const memo = new Array(32).fill(0);
    Buffer.from("Test composable").copy(Buffer.from(memo));

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const composablePolicyId = composableCountBefore + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [user],
      { commitment: "processed" as Commitment }
    );

    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );

    expect(policy.userPayment).toEqual(userPaymentPDA);
    expect(policy.gateway).toEqual(gatewayPDA);
    expect(policy.status).toEqual({ active: {} });
    expect(policy.policyId).toBe(composablePolicyId);
    expect(policy.totalInput.toNumber()).toBe(0);
    expect(policy.totalOutput.toNumber()).toBe(0);
    expect(policy.paymentCount).toBe(0);
    expect(policy.forwardConfig.instructionConstraint.programId).toEqual(
      METEORA_DLMM_PUBKEY
    );
    expect(policy.forwardConfig.instructionConstraint.numDataChecks).toBe(1);
    expect(policy.preValidation).toEqual({ disabled: {} });

    expect(policy.policyType.subscription.amount.toNumber()).toBe(1_000_000);
    expect(policy.policyType.subscription.autoRenew).toBe(true);
    expect(policy.policyType.subscription.maxRenewals).toBeNull();

    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    expect(userPaymentAfter!.createdComposableCount).toBe(composablePolicyId);
    expect(userPaymentAfter!.activeComposableCount).toBe(
      (userPaymentBefore!.activeComposableCount ?? 0) + 1
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Create composable policy — with validation config
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — with validation config", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(500_000, now + 86400);

    const memo = new Array(32).fill(0);
    Buffer.from("With validation").copy(Buffer.from(memo));

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const validationData = Buffer.from("lighthouse-assert-data");

    // Owner-pinned target account (ADR-0016). The test uses a dummy
    // pubkey — the assertion data isn't a real Lighthouse instruction,
    // so this policy is never executed; only the create-time storage of
    // the pinned set is exercised here.
    const pinnedTarget = Keypair.generate().publicKey;

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        programCallSpec(LIGHTHOUSE_PUBKEY),
        validationInit([pinnedTarget], validationData),
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: LIGHTHOUSE_PUBKEY,
        postValidationProgram: SystemProgram.programId,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [user],
      { commitment: "processed" as Commitment }
    );

    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );

    expect(policy.preValidation).toEqual({
      programCall: { programId: LIGHTHOUSE_PUBKEY },
    });
    expect(policy.status).toEqual({ active: {} });

    // ValidationPda is now a typed Anchor account (ADR-0016). The pinned
    // arity lives on the PDA, not on ComposablePolicy.validationConfig
    // (num_validation_accounts is dropped). The IDL doesn't register
    // ValidationPda as a fetchable account (it enters as UncheckedAccount),
    // so parse via the SDK raw-bytes helper.
    const validationPdaRaw = await connection.getAccountInfo(
      preValidationPdaAddress
    );
    expect(validationPdaRaw).not.toBeNull();
    const parsed = parseValidationPda(Buffer.from(validationPdaRaw!.data));
    expect(parsed.numPinnedAccounts).toBe(1);
    expect(parsed.pinnedAccounts[0]).toEqual(pinnedTarget);
    expect(parsed.pinnedAccounts).toHaveLength(1);
    // data_len + active prefix round-trip the assertion bytes verbatim.
    expect(parsed.dataLen).toBe(validationData.length);
    expect(parsed.data).toEqual(validationData);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Create composable policy — fails with non-whitelisted forward program
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails with non-whitelisted forward program", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(32).fill(0);

    const rogueProgram = Keypair.generate().publicKey;
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.instructionConstraint.programId = rogueProgram;

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await expect(
      sendAndConfirmTransaction(connection, new Transaction().add(ix), [user], {
        commitment: "processed" as Commitment,
      })
    ).rejects.toThrow(/InvalidForwardProgram/);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Create composable policy — fails with non-whitelisted validation program
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails with non-whitelisted validation program", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(32).fill(0);
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const rogueValidation = Keypair.generate().publicKey;

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        programCallSpec(rogueValidation),
        validationInit([], Buffer.from("some-data")),
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: rogueValidation,
        postValidationProgram: SystemProgram.programId,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await expect(
      sendAndConfirmTransaction(connection, new Transaction().add(ix), [user], {
        commitment: "processed" as Commitment,
      })
    ).rejects.toThrow(/InvalidValidationProgram/);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Create composable policy — fails with zero data checks
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails with zero data checks", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(32).fill(0);

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.instructionConstraint.numDataChecks = 0;

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await expect(
      sendAndConfirmTransaction(connection, new Transaction().add(ix), [user], {
        commitment: "processed" as Commitment,
      })
    ).rejects.toThrow(/InsufficientByteRangeChecks/);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Create composable policy — fails when numDataChecks > MAX_BYTE_RANGE_CHECKS
  //      Regression for reports/H-04-num-data-checks-unbounded-oob.md:
  //      previously only >= 1 was validated, so numDataChecks = 5 (or 255)
  //      succeeded at create time and then panicked out-of-bounds on every
  //      execute_composable call, bricking the policy.
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails when numDataChecks exceeds MAX_BYTE_RANGE_CHECKS", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(32).fill(0);

    // MAX_BYTE_RANGE_CHECKS == 4 on-chain. Sending 5 must be rejected at
    // create time with InsufficientByteRangeChecks.
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.instructionConstraint.numDataChecks = 5;

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await expect(
      sendAndConfirmTransaction(connection, new Transaction().add(ix), [user], {
        commitment: "processed" as Commitment,
      })
    ).rejects.toThrow(/InsufficientByteRangeChecks/);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Create composable policy — fails when a ByteRangeCheck.length > 8
  //      Regression for reports/H-06-byte-range-check-length-unbounded.md:
  //      `expected` is a `[u8; 8]`, so any length > 8 panics at
  //      `&self.expected[..length]` during execute_composable. The
  //      create-time guard now rejects length > 8 with
  //      ByteRangeCheckFailed instead of bricking the policy.
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails when ByteRangeCheck.length > 8", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(32).fill(0);

    // length = 16 with an 8-byte expected payload: offset + length = 16
    // <= 1024, so the existing overflow check passes, but the slice
    // `&expected[..16]` would panic on the `[u8; 8]` array. Must be
    // rejected at create time with ByteRangeCheckFailed.
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.instructionConstraint.dataChecks[0] = {
      offset: 0,
      length: 16,
      expected: [1, 2, 3, 4, 5, 6, 7, 8],
    };

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await expect(
      sendAndConfirmTransaction(connection, new Transaction().add(ix), [user], {
        commitment: "processed" as Commitment,
      })
    ).rejects.toThrow(/ByteRangeCheckFailed/);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Change composable status — Active to Paused
  // ══════════════════════════════════════════════════════════════════════
  test("Change composable status — Active to Paused", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(32).fill(0);
    Buffer.from("Status test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    let policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ active: {} });

    const pauseIx = await program.methods
      .changeComposableStatus(composablePolicyId, { paused: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(pauseIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    policy = await program.account.composablePolicy.fetch(composablePolicyPDA);
    expect(policy.status).toEqual({ paused: {} });
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Change composable status — Paused to Active
  // ══════════════════════════════════════════════════════════════════════
  test("Change composable status — Paused to Active", async () => {
    // Reuse the paused policy from the previous test
    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId = userPaymentAfter!.createdComposableCount;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    // Verify it's paused
    let policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ paused: {} });

    // Resume — owner (user) signs
    await sdk.updateWallet(new anchor.Wallet(user));

    const resumeIx = await program.methods
      .changeComposableStatus(composablePolicyId, { active: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(resumeIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    policy = await program.account.composablePolicy.fetch(composablePolicyPDA);
    expect(policy.status).toEqual({ active: {} });
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Delete composable policy
  // ══════════════════════════════════════════════════════════════════════
  test("Delete composable policy", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const activeBefore = userPaymentBefore!.activeComposableCount ?? 0;

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(50_000, now + 86400);
    const memo = new Array(32).fill(0);
    Buffer.from("Delete test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    let policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ active: {} });

    const pauseIx = await program.methods
      .changeComposableStatus(composablePolicyId, { paused: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(pauseIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    const deleteIx = await program.methods
      .deleteComposablePolicy(composablePolicyId)
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        config: configPDA,
        rentPayer: user.publicKey,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(deleteIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    const policyAfter = await program.account.composablePolicy.fetchNullable(
      composablePolicyPDA
    );
    expect(policyAfter).toBeNull();

    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    expect(userPaymentAfter!.activeComposableCount).toBe(activeBefore);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Execute composable — byte range check fails
  // ══════════════════════════════════════════════════════════════════════
  test("Execute composable — byte range check fails", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const pastTime = (await getOnChainNow(connection)) - 3600;
    const policyType = defaultSubscriptionPolicy(100_000, pastTime);

    const memo = new Array(32).fill(0);
    Buffer.from("ByteCheck test").copy(Buffer.from(memo));

    const expectedBytes = [1, 2, 3, 4, 5, 6, 7, 8];
    const dataChecks = defaultByteRangeChecks();
    dataChecks[0] = {
      offset: 0,
      length: 8,
      expected: expectedBytes,
    };

    const forwardConfig = {
      inputMint: tokenMint,
      outputMint: secondMint,
      forwardFlags: 0,
      instructionConstraint: {
        programId: METEORA_DLMM_PUBKEY,
        numDataChecks: 1,
        dataChecks: dataChecks,
        numPinnedAccounts: 1,
        pinnedAccounts: [
          PublicKey.unique(),
          PublicKey.default,
          PublicKey.default,
          PublicKey.default,
        ],
      },
    };

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    await approve(
      connection,
      user,
      userTokenAccount,
      userPaymentPDA,
      user,
      10_000_000
    );

    const recipientTokenAccount = getAssociatedTokenAddressSync(
      secondMint,
      user.publicKey
    );
    await ensureTokenAccount(user.publicKey, secondMint);

    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const wrongInstructionData = Buffer.from(new Array(33).fill(0));

    const ix = await program.methods
      .executeComposable(wrongInstructionData, null)
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        paymentsDelegate,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        preValidationPda: getValidationPda(
          composablePolicyPDA,
          program.programId,
          "pre"
        )[0],
        postValidationPda: getValidationPda(
          composablePolicyPDA,
          program.programId,
          "post"
        )[0],
        config: configPDA,
        userTokenAccount: userTokenAccount,
        mint: tokenMint,
        outputMint: secondMint,
        intermediateInputTokenAccount: getAssociatedTokenAddressSync(
          tokenMint,
          composablePolicyPDA,
          true
        ),
        intermediateOutputTokenAccount: getAssociatedTokenAddressSync(
          secondMint,
          composablePolicyPDA,
          true
        ),
        recipientTokenAccount,
        gatewayFeeAccount: getAssociatedTokenAddressSync(
          tokenMint,
          feeRecipient.publicKey
        ),
        protocolFeeAccount: getAssociatedTokenAddressSync(
          tokenMint,
          admin.publicKey
        ),
        tokenProgram: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
        associatedTokenProgram: new PublicKey(
          "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        ),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await expect(
      sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [gatewayAuthority],
        { commitment: "processed" as Commitment }
      )
    ).rejects.toThrow(/ByteRangeCheckFailed/);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  C-1 regression: forward_amount must not override schedule amount on
  //  Subscription composable. Only PayAsYouGo accepts a caller chunk.
  // ══════════════════════════════════════════════════════════════════════
  test("Execute composable — Subscription rejects forwardAmount (C-1)", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const pastTime = (await getOnChainNow(connection)) - 3600;
    // Schedule amount = 100_000. Adversarial forwardAmount = 99_999_999.
    const policyType = defaultSubscriptionPolicy(100_000, pastTime);

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        new Array(32).fill(0),
        defaultForwardConfig(tokenMint, secondMint),
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Approve enough delegate to cover schedule_amount but NOT the
    // adversarial forwardAmount. Pre-fix: this would fail with
    // InsufficientDelegatedAmount (delegate < forwardAmount). Post-fix:
    // fails earlier with InvalidAmount (forwardAmount rejected outright).
    await approve(
      connection,
      user,
      userTokenAccount,
      userPaymentPDA,
      user,
      10_000_000
    );

    // Ensure user has a secondMint ATA (recipient = user, output = secondMint)
    await ensureTokenAccount(user.publicKey, secondMint);
    const recipientTokenAccount = getAssociatedTokenAddressSync(
      secondMint,
      user.publicKey
    );

    const ix = await program.methods
      .executeComposable(
        Buffer.from(new Array(32).fill(0)),
        new anchor.BN(99_999_999)
      )
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        paymentsDelegate,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        preValidationPda: getValidationPda(
          composablePolicyPDA,
          program.programId,
          "pre"
        )[0],
        postValidationPda: getValidationPda(
          composablePolicyPDA,
          program.programId,
          "post"
        )[0],
        config: configPDA,
        userTokenAccount: userTokenAccount,
        mint: tokenMint,
        outputMint: secondMint,
        intermediateInputTokenAccount: getAssociatedTokenAddressSync(
          tokenMint,
          composablePolicyPDA,
          true
        ),
        intermediateOutputTokenAccount: getAssociatedTokenAddressSync(
          secondMint,
          composablePolicyPDA,
          true
        ),
        recipientTokenAccount,
        gatewayFeeAccount: getAssociatedTokenAddressSync(
          tokenMint,
          feeRecipient.publicKey
        ),
        protocolFeeAccount: getAssociatedTokenAddressSync(
          tokenMint,
          admin.publicKey
        ),
        tokenProgram: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
        associatedTokenProgram: new PublicKey(
          "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        ),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await expect(
      sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [gatewayAuthority],
        { commitment: "processed" as Commitment }
      )
    ).rejects.toThrow(/InvalidAmount/);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Execute composable — paused policy fails
  // ══════════════════════════════════════════════════════════════════════
  test("Execute composable — paused policy fails", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const pastTime = (await getOnChainNow(connection)) - 3600;
    const policyType = defaultSubscriptionPolicy(100_000, pastTime);

    const memo = new Array(32).fill(0);
    Buffer.from("Paused exec test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    await sdk.updateWallet(new anchor.Wallet(user));

    const pauseIx = await program.methods
      .changeComposableStatus(composablePolicyId, { paused: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(pauseIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const ix = await program.methods
      .executeComposable(Buffer.from(new Array(32).fill(0)), null)
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        paymentsDelegate,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        userTokenAccount: userTokenAccount,
        preValidationProgram: PublicKey.default,
        postValidationProgram: PublicKey.default,
        preValidationPda: getValidationPda(
          composablePolicyPDA,
          program.programId,
          "pre"
        )[0],
        postValidationPda: getValidationPda(
          composablePolicyPDA,
          program.programId,
          "post"
        )[0],
        mint: tokenMint,
        outputMint: secondMint,
        intermediateInputTokenAccount: getAssociatedTokenAddressSync(
          tokenMint,
          composablePolicyPDA,
          true
        ),
        intermediateOutputTokenAccount: getAssociatedTokenAddressSync(
          secondMint,
          composablePolicyPDA,
          true
        ),
        recipientTokenAccount: userSecondMintTokenAccount,
        gatewayFeeAccount: getAssociatedTokenAddressSync(
          tokenMint,
          feeRecipient.publicKey
        ),
        protocolFeeAccount: getAssociatedTokenAddressSync(
          tokenMint,
          admin.publicKey
        ),
        tokenProgram: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
        associatedTokenProgram: new PublicKey(
          "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        ),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await expect(
      sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [gatewayAuthority],
        { commitment: "processed" as Commitment }
      )
    ).rejects.toThrow(/PolicyPaused/);
  });

  test("Delete composable policy with validation — closes ValidationPDA", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [preValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "pre"
    );
    const [postValidationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId,
      "post"
    );

    const activeBefore = userPaymentBefore!.activeComposableCount ?? 0;

    const now = await getOnChainNow(connection);
    const policyType = defaultSubscriptionPolicy(50_000, now + 86400);
    const memo = new Array(32).fill(0);
    Buffer.from("Delete+Val test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    const validationData = Buffer.from("validation-assertion-data-here");

    // Two dummy pinned targets (accountDelta arity). Stored on the PDA,
    // not validated at execute — this test only exercises create + delete.
    const pinnedA = Keypair.generate().publicKey;
    const pinnedB = Keypair.generate().publicKey;

    // Create with validation
    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        programCallSpec(LIGHTHOUSE_PUBKEY),
        validationInit([pinnedA, pinnedB], validationData),
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: user.publicKey,
        recipient: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPdaAddress,
        postValidationPda: postValidationPdaAddress,
        preValidationProgram: LIGHTHOUSE_PUBKEY,
        postValidationProgram: SystemProgram.programId,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Verify ValidationPDA exists
    const valPdaBefore = await connection.getAccountInfo(
      preValidationPdaAddress
    );
    expect(valPdaBefore).not.toBeNull();

    // Pause
    await sdk.updateWallet(new anchor.Wallet(user));

    const pauseIx = await program.methods
      .changeComposableStatus(composablePolicyId, { paused: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(pauseIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Delete with ValidationPDA as remaining_accounts[0]
    const deleteIx = await program.methods
      .deleteComposablePolicy(composablePolicyId)
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        config: configPDA,
        rentPayer: user.publicKey,
      })
      .remainingAccounts([
        {
          pubkey: preValidationPdaAddress,
          isSigner: false,
          isWritable: true,
        },
      ])
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(deleteIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Both accounts should be closed
    const policyAfter = await program.account.composablePolicy.fetchNullable(
      composablePolicyPDA
    );
    expect(policyAfter).toBeNull();

    const valPdaAfter = await connection.getAccountInfo(
      preValidationPdaAddress
    );
    expect(valPdaAfter).toBeNull();

    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    expect(userPaymentAfter!.activeComposableCount).toBe(activeBefore);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  Regression for B2 — delete_user_payment must reject when
  //  active_composable_count > 0. Without this guard, a UserPayment can be
  //  closed while ComposablePolicy accounts still reference it, then reborn
  //  at the same PDA with reset counters → dangling policy state.
  //  See reports/B2-delete-user-payment-ignores-composable-count.md
  // ══════════════════════════════════════════════════════════════════════
  describe("B2 regression — delete_user_payment vs active_composable_count", () => {
    let b2User: Keypair;
    let b2UserPaymentPDA: PublicKey;
    let b2UserTokenAccount: PublicKey;
    let b2ComposablePolicyPDA: PublicKey;
    let b2PolicyId: number;

    beforeAll(async () => {
      b2User = Keypair.generate();
      await fund(b2User.publicKey, 10);

      b2UserTokenAccount = await ensureTokenAccount(
        b2User.publicKey,
        tokenMint,
        10_000_000
      );

      [b2UserPaymentPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SEEDS.USER_PAYMENT),
          b2User.publicKey.toBuffer(),
          tokenMint.toBuffer(),
        ],
        program.programId
      );

      await sdk.updateWallet(new anchor.Wallet(b2User));
      const createUserIx = await sdk.createUserPayment(tokenMint);
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createUserIx),
        [b2User],
        { commitment: "processed" as Commitment }
      );

      // Create one composable policy → active_composable_count == 1,
      // active_policies_count == 0.
      const now = await getOnChainNow(connection);
      const nextDue = now + 30 * 24 * 3600;
      const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
      const memo = new Array(32).fill(0);

      b2PolicyId = 1;
      [b2ComposablePolicyPDA] = getComposablePolicyPda(
        b2UserPaymentPDA,
        b2PolicyId,
        program.programId
      );
      const [preValidationPdaAddress] = getValidationPda(
        b2ComposablePolicyPDA,
        program.programId,
        "pre"
      );
      const [postValidationPdaAddress] = getValidationPda(
        b2ComposablePolicyPDA,
        program.programId,
        "post"
      );

      const createIx = await program.methods
        .createComposablePolicy(
          defaultSubscriptionPolicy(1_000_000, nextDue),
          memo,
          forwardConfig,
          DISABLED_SPEC,
          DISABLED_INIT,
          DISABLED_SPEC,
          DISABLED_INIT
        )
        .accountsStrict({
          feePayer: b2User.publicKey,
          recipient: b2User.publicKey,
          user: b2User.publicKey,
          composablePolicy: b2ComposablePolicyPDA,
          userPayment: b2UserPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationPda: preValidationPdaAddress,
          postValidationPda: postValidationPdaAddress,
          preValidationProgram: PublicKey.default,
          postValidationProgram: PublicKey.default,
          inputMint: tokenMint,
          outputMint: secondMint,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createIx),
        [b2User],
        { commitment: "processed" as Commitment }
      );

      const up = await sdk.getUserPayment(b2UserPaymentPDA);
      expect(up!.activePoliciesCount).toBe(0);
      expect(up!.activeComposableCount).toBe(1);
    });

    test("delete_user_payment fails when active_composable_count > 0", async () => {
      await sdk.updateWallet(new anchor.Wallet(b2User));

      const ix = await program.methods
        .deleteUserPayment()
        .accountsStrict({
          owner: b2User.publicKey,
          userPayment: b2UserPaymentPDA,
          tokenMint: tokenMint,
          rentPayer: b2User.publicKey,
          config: configPDA,
        })
        .instruction();

      await expect(
        sendAndConfirmTransaction(
          connection,
          new Transaction().add(ix),
          [b2User],
          { commitment: "processed" as Commitment }
        )
      ).rejects.toThrow(/HasActiveComposables|HasActivePolicies/);

      // Account must still exist.
      const stillThere = await sdk.getUserPayment(b2UserPaymentPDA);
      expect(stillThere).not.toBeNull();
      expect(stillThere!.activeComposableCount).toBe(1);
    });

    test("delete_user_payment succeeds once composable policy is removed", async () => {
      // Clean up the composable policy first.
      await sdk.updateWallet(new anchor.Wallet(b2User));

      const pauseIx = await program.methods
        .changeComposableStatus(b2PolicyId, { paused: {} })
        .accountsStrict({
          owner: b2User.publicKey,
          userPayment: b2UserPaymentPDA,
          composablePolicy: b2ComposablePolicyPDA,
          gateway: gatewayPDA,
          config: configPDA,
        })
        .instruction();
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(pauseIx),
        [b2User],
        { commitment: "processed" as Commitment }
      );

      const deletePolicyIx = await program.methods
        .deleteComposablePolicy(b2PolicyId)
        .accountsStrict({
          owner: b2User.publicKey,
          userPayment: b2UserPaymentPDA,
          composablePolicy: b2ComposablePolicyPDA,
          config: configPDA,
          rentPayer: b2User.publicKey,
        })
        .instruction();
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(deletePolicyIx),
        [b2User],
        { commitment: "processed" as Commitment }
      );

      const up = await sdk.getUserPayment(b2UserPaymentPDA);
      expect(up!.activeComposableCount).toBe(0);
      expect(up!.activePoliciesCount).toBe(0);

      // Now delete_user_payment must succeed.
      const deleteUserIx = await program.methods
        .deleteUserPayment()
        .accountsStrict({
          owner: b2User.publicKey,
          userPayment: b2UserPaymentPDA,
          tokenMint: tokenMint,
          rentPayer: b2User.publicKey,
          config: configPDA,
        })
        .instruction();
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(deleteUserIx),
        [b2User],
        { commitment: "processed" as Commitment }
      );

      const gone = await sdk.getUserPayment(b2UserPaymentPDA);
      expect(gone).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  //  B3 regression: recipient is an explicit account, NOT fee_payer
  //  reports/B3-fee-payer-becomes-recipient-without-gateway-signer-constraint.md
  // ══════════════════════════════════════════════════════════════════════
  describe("B3 regression", () => {
    test("create_composable_policy stores explicit recipient != fee_payer", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));

      // Dedicated recipient keypair — distinct from fee_payer (user)
      const b3Recipient = Keypair.generate();

      const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
      const composablePolicyId =
        (userPaymentBefore!.createdComposableCount ?? 0) + 1;
      const [composablePolicyPDA] = getComposablePolicyPda(
        userPaymentPDA,
        composablePolicyId,
        program.programId
      );
      const [preValidationPdaAddress] = getValidationPda(
        composablePolicyPDA,
        program.programId,
        "pre"
      );
      const [postValidationPdaAddress] = getValidationPda(
        composablePolicyPDA,
        program.programId,
        "post"
      );

      const pastTime = (await getOnChainNow(connection)) - 3600;
      const policyType = defaultSubscriptionPolicy(100_000, pastTime);
      const memo = new Array(32).fill(0);
      Buffer.from("B3 recipient test").copy(Buffer.from(memo));
      const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

      const createIx = await program.methods
        .createComposablePolicy(
          policyType,
          memo,
          forwardConfig,
          DISABLED_SPEC,
          DISABLED_INIT,
          DISABLED_SPEC,
          DISABLED_INIT
        )
        .accountsStrict({
          feePayer: user.publicKey,
          recipient: b3Recipient.publicKey,
          user: user.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationPda: preValidationPdaAddress,
          postValidationPda: postValidationPdaAddress,
          preValidationProgram: PublicKey.default,
          postValidationProgram: PublicKey.default,
          inputMint: tokenMint,
          outputMint: secondMint,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createIx),
        [user],
        { commitment: "processed" as Commitment }
      );

      const policy = await program.account.composablePolicy.fetch(
        composablePolicyPDA
      );

      // Core B3 assertions: recipient is the EXPLICIT account, not fee_payer
      expect(policy.recipient).toEqual(b3Recipient.publicKey);
      expect(policy.recipient).not.toEqual(user.publicKey);
      // rent_payer still tracks who paid rent (fee_payer)
      expect(policy.rentPayer).toEqual(user.publicKey);
    });

    test("create_composable_policy rejects recipient = PublicKey.default", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));

      const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
      const composablePolicyId =
        (userPaymentBefore!.createdComposableCount ?? 0) + 1;
      const [composablePolicyPDA] = getComposablePolicyPda(
        userPaymentPDA,
        composablePolicyId,
        program.programId
      );
      const [preValidationPdaAddress] = getValidationPda(
        composablePolicyPDA,
        program.programId,
        "pre"
      );
      const [postValidationPdaAddress] = getValidationPda(
        composablePolicyPDA,
        program.programId,
        "post"
      );

      const pastTime = (await getOnChainNow(connection)) - 3600;
      const policyType = defaultSubscriptionPolicy(100_000, pastTime);
      const memo = new Array(32).fill(0);
      const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

      const ix = await program.methods
        .createComposablePolicy(
          policyType,
          memo,
          forwardConfig,
          DISABLED_SPEC,
          DISABLED_INIT,
          DISABLED_SPEC,
          DISABLED_INIT
        )
        .accountsStrict({
          feePayer: user.publicKey,
          recipient: PublicKey.default,
          user: user.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationPda: preValidationPdaAddress,
          postValidationPda: postValidationPdaAddress,
          preValidationProgram: PublicKey.default,
          postValidationProgram: PublicKey.default,
          inputMint: tokenMint,
          outputMint: secondMint,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await expect(
        sendAndConfirmTransaction(
          connection,
          new Transaction().add(ix),
          [user],
          { commitment: "processed" as Commitment }
        )
      ).rejects.toThrow(/InvalidAmount/);
    });
  });
});
