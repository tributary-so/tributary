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
import {
  createMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccount,
  mintTo,
  approve,
} from "@solana/spl-token";
import { RecurringPayments } from "../target/types/recurring_payments";
import { RecurringPaymentsSDK } from "../sdk/src";
import assert from "assert";

describe("Recurring Payments", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .RecurringPayments as anchor.Program<RecurringPayments>;
  const wallet = provider.wallet as anchor.Wallet;

  let connection: any;

  // Common variables
  let admin: Keypair;
  let user: Keypair;
  let configPDA: PublicKey;
  let configBump: number;
  let tokenMint: PublicKey;
  let userTokenAccount: PublicKey;
  let mintAuthority: Keypair;
  let gatewayAuthority: Keypair;
  let feeRecipient: Keypair;
  let gatewayPDA: PublicKey;
  let gatewayBump: number;
  let recipient: Keypair;
  let recipientTokenAccount: PublicKey;
  let userPaymentPDA: PublicKey;
  let userPaymentBump: number;
  let paymentPolicyPDA: PublicKey;
  let paymentPolicyBump: number;
  let paymentsDelegate: PublicKey;
  let sdk: RecurringPaymentsSDK;

  async function fund(account: PublicKey, amount: number): Promise<void> {
    const transaction = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: account,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    const signature = await provider.sendAndConfirm(transaction);
    await provider.connection.confirmTransaction(
      signature,
      "processed" as Commitment
    );
  }

  beforeAll(async () => {
    // Create Solana Kite connection
    connection = provider.connection;
    sdk = new RecurringPaymentsSDK(connection, wallet);

    // Create wallets
    admin = Keypair.generate();
    await fund(admin.publicKey, 10);
    user = Keypair.generate();
    await fund(user.publicKey, 10);
    mintAuthority = Keypair.generate();
    await fund(mintAuthority.publicKey, 10);

    // Derive config PDA
    [configPDA, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    // Create token mint
    tokenMint = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6
    );

    // Get associated token account address for the user
    userTokenAccount = getAssociatedTokenAddressSync(tokenMint, user.publicKey);

    // Create associated token account and mint tokens to it
    await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      user.publicKey
    );

    // Mint tokens to the user's account
    await mintTo(
      connection,
      mintAuthority,
      tokenMint,
      userTokenAccount,
      mintAuthority,
      1000000n // 1 token with 6 decimals
    );

    // Create gateway authority and fee recipient
    gatewayAuthority = Keypair.generate();
    await fund(gatewayAuthority.publicKey, 10);
    feeRecipient = Keypair.generate();
    await fund(feeRecipient.publicKey, 1);

    // Derive gateway PDA
    [gatewayPDA, gatewayBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), gatewayAuthority.publicKey.toBuffer()],
      program.programId
    );

    // Create recipient
    recipient = Keypair.generate();
    await fund(recipient.publicKey, 1);

    // Derive user payment PDA
    [userPaymentPDA, userPaymentBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_payment"),
        user.publicKey.toBuffer(),
        tokenMint.toBuffer(),
      ],
      program.programId
    );

    // Derive payment policy PDA
    const policyId = 1;
    [paymentPolicyPDA, paymentPolicyBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_policy"),
        userPaymentPDA.toBuffer(),
        new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    // Derive payments delegate PDA
    [paymentsDelegate] = PublicKey.findProgramAddressSync(
      [Buffer.from("payments")],
      program.programId
    );

    // Create recipient token account
    recipientTokenAccount = await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      recipient.publicKey
    );

    // Create fee recipient token accounts (SDK will handle ATA creation automatically)
    await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      feeRecipient.publicKey
    );

    await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      admin.publicKey // config.fee_recipient
    );

    expect(program.programId.toString()).toEqual(
      "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ"
    );
  });

  test("Initialize program", async () => {
    // Update SDK to use admin wallet for this operation
    await sdk.updateWallet(new anchor.Wallet(admin));

    const initIx = await sdk.initialize(admin.publicKey);
    const tx = new Transaction().add(initIx);

    await sendAndConfirmTransaction(connection, tx, [admin]);

    const configAccount = await sdk.getProgramConfig(configPDA);

    expect(configAccount!.admin).toEqual(admin.publicKey);
    expect(configAccount!.feeRecipient).toEqual(admin.publicKey);
    expect(configAccount!.protocolFeeBps).toBe(100);
    expect(configAccount!.maxPoliciesPerUser).toBe(10);
    expect(configAccount!.emergencyPause).toBe(false);
    expect(configAccount!.bump).toBe(configBump);
  });

  test("Create user payment account", async () => {
    // Update SDK to use user wallet
    await sdk.updateWallet(new anchor.Wallet(user));

    const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
    const tx = new Transaction().add(createUserPaymentIx);

    await sendAndConfirmTransaction(connection, tx, [user]);

    const userPayment = await sdk.getUserPayment(userPaymentPDA);

    expect(userPayment!.owner).toEqual(user.publicKey);
    expect(userPayment!.tokenAccount).toEqual(userTokenAccount);
    expect(userPayment!.tokenMint).toEqual(tokenMint);
    expect(userPayment!.activePoliciesCount).toBe(0);
    expect(userPayment!.isActive).toBe(true);
    expect(userPayment!.bump).toBe(userPaymentBump);
  });

  test("Create payment gateway", async () => {
    const gatewayFeeBps = 250; // 2.5% fee

    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const createGatewayIx = await sdk.createPaymentGateway(
      gatewayFeeBps,
      feeRecipient.publicKey
    );
    const tx = new Transaction().add(createGatewayIx);

    await sendAndConfirmTransaction(connection, tx, [gatewayAuthority]);

    const gatewayAccount = await sdk.getPaymentGateway(gatewayPDA);

    expect(gatewayAccount!.authority).toEqual(gatewayAuthority.publicKey);
    expect(gatewayAccount!.feeRecipient).toEqual(feeRecipient.publicKey);
    expect(gatewayAccount!.gatewayFeeBps).toBe(gatewayFeeBps);
    expect(gatewayAccount!.isActive).toBe(true);
    expect(gatewayAccount!.totalProcessed.toNumber()).toBe(0);
    expect(gatewayAccount!.bump).toBe(gatewayBump);
    expect(gatewayAccount!.createdAt.toNumber()).toBeGreaterThan(0);
  });

  test("Create payment policy", async () => {
    const amount = new anchor.BN(10000); // 0.01 token with 6 decimals
    const intervalSeconds = new anchor.BN(86400); // 1 day
    const memo = new Uint8Array(64).fill(0);
    Buffer.from("test subscription").copy(memo);

    const policyType = {
      subscription: {
        amount: amount,
        intervalSeconds: intervalSeconds,
        autoRenew: true,
        maxRenewals: null,
        padding: Array(8).fill(new anchor.BN(0)),
      },
    };

    const paymentFrequency = { daily: {} };

    // Update SDK to use user wallet
    await sdk.updateWallet(new anchor.Wallet(user));

    const createPolicyIx = await sdk.createPaymentPolicy(
      tokenMint,
      recipient.publicKey,
      gatewayPDA,
      policyType,
      paymentFrequency,
      Array.from(memo),
      null // start_time
    );
    const tx = new Transaction().add(createPolicyIx);

    await sendAndConfirmTransaction(connection, tx, [user]);

    const policyAccount = await sdk.getPaymentPolicy(paymentPolicyPDA);

    expect(policyAccount!.userPayment).toEqual(userPaymentPDA);
    expect(policyAccount!.recipient).toEqual(recipient.publicKey);
    expect(policyAccount!.gateway).toEqual(gatewayPDA);
    expect(policyAccount!.policyId).toBe(1);
    expect(policyAccount!.status).toEqual({ active: {} });
    expect(policyAccount!.paymentFrequency).toEqual({ daily: {} });
    expect(policyAccount!.totalPaid.toNumber()).toBe(0);
    expect(policyAccount!.paymentCount).toBe(0);
    expect(policyAccount!.failedPaymentCount).toBe(0);
    expect(policyAccount!.bump).toBe(paymentPolicyBump);
    expect(policyAccount!.createdAt.toNumber()).toBeGreaterThan(0);

    // Verify policy type is subscription
    expect(policyAccount!.policyType.subscription).toBeDefined();
    expect(policyAccount!.policyType.subscription.amount.toNumber()).toBe(
      amount.toNumber()
    );
    expect(
      policyAccount!.policyType.subscription.intervalSeconds.toNumber()
    ).toBe(intervalSeconds.toNumber());
    expect(policyAccount!.policyType.subscription.autoRenew).toBe(true);

    // Check that user payment account was updated
    const updatedUserPayment = await sdk.getUserPayment(userPaymentPDA);
    expect(updatedUserPayment!.activePoliciesCount).toBe(1);
  });

  test("Execute payment fails without delegate approval", async () => {
    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    // Try to execute payment without delegate approval - should fail
    try {
      const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
      const tx = new Transaction().add(...executePaymentIxs);

      await sendAndConfirmTransaction(connection, tx, [gatewayAuthority]);

      assert(
        false,
        "Expected payment execution to fail without delegate approval"
      );
    } catch (error: any) {
      // Should fail due to insufficient delegate approval
      console.log(error.message);
      expect(error.message).toContain("No or incorrect delegate set in ata");
    }
  });

  test("Set delegate approval for payment execution", async () => {
    const amount = 1000000; // 1 token with 6 decimals

    await approve(
      connection,
      user,
      userTokenAccount,
      paymentsDelegate,
      user,
      amount
    );

    // Verify delegate approval was set
    const tokenAccountInfo = await connection.getParsedAccountInfo(
      userTokenAccount
    );
    const parsedData = tokenAccountInfo.value?.data as any;
    expect(parsedData.parsed.info.delegate).toEqual(
      paymentsDelegate.toString()
    );
    expect(parsedData.parsed.info.delegatedAmount.uiAmount).toBe(1);
  });

  test("Execute payment", async () => {
    const initialRecipientBalance = await connection.getTokenAccountBalance(
      recipientTokenAccount
    );

    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
    const tx = new Transaction().add(...executePaymentIxs);

    await sendAndConfirmTransaction(connection, tx, [gatewayAuthority]);

    // Verify payment was executed
    const finalRecipientBalance = await connection.getTokenAccountBalance(
      recipientTokenAccount
    );
    expect(finalRecipientBalance.value.uiAmount).toBeGreaterThan(
      initialRecipientBalance.value.uiAmount || 0
    );

    // Verify policy was updated
    const updatedPolicy = await sdk.getPaymentPolicy(paymentPolicyPDA);
    expect(updatedPolicy!.paymentCount).toBe(1);
    expect(updatedPolicy!.totalPaid.toNumber()).toBe(10000); // 0.01 token
    expect(updatedPolicy!.nextPaymentDue.toNumber()).toBeGreaterThan(
      Date.now() / 1000
    );

    // Verify gateway stats were updated
    const updatedGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(updatedGateway!.totalProcessed.toNumber()).toBe(10000);
  });

  test("Get all payment policies using SDK", async () => {
    // Get all payment policies
    const allPolicies = await sdk.getAllPaymentPolicies();

    expect(allPolicies.length).toBeGreaterThan(0);
    expect(allPolicies[0].account.policyId).toBe(1);
    expect(allPolicies[0].account.userPayment).toEqual(userPaymentPDA);
    expect(allPolicies[0].account.recipient).toEqual(recipient.publicKey);
    expect(allPolicies[0].account.gateway).toEqual(gatewayPDA);

    // Verify the policy type is subscription
    expect(allPolicies[0].account.policyType.subscription).toBeDefined();
    expect(
      allPolicies[0].account.policyType.subscription.amount.toNumber()
    ).toBe(10000);
  });

  test("Cannot execute payment twice within period", async () => {
    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    // First execution should succeed (already done in previous test)
    // Second execution should fail because next_payment_due is in the future
    try {
      const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
      const tx = new Transaction().add(...executePaymentIxs);

      await sendAndConfirmTransaction(connection, tx, [gatewayAuthority]);

      assert(
        false,
        "Expected payment execution to fail when next_payment_due is in future"
      );
    } catch (error: any) {
      console.log(error.message);
      expect(error.message).toContain("PaymentNotDue");
    }
  });

  test("Can execute payment when next_payment_due is in past", async () => {
    // Get current policy to check next_payment_due
    const policy = await sdk.getPaymentPolicy(paymentPolicyPDA);
    const nextPaymentDue = policy!.nextPaymentDue.toNumber();

    // Verify next payment is indeed in the future (from previous execution)
    expect(nextPaymentDue).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // Create a new policy with start_time in the past to test timing validation
    const amount = new anchor.BN(5000); // 0.005 token
    const intervalSeconds = new anchor.BN(3600); // 1 hour
    const memo = new Uint8Array(64).fill(0);
    Buffer.from("test policy 2").copy(memo);

    const policyType = {
      subscription: {
        amount: amount,
        intervalSeconds: intervalSeconds,
        autoRenew: true,
        maxRenewals: null,
        padding: Array(8).fill(new anchor.BN(0)),
      },
    };

    const paymentFrequency = { custom: { 0: new anchor.BN(3600) } }; // 1 hour in seconds

    // Derive second policy PDA
    const policyId2 = 2;
    const [paymentPolicy2PDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_policy"),
        userPaymentPDA.toBuffer(),
        new anchor.BN(policyId2).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    // Create policy with start_time in the past (2 hours ago)
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;

    // Update SDK to use user wallet
    await sdk.updateWallet(new anchor.Wallet(user));

    const createPolicy2Ix = await sdk.createPaymentPolicy(
      tokenMint,
      recipient.publicKey,
      gatewayPDA,
      policyType,
      paymentFrequency,
      Array.from(memo),
      new anchor.BN(twoHoursAgo) // start_time in past
    );
    const createTx = new Transaction().add(createPolicy2Ix);
    await sendAndConfirmTransaction(connection, createTx, [user]);

    // Execute payment on the new policy (should succeed since next_payment_due is in past)
    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const executePaymentIxs = await sdk.executePayment(paymentPolicy2PDA);
    const executeTx = new Transaction().add(...executePaymentIxs);

    await sendAndConfirmTransaction(connection, executeTx, [gatewayAuthority]);

    // Verify payment was executed
    const updatedPolicy = await sdk.getPaymentPolicy(paymentPolicy2PDA);
    expect(updatedPolicy!.paymentCount).toBe(1);
    expect(updatedPolicy!.totalPaid.toNumber()).toBe(5000);

    // Immediately try to execute again - should fail
    try {
      const executePaymentIxs2 = await sdk.executePayment(paymentPolicy2PDA);
      const executeTx2 = new Transaction().add(...executePaymentIxs2);

      await sendAndConfirmTransaction(connection, executeTx2, [
        gatewayAuthority,
      ]);

      assert(
        false,
        "Expected second payment execution to fail within same period"
      );
    } catch (error: any) {
      expect(error.message).toContain("PaymentNotDue");
    }
  });
});
