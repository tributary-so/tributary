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
import { Tributary as TributarySDK } from "../packages/sdk/src";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getPaymentPolicyPda,
  getPaymentsDelegatePda,
} from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import { sendAndConfirmWithRetry } from "./helpers/sendWithRetry";
import { ADMIN_KEYPAIR } from "./helpers/composable";
import assert from "assert";
import { Buffer } from "buffer";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// ────────────────────────────────────────────────────────────────────────────
// UpTo payment policy integration suite.
//
// Covers the UpTo PolicyType variant (ADR-0020) end-to-end:
//   settle(actual < max) → Completed; settle(max) ok; settle(actual > max) fails;
//   settle(0) ok; settle before valid_after fails; settle at/after deadline fails
//   (`PolicyExpired`); re-settle fails; recipient-triggerable.
//
// Requires a running Surfpool mainnet-fork (see Anchor.toml `surfpool` script).
// ────────────────────────────────────────────────────────────────────────────

describe("UpTo payment policy", () => {
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
  const feeRecipient = Keypair.generate();

  const configPDA = getConfigPda(program.programId).address;

  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let userTokenAccount: PublicKey;
  let recipientTokenAccount: PublicKey;
  let feeRecipientTokenAccount: PublicKey;
  let adminTokenAccount: PublicKey;

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
    signers: Keypair[]
  ): Promise<void> {
    const tx = new Transaction().add(...ixs);
    await sendAndConfirmWithRetry(connection, tx, signers, {
      commitment: "processed" as Commitment,
    });
  }

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);
    if (!(await surfpool.isSurfpool())) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

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

    // Fund USDC.
    await creditTokenAccount(user.publicKey, 1_000_000_000);
    await creditTokenAccount(recipient.publicKey, 0);
    await creditTokenAccount(feeRecipient.publicKey, 0);
    await creditTokenAccount(admin.publicKey, 0);

    // Seed program config.
    await sdk.updateWallet(new anchor.Wallet(admin));
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
      "upto test gateway",
      "https://example.com"
    );
    await send([gatewayIx], [admin]);
  });

  // Direct PaymentPolicy UpTo flow.
  describe("direct PaymentPolicy UpTo", () => {
    test("create UserPayment", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));
      const ix = await sdk.createUserPayment(USDC_MINT);
      await send([ix], [user]);
      const up = await sdk.getUserPayment(userPaymentPDA);
      expect(up!.owner).toEqual(user.publicKey);
      expect(up!.tokenMint).toEqual(USDC_MINT);
    });

    test("create UpTo policy (immediate, long deadline)", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));
      const maxAmount = new anchor.BN(100_000_000); // 100 USDC ceiling
      const deadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 31_536_000
      ); // +1y
      const memo = new Array(64).fill(0);
      Buffer.from("upto immediate").copy(Buffer.from(memo));

      const ix = await sdk.getCreateUpToPolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        maxAmount,
        null, // immediate
        deadline,
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
      expect(policy!.policyType.upTo).toBeDefined();
      expect(policy!.policyType.upTo.maxAmount.toNumber()).toBe(100_000_000);
      expect(policy!.policyType.upTo.validAfter.toNumber()).toBe(0);
      expect(policy!.policyType.upTo.deadline.toNumber()).toBe(
        deadline.toNumber()
      );
      expect(policy!.status).toEqual({ active: {} });
    });

    test("approve delegate on user token account", async () => {
      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });
    });

    test("settle(actual < max) — transitions to Completed", async () => {
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        1,
        program.programId
      ).address;

      const recipientBefore = Number(
        (await connection.getTokenAccountBalance(recipientTokenAccount)).value
          .amount
      );

      const actual = new anchor.BN(42_000_000); // 42 USDC (< 100 max)
      const ixs = await sdk.settleUpTo(pda, actual);
      await send(ixs, [gatewayAuthority]);

      const recipientAfter = Number(
        (await connection.getTokenAccountBalance(recipientTokenAccount)).value
          .amount
      );
      expect(recipientAfter - recipientBefore).toBe(42_000_000);

      const policy = await sdk.getPaymentPolicy(pda);
      expect(policy!.status).toEqual({ completed: {} });
      expect(policy!.paymentCount).toBe(1);
      expect(policy!.totalPaid.toNumber()).toBe(42_000_000);
    });

    test("re-settle fails (status = Completed)", async () => {
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        1,
        program.programId
      ).address;

      await expect(async () => {
        const ixs = await sdk.settleUpTo(pda, new anchor.BN(1_000_000));
        await send(ixs, [gatewayAuthority]);
      }).rejects.toThrow();
    });

    test("settle(max) ok", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));
      const max = new anchor.BN(10_000_000); // 10 USDC
      const deadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 31_536_000
      );
      const memo = new Array(64).fill(0);
      Buffer.from("upto max settle").copy(Buffer.from(memo));

      const ix = await sdk.getCreateUpToPolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        max,
        null,
        deadline,
        memo
      );
      await send([ix], [user]);

      // Refresh delegate approval (consumed by prior settle).
      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        2,
        program.programId
      ).address;
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
      const ixs = await sdk.settleUpTo(pda, max);
      await send(ixs, [gatewayAuthority]);

      const policy = await sdk.getPaymentPolicy(pda);
      expect(policy!.status).toEqual({ completed: {} });
      expect(policy!.totalPaid.toNumber()).toBe(10_000_000);
    });

    test("settle(actual > max) fails", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));
      const max = new anchor.BN(10_000_000); // 10 USDC
      const deadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 31_536_000
      );
      const memo = new Array(64).fill(0);
      Buffer.from("upto over-max").copy(Buffer.from(memo));

      const ix = await sdk.getCreateUpToPolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        max,
        null,
        deadline,
        memo
      );
      await send([ix], [user]);

      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        3,
        program.programId
      ).address;
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
      await expect(async () => {
        const ixs = await sdk.settleUpTo(
          pda,
          new anchor.BN(11_000_000) // > max
        );
        await send(ixs, [gatewayAuthority]);
      }).rejects.toThrow();

      // Policy should still be Active (execute failed).
      const policy = await sdk.getPaymentPolicy(pda);
      expect(policy!.status).toEqual({ active: {} });
    });

    test("settle(0) ok — no usage, no charge", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));
      const max = new anchor.BN(10_000_000);
      const deadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 31_536_000
      );
      const memo = new Array(64).fill(0);
      Buffer.from("upto zero settle").copy(Buffer.from(memo));

      const ix = await sdk.getCreateUpToPolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        max,
        null,
        deadline,
        memo
      );
      await send([ix], [user]);

      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        4,
        program.programId
      ).address;

      const recipientBefore = Number(
        (await connection.getTokenAccountBalance(recipientTokenAccount)).value
          .amount
      );

      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
      const ixs = await sdk.settleUpTo(pda, new anchor.BN(0));
      await send(ixs, [gatewayAuthority]);

      // No tokens moved.
      const recipientAfter = Number(
        (await connection.getTokenAccountBalance(recipientTokenAccount)).value
          .amount
      );
      expect(recipientAfter).toBe(recipientBefore);

      // But the policy is consumed.
      const policy = await sdk.getPaymentPolicy(pda);
      expect(policy!.status).toEqual({ completed: {} });
      expect(policy!.paymentCount).toBe(1);
      expect(policy!.totalPaid.toNumber()).toBe(0);
    });

    test("settle before valid_after fails (PaymentNotDue)", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));
      const far = new anchor.BN(Math.floor(Date.now() / 1000) + 31_536_000); // +1y
      const deadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 63_072_000
      ); // +2y
      const memo = new Array(64).fill(0);
      Buffer.from("upto future validAfter").copy(Buffer.from(memo));

      const ix = await sdk.getCreateUpToPolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(10_000_000),
        far,
        deadline,
        memo
      );
      await send([ix], [user]);

      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        5,
        program.programId
      ).address;
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
      await expect(async () => {
        const ixs = await sdk.settleUpTo(pda, new anchor.BN(1_000_000));
        await send(ixs, [gatewayAuthority]);
      }).rejects.toThrow();
    });

    test("settle at/after deadline fails (PolicyExpired)", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));
      // Deadline 1s in the past — settled immediately will be > deadline.
      const past = new anchor.BN(Math.floor(Date.now() / 1000) - 1);
      const memo = new Array(64).fill(0);
      Buffer.from("upto expired").copy(Buffer.from(memo));

      const ix = await sdk.getCreateUpToPolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(10_000_000),
        null,
        past,
        memo
      );
      await send([ix], [user]);

      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        6,
        program.programId
      ).address;
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
      await expect(async () => {
        const ixs = await sdk.settleUpTo(pda, new anchor.BN(1_000_000));
        await send(ixs, [gatewayAuthority]);
      }).rejects.toThrow();
    });

    test("recipient-triggerable settle", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));
      const max = new anchor.BN(10_000_000);
      const deadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 31_536_000
      );
      const memo = new Array(64).fill(0);
      Buffer.from("upto recipient settle").copy(Buffer.from(memo));

      const ix = await sdk.getCreateUpToPolicyInstruction(
        USDC_MINT,
        recipient.publicKey,
        gatewayPDA,
        max,
        null,
        deadline,
        memo
      );
      await send([ix], [user]);

      await creditTokenAccount(user.publicKey, 1_000_000_000, {
        delegate: userPaymentPDA,
        delegatedAmount: 1_000_000_000,
      });

      const pda = getPaymentPolicyPda(
        userPaymentPDA,
        7,
        program.programId
      ).address;

      // Recipient signs the settle tx — the program allows it for UpTo.
      await sdk.updateWallet(new anchor.Wallet(recipient));
      const ixs = await sdk.settleUpTo(
        pda,
        new anchor.BN(5_000_000) // 5 USDC, < 10 max
      );
      // Provide recipient as additional signer; fee_payer defaults to wallet
      // (the SDK provider wallet), so we also need recipient's signature on
      // any accounts it owns. The recipient-triggerable constraint is checked
      // against `fee_payer.key()`, so we need recipient as fee payer — the
      // Surfpool helper funds recipient above.
      await expect(send(ixs, [recipient])).resolves.not.toThrow();

      const policy = await sdk.getPaymentPolicy(pda);
      expect(policy!.status).toEqual({ completed: {} });
    });
  });
});
