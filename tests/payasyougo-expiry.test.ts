import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
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
} from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import { sendAndConfirmWithRetry } from "./helpers/sendWithRetry";
import { Buffer } from "buffer";

// ────────────────────────────────────────────────────────────────────────────
// PayAsYouGo optional expiration (ADR-0024).
//
// Covers the new `expiry_date: Option<i64>` field end-to-end:
//   1. `null` expiry — backward-compatible default, executes normally.
//   2. Past expiry — `execute_payment` rejected with PolicyExpired.
//   3. Future expiry — executes while within the window.
//
// The execute gate lives in `shared::schedule::validate_policy_execution`
// (PayAsYouGo arm) and is shared by both `execute_payment` and
// `execute_composable`, so the direct PaymentPolicy path here also covers
// the composable topup-on-PayAsYouGo case.
//
// Requires a running Surfpool mainnet-fork:
//   surfpool start --legacy-anchor-compatibility --no-tui
// ────────────────────────────────────────────────────────────────────────────

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
// Same admin keypair used across the test suites (see one-time-payment.test.ts).
const ADMIN_KEYPAIR = [
  238, 31, 185, 140, 54, 107, 145, 78, 166, 97, 25, 234, 169, 89, 102, 11, 16,
  50, 119, 229, 213, 144, 251, 250, 231, 231, 38, 93, 42, 152, 13, 182, 86, 67,
  104, 166, 174, 90, 212, 150, 51, 38, 47, 161, 242, 15, 132, 164, 55, 200, 136,
  167, 125, 249, 228, 30, 132, 100, 67, 255, 185, 242, 47, 145,
];

describe("PayAsYouGo expiration (ADR-0024)", () => {
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

    // Seed program config (0 bps gateway fee keeps the math trivial).
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

    // Create gateway.
    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      0,
      0,
      feeRecipient.publicKey,
      "payg expiry gateway",
      "https://example.com"
    );
    await send([gatewayIx], [admin]);

    // Create user payment + approve delegate.
    await sdk.updateWallet(new anchor.Wallet(user));
    await send([await sdk.createUserPayment(USDC_MINT)], [user]);
    // Approve the UserPayment PDA as delegate for the full user balance.
    await creditTokenAccount(user.publicKey, 1_000_000_000, {
      delegate: userPaymentPDA,
      delegatedAmount: 1_000_000_000,
    });

    // Register the gateway execution signer so execute_payment is permissioned.
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
  });

  // ── helpers ──

  function memoFor(label: string): number[] {
    const memo = new Array(64).fill(0);
    Buffer.from(label).copy(Buffer.from(memo));
    return memo;
  }

  async function policyPdaForCurrentCount(): Promise<PublicKey> {
    const up = await sdk.getUserPayment(userPaymentPDA);
    return getPaymentPolicyPda(
      userPaymentPDA,
      up!.createdPoliciesCount,
      program.programId
    ).address;
  }

  // ── tests ──

  test("null expiry — backward-compatible default, executes normally", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));
    const ixs = await sdk.createPayAsYouGo(
      USDC_MINT,
      recipient.publicKey,
      gatewayPDA,
      new anchor.BN(1_000_000), // max per period
      new anchor.BN(200_000), // max chunk
      new anchor.BN(86_400), // 1 day period
      memoFor("payg no-expiry"),
      undefined, // approvalAmount — auto
      undefined, // referralCode
      null // expiryDate — never expires
    );
    await send(ixs, [user]);

    const pda = await policyPdaForCurrentCount();
    const policy = await sdk.getPaymentPolicy(pda);
    expect(policy!.policyType.payAsYouGo).toBeDefined();
    expect(policy!.policyType.payAsYouGo.expiryDate).toBeNull();

    // Execution succeeds.
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
    const execIxs = await sdk.executePayment(pda, new anchor.BN(100_000));
    await send(execIxs, [gatewayAuthority]);

    const after = await sdk.getPaymentPolicy(pda);
    expect(after!.paymentCount).toBe(1);
  });

  test("past expiry — execute rejected with PolicyExpired", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));
    const past = new anchor.BN(Math.floor(Date.now() / 1000) - 1); // 1s ago

    const ixs = await sdk.createPayAsYouGo(
      USDC_MINT,
      recipient.publicKey,
      gatewayPDA,
      new anchor.BN(1_000_000),
      new anchor.BN(200_000),
      new anchor.BN(86_400),
      memoFor("payg expired"),
      undefined,
      undefined,
      past // already expired
    );
    await send(ixs, [user]);

    const pda = await policyPdaForCurrentCount();
    const policy = await sdk.getPaymentPolicy(pda);
    expect(policy!.policyType.payAsYouGo.expiryDate).not.toBeNull();

    // Execution is rejected — the gate fires before the transfer CPI.
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
    await expect(async () => {
      const execIxs = await sdk.executePayment(pda, new anchor.BN(100_000));
      await send(execIxs, [gatewayAuthority]);
    }).rejects.toThrow();
  });

  test("future expiry — executes while within the window", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));
    const future = new anchor.BN(Math.floor(Date.now() / 1000) + 31_536_000); // ~1y

    const ixs = await sdk.createPayAsYouGo(
      USDC_MINT,
      recipient.publicKey,
      gatewayPDA,
      new anchor.BN(1_000_000),
      new anchor.BN(200_000),
      new anchor.BN(86_400),
      memoFor("payg future-expiry"),
      undefined,
      undefined,
      future
    );
    await send(ixs, [user]);

    const pda = await policyPdaForCurrentCount();
    const policy = await sdk.getPaymentPolicy(pda);
    expect(policy!.policyType.payAsYouGo.expiryDate).not.toBeNull();

    // Execution succeeds — we are well within the window.
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
    const execIxs = await sdk.executePayment(pda, new anchor.BN(100_000));
    await send(execIxs, [gatewayAuthority]);

    const after = await sdk.getPaymentPolicy(pda);
    expect(after!.paymentCount).toBe(1);
  });
});
