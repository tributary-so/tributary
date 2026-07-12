import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  Commitment,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Tributary } from "../target/types/tributary";
import { Tributary as TributarySDK, lighthouse } from "../packages/sdk/src";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getPaymentPolicyPda,
  getComposablePolicyPda,
  getPreValidationPda,
  getPostValidationPda,
  getPaymentsDelegatePda,
} from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import { sendAndConfirmWithRetry } from "./helpers/sendWithRetry";
import { LIGHTHOUSE_PUBKEY } from "./constants";
import assert from "assert";
import { Buffer } from "buffer";

// ── Composable v2.1 helpers (mirrors tests/composable.test.ts) ───────────
const DISABLED_SPEC = { disabled: {} } as any;
const DISABLED_INIT = {
  numPinnedAccounts: 0,
  pinnedAccounts: [
    { index: 0, pubkey: PublicKey.default },
    { index: 0, pubkey: PublicKey.default },
    { index: 0, pubkey: PublicKey.default },
    { index: 0, pubkey: PublicKey.default },
  ],
  validationData: Buffer.alloc(0),
} as any;

function programCallSpec(programId: PublicKey): any {
  return { programCall: { programId } };
}

function validationInit(pinnedAccounts: PublicKey[], data: Buffer): any {
  const pins: { index: number; pubkey: PublicKey }[] = pinnedAccounts.map(
    (pubkey, index) => ({ index, pubkey })
  );
  while (pins.length < 4) {
    pins.push({ index: 0, pubkey: PublicKey.default });
  }
  return {
    numPinnedAccounts: pinnedAccounts.length,
    pinnedAccounts: pins,
    validationData: data,
  } as any;
}

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const ADMIN_KEYPAIR = [
  238, 31, 185, 140, 54, 107, 145, 78, 166, 97, 25, 234, 169, 89, 102, 11, 16,
  50, 119, 229, 213, 144, 251, 250, 231, 231, 38, 93, 42, 152, 13, 182, 86, 67,
  104, 166, 174, 90, 212, 150, 51, 38, 47, 161, 242, 15, 132, 164, 55, 200, 136,
  167, 125, 249, 228, 30, 132, 100, 67, 255, 185, 242, 47, 145,
];

// ────────────────────────────────────────────────────────────────────────────
// OneTime payment policy integration suite.
//
// Covers the OneTime PolicyType variant (ADR-0019) end-to-end:
//   1. Direct PaymentPolicy: create → execute → Completed → re-exec blocked;
//      due-date gating; expiry gating; delete after completion.
//   2. ComposablePolicy + Lighthouse guard: conditional one-shot payment.
//
// Requires a running Surfpool mainnet-fork (see Anchor.toml `surfpool` script).
// ────────────────────────────────────────────────────────────────────────────

describe("OneTime payment policy", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let surfpool: SurfpoolHelper;
  let sdk: TributarySDK;

  const admin = Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR));
  const user = Keypair.generate();
  const recipient = Keypair.generate();
  const gatewayAuthority = Keypair.generate();
  const gatewayExecutionSigner = Keypair.generate();
  const feeRecipient = Keypair.generate();

  const configPDA = getConfigPda(program.programId).address;

  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let userTokenAccount: PublicKey;
  let recipientTokenAccount: PublicKey;
  let feeRecipientTokenAccount: PublicKey;
  let adminTokenAccount: PublicKey;
  let paymentsDelegatePDA: PublicKey;
  let surfpoolReady = false;

  async function fund(account: PublicKey, sol: number): Promise<void> {
    await surfpool.setAccount({
      publicKey: account,
      lamports: sol * 1_000_000_000,
    });
  }

  async function creditTokenAccount(
    owner: PublicKey,
    amount: number,
    delegate?: { delegate: PublicKey; delegatedAmount: number }
  ): Promise<void> {
    await surfpool.setTokenAccount({
      owner,
      mint: USDC_MINT,
      amount,
      delegate: delegate?.delegate,
      delegatedAmount: delegate?.delegatedAmount,
    });
  }

  async function send(
    ixs: anchor.web3.TransactionInstruction[],
    signers: Keypair[],
    extraPayer?: Keypair
  ): Promise<void> {
    const tx = new Transaction().add(...ixs);
    await sendAndConfirmWithRetry(connection, tx, signers, {
      commitment: "processed" as Commitment,
    });
    void extraPayer;
  }

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);
    if (!(await surfpool.isSurfpool())) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }
    surfpoolReady = true;

    sdk = new TributarySDK(connection, wallet.payer);

    gatewayPDA = getGatewayPda(
      gatewayAuthority.publicKey,
      program.programId
    ).address;
    userPaymentPDA = getUserPaymentPda(
      user.publicKey,
      USDC_MINT,
      program.programId
    ).address;
    paymentsDelegatePDA = getPaymentsDelegatePda(program.programId).address;

    userTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, user.publicKey);
    recipientTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      recipient.publicKey
    );
    feeRecipientTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      feeRecipient.publicKey
    );
    adminTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      admin.publicKey
    );

    // Fund SOL.
    await Promise.all([
      fund(admin.publicKey, 10),
      fund(user.publicKey, 10),
      fund(gatewayAuthority.publicKey, 10),
      fund(gatewayExecutionSigner.publicKey, 10),
      fund(recipient.publicKey, 5),
      fund(feeRecipient.publicKey, 5),
      fund(wallet.publicKey, 10),
    ]);

    // Create ATAs.
    const ataTx = new Transaction();
    for (const owner of [
      user.publicKey,
      recipient.publicKey,
      feeRecipient.publicKey,
      admin.publicKey,
    ]) {
      ataTx.add(
        createAssociatedTokenAccountInstruction(
          admin.publicKey,
          getAssociatedTokenAddressSync(USDC_MINT, owner),
          owner,
          USDC_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    try {
      await sendAndConfirmTransaction(connection, ataTx, [admin], {
        commitment: "processed",
      });
    } catch {
      // ATAs may already exist on the fork.
    }

    // Fund USDC: user gets 1000 USDC, recipient/feeRecipient/admin get 0.
    await creditTokenAccount(user.publicKey, 1_000_000_000);
    await creditTokenAccount(recipient.publicKey, 0);
    await creditTokenAccount(feeRecipient.publicKey, 0);
    await creditTokenAccount(admin.publicKey, 0);

    // Seed program config with admin (same pattern as tributary.test.ts).
    await sdk.updateWallet(admin);
    const desired = await sdk.getProgramConfig(configPDA);
    desired.admin = admin.publicKey;
    desired.feeRecipient = admin.publicKey;
    desired.protocolShareBps = 2000;
    desired.emergencyPause = false;
    const serialized = await program.coder.accounts.encode(
      "programConfig",
      desired
    );
    await surfpool.setAccount({
      publicKey: configPDA,
      data: serialized.toString("hex"),
    });

    // Create gateway (0 bps fee — simplifies balance math).
    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      0,
      0,
      feeRecipient.publicKey,
      "one-time test gateway",
      "https://example.com"
    );
    await send([gatewayIx], [admin]);
  });

  // Direct PaymentPolicy OneTime flow.
  describe("direct PaymentPolicy OneTime", () => {
    test("create UserPayment", async () => {
      await sdk.updateWallet(user);
      const ix = await sdk.createUserPayment(USDC_MINT);
      await send([ix], [user]);
      const up = await sdk.getUserPayment(userPaymentPDA);
      expect(up!.owner).toEqual(user.publicKey);
      expect(up!.tokenMint).toEqual(USDC_MINT);
    });

    test("create immediate OneTime policy (dueDate=null)", async () => {
      await sdk.updateWallet(user);
      const amount = new anchor.BN(50_000_000); // 50 USDC
      const memo = new Array(64).fill(0);
      Buffer.from("one-time immediate").copy(Buffer.from(memo));

      const ix = await sdk.getCreateOneTimePolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        amount,
        null, // immediate
        null, // never expires
        memo
      );
      await send([ix], [user]);

      const policyId = 1;
      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        policyId,
        program.programId
      ).address;
      const policy = await sdk.getPaymentPolicy(pda);
      expect(policy!.policyType.oneTime).toBeDefined();
      expect(policy!.policyType.oneTime.amount.toNumber()).toBe(50_000_000);
      expect(policy!.policyType.oneTime.dueDate.toNumber()).toBe(0);
      expect(policy!.policyType.oneTime.expiryDate).toBeNull();
      expect(policy!.status).toEqual({ active: {} });
    });

    test("approve delegate on user token account", async () => {
      // Approval must cover the pull (amount + 0 bps fee here = exactly amount).
      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });
    });

    test("execute OneTime — transitions to Completed", async () => {
      await sdk.updateWallet(gatewayAuthority);
      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        1,
        program.programId
      ).address;

      const recipientBefore = Number(
        (await connection.getTokenAccountBalance(recipientTokenAccount)).value
          .amount
      );

      const ixs = await sdk.executePayment(pda);
      await send(ixs, [gatewayAuthority]);

      const recipientAfter = Number(
        (await connection.getTokenAccountBalance(recipientTokenAccount)).value
          .amount
      );
      expect(recipientAfter).toBeGreaterThan(recipientBefore);

      const policy = await sdk.getPaymentPolicy(pda);
      expect(policy!.status).toEqual({ completed: {} });
      expect(policy!.paymentCount).toBe(1);
      expect(policy!.totalPaid.toNumber()).toBe(50_000_000);
    });

    test("re-execute fails (status = Completed)", async () => {
      await sdk.updateWallet(gatewayAuthority);
      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        1,
        program.programId
      ).address;

      await expect(async () => {
        const ixs = await sdk.executePayment(pda);
        await send(ixs, [gatewayAuthority]);
      }).rejects.toThrow();
    });

    test("delete OneTime policy after completion", async () => {
      await sdk.updateWallet(user);
      const ix = await sdk.deletePaymentPolicy(USDC_MINT, 1);
      await send([ix], [user]);

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        1,
        program.programId
      ).address;
      const policy = await sdk.getPaymentPolicy(pda);
      expect(policy).toBeNull();
    });

    test("due-date gating — future-due policy rejects execute", async () => {
      await sdk.updateWallet(user);

      // Re-approve after the prior execute consumed the delegate amount.
      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });

      const far = new anchor.BN(Math.floor(Date.now() / 1000) + 31_536_000); // +1y
      const memo = new Array(64).fill(0);
      Buffer.from("future due").copy(Buffer.from(memo));

      const ix = await sdk.getCreateOneTimePolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(10_000_000),
        far,
        null,
        memo
      );
      await send([ix], [user]);

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        2,
        program.programId
      ).address;

      await sdk.updateWallet(gatewayAuthority);
      await expect(async () => {
        const ixs = await sdk.executePayment(pda);
        await send(ixs, [gatewayAuthority]);
      }).rejects.toThrow();
    });

    test("expiry gating — already-expired policy rejects execute", async () => {
      await sdk.updateWallet(user);
      const past = new anchor.BN(Math.floor(Date.now() / 1000) - 1); // expired 1s ago
      const memo = new Array(64).fill(0);
      Buffer.from("expired").copy(Buffer.from(memo));

      const ix = await sdk.getCreateOneTimePolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(10_000_000),
        null, // immediate
        past, // already expired
        memo
      );
      await send([ix], [user]);

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        3,
        program.programId
      ).address;

      await sdk.updateWallet(gatewayAuthority);
      await expect(async () => {
        const ixs = await sdk.executePayment(pda);
        await send(ixs, [gatewayAuthority]);
      }).rejects.toThrow();
    });
  });

  // ComposablePolicy OneTime + Lighthouse guard — conditional one-shot payment.
  describe("composable OneTime + Lighthouse guard", () => {
    let composablePolicyPDA: PublicKey;
    let preValidationPDA: PublicKey;
    let postValidationPDA: PublicKey;
    let composablePolicyId: number;

    // The Lighthouse guard asserts recipient USDC balance < 1 USDC. Earlier
    // tests in this file paid the same recipient 50+ USDC via direct
    // PaymentPolicy executions. Reset to 0 so the assertion holds.
    beforeAll(async () => {
      await creditTokenAccount(recipient.publicKey, 0);
    });

    test("create composable OneTime with Lighthouse guard", async () => {
      await sdk.updateWallet(user);

      const userPayment = await sdk.getUserPayment(userPaymentPDA);
      composablePolicyId = (userPayment!.createdComposableCount ?? 0) + 1;
      composablePolicyPDA = getComposablePolicyPda(
        userPaymentPDA,
        composablePolicyId,
        program.programId
      ).address;
      preValidationPDA = getPreValidationPda(
        composablePolicyPDA,
        program.programId
      ).address;
      postValidationPDA = getPostValidationPda(
        composablePolicyPDA,
        program.programId
      ).address;

      // OneTime policy: 25 USDC, immediate, never expires.
      const policyType = {
        oneTime: {
          amount: new anchor.BN(25_000_000),
          dueDate: new anchor.BN(0),
          expiryDate: null,
          padding: new Array(103).fill(0),
        },
      };
      const memo = new Array(32).fill(0);
      Buffer.from("composable one-time").copy(Buffer.from(memo));

      // Forward disabled (instructionConstraint.programId = default sentinel)
      // — same-mint pull → sweep, no swap.
      const forwardConfig = {
        inputMint: USDC_MINT,
        outputMint: USDC_MINT,
        forwardFlags: 0,
        instructionConstraint: {
          programId: PublicKey.default,
          numDataChecks: 0,
          dataChecks: [
            { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
            { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
            { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
            { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          ],
          numPinnedAccounts: 0,
          pinnedAccounts: [
            { index: 0, pubkey: PublicKey.default },
            { index: 0, pubkey: PublicKey.default },
            { index: 0, pubkey: PublicKey.default },
            { index: 0, pubkey: PublicKey.default },
          ],
        },
      };

      // Lighthouse: assert recipient USDC balance < 1 USDC.
      // (Recipient starts at 0; assertion passes → fires once.)
      const guard = lighthouse
        .tokenAccount(recipientTokenAccount)
        .amount(1_000_000, "<")
        .build();

      const ix = await program.methods
        .createComposablePolicy(
          policyType,
          memo,
          forwardConfig,
          programCallSpec(LIGHTHOUSE_PUBKEY),
          validationInit(
            [guard.accounts[0]?.pubkey ?? PublicKey.default],
            guard.data
          ),
          DISABLED_SPEC,
          DISABLED_INIT
        )
        .accountsStrict({
          feePayer: user.publicKey,
          recipient: recipient.publicKey,
          user: user.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationPda: preValidationPDA,
          postValidationPda: postValidationPDA,
          preValidationProgram: LIGHTHOUSE_PUBKEY,
          postValidationProgram: SystemProgram.programId,
          inputMint: USDC_MINT,
          outputMint: USDC_MINT,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await send([ix], [user]);

      const policy = await program.account.composablePolicy.fetch(
        composablePolicyPDA
      );
      expect(policy.policyType.oneTime).toBeDefined();
      expect(policy.policyType.oneTime.amount.toNumber()).toBe(25_000_000);
      expect(policy.status).toEqual({ active: {} });
    });

    test("execute composable OneTime — fires once, transitions to Completed", async () => {
      await sdk.updateWallet(gatewayAuthority);

      const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
        USDC_MINT,
        composablePolicyPDA!,
        true,
        TOKEN_PROGRAM_ID
      );

      // remaining_accounts: just the Lighthouse read-target (recipient ATA).
      // Forward disabled → no forward accounts needed.
      const remainingAccounts = [
        { pubkey: recipientTokenAccount, isSigner: false, isWritable: false },
      ];

      const recipientBefore = Number(
        (await connection.getTokenAccountBalance(recipientTokenAccount)).value
          .amount
      );

      const instructionData = Buffer.alloc(0); // forward disabled
      const accounts = {
        feePayer: gatewayAuthority.publicKey,
        paymentsDelegate: paymentsDelegatePDA,
        composablePolicy: composablePolicyPDA!,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationProgram: LIGHTHOUSE_PUBKEY,
        postValidationProgram: SystemProgram.programId,
        preValidationPda: preValidationPDA!,
        postValidationPda: postValidationPDA!,
        userTokenAccount,
        mint: USDC_MINT,
        outputMint: USDC_MINT,
        intermediateInputTokenAccount,
        intermediateOutputTokenAccount: intermediateInputTokenAccount,
        recipientTokenAccount,
        gatewayFeeAccount: feeRecipientTokenAccount,
        protocolFeeAccount: adminTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      };
      const ix = await program.methods
        .executeComposable(instructionData, null)
        .accountsStrict(accounts)
        .remainingAccounts(remainingAccounts)
        .instruction();

      await send([ix], [gatewayAuthority]);

      const recipientAfter = Number(
        (await connection.getTokenAccountBalance(recipientTokenAccount)).value
          .amount
      );
      expect(recipientAfter).toBeGreaterThan(recipientBefore);

      const policy = await program.account.composablePolicy.fetch(
        composablePolicyPDA!
      );
      expect(policy.status).toEqual({ completed: {} });
      expect(policy.paymentCount).toBe(1);
    });

    test("re-execute composable OneTime fails (Completed)", async () => {
      await sdk.updateWallet(gatewayAuthority);

      const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
        USDC_MINT,
        composablePolicyPDA!,
        true,
        TOKEN_PROGRAM_ID
      );
      const remainingAccounts = [
        { pubkey: recipientTokenAccount, isSigner: false, isWritable: false },
      ];
      const instructionData = Buffer.alloc(0);
      const accounts = {
        feePayer: gatewayAuthority.publicKey,
        paymentsDelegate: paymentsDelegatePDA,
        composablePolicy: composablePolicyPDA!,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationProgram: LIGHTHOUSE_PUBKEY,
        postValidationProgram: SystemProgram.programId,
        preValidationPda: preValidationPDA!,
        postValidationPda: postValidationPDA!,
        userTokenAccount,
        mint: USDC_MINT,
        outputMint: USDC_MINT,
        intermediateInputTokenAccount,
        intermediateOutputTokenAccount: intermediateInputTokenAccount,
        recipientTokenAccount,
        gatewayFeeAccount: feeRecipientTokenAccount,
        protocolFeeAccount: adminTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      };

      await expect(async () => {
        const ix = await program.methods
          .executeComposable(instructionData, null)
          .accountsStrict(accounts)
          .remainingAccounts(remainingAccounts)
          .instruction();
        await send([ix], [gatewayAuthority]);
      }).rejects.toThrow();
    });
  });

  // Surface the surfpool-ready flag so jest doesn't silently no-op the suite
  // when Surfpool isn't running (the beforeAll throw already aborts, but this
  // is a cheap belt-and-braces guard).
  afterAll(() => {
    assert(surfpoolReady, "Surfpool was not ready — suite did not run");
  });
});
