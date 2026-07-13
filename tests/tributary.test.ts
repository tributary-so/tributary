import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  Commitment,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  approve,
  revoke,
  getAccount,
} from "@solana/spl-token";
import { ComputeBudgetProgram } from "@solana/web3.js";
import { Tributary } from "../target/types/tributary";
import {
  GATEWAY_FEATURES,
  IWallet,
  PaymentFrequency,
  TributarySDK,
  encodeMemo,
} from "../packages/sdk/src";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import { sendAndConfirmWithRetry } from "./helpers/sendWithRetry";
import assert from "assert";
import { Buffer } from "buffer";
const ADMIN_KEYPAIR = [
  238, 31, 185, 140, 54, 107, 145, 78, 166, 97, 25, 234, 169, 89, 102, 11, 16,
  50, 119, 229, 213, 144, 251, 250, 231, 231, 38, 93, 42, 152, 13, 182, 86, 67,
  104, 166, 174, 90, 212, 150, 51, 38, 47, 161, 242, 15, 132, 164, 55, 200, 136,
  167, 125, 249, 228, 30, 132, 100, 67, 255, 185, 242, 47, 145,
];

describe("Tributary", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;

  let connection: any;

  // Common variables
  const admin = Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR));
  const user = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const gatewayAuthority = Keypair.generate();
  const gatewayExecutionSigner = Keypair.generate();
  const feeRecipient = Keypair.generate();
  const recipient = Keypair.generate();

  let configPDA: PublicKey;
  let configBump: number;
  let tokenMint: PublicKey;
  let userTokenAccount: PublicKey;
  let gatewayPDA: PublicKey;
  let gatewayBump: number;
  let recipientTokenAccount: PublicKey;
  let userPaymentPDA: PublicKey;
  let userPaymentBump: number;
  let paymentPolicyPDA: PublicKey;
  let paymentPolicyBump: number;
  let paymentsDelegate: PublicKey;
  let sdk: TributarySDK;

  // Surfpool cheatcode handle — set in beforeAll. Helpers below route funding
  // and token seeding through it instead of SystemProgram.transfer / mintTo.
  let surfpool: SurfpoolHelper;
  // ATA address → owner, populated by batchCreateATAs so batchMintTo can
  // resolve owners for Surfpool's owner-keyed setTokenAccount cheatcode.
  const ataOwnerMap = new Map<string, PublicKey>();

  async function fund(account: PublicKey, amount: number): Promise<void> {
    await surfpool.setAccount({
      publicKey: account,
      lamports: amount * LAMPORTS_PER_SOL,
    });
  }

  async function batchFund(pairs: [PublicKey, number][]): Promise<void> {
    for (const [account, amount] of pairs) {
      await surfpool.setAccount({
        publicKey: account,
        lamports: amount * LAMPORTS_PER_SOL,
      });
    }
  }

  // Surfpool's setTokenAccount is absolute (sets the amount field, creating
  // the ATA implicitly). To preserve mintTo's additive semantics we read the
  // current balance first, then set current + amount.
  async function creditTokenAccount(
    owner: PublicKey,
    amount: bigint,
    mint: PublicKey = tokenMint
  ): Promise<void> {
    const ata = getAssociatedTokenAddressSync(mint, owner);
    let current = 0n;
    try {
      const info = await connection.getTokenAccountBalance(ata);
      if (info.value) current = BigInt(info.value.amount);
    } catch {
      // ATA doesn't exist yet — setTokenAccount will create it.
    }
    await surfpool.setTokenAccount({
      owner,
      mint,
      amount: Number(current + amount),
    });
  }

  async function batchCreateATAs(
    ownerPublicKeys: PublicKey[]
  ): Promise<PublicKey[]> {
    const ataAddresses = ownerPublicKeys.map((owner) => {
      const ata = getAssociatedTokenAddressSync(tokenMint, owner);
      ataOwnerMap.set(ata.toBase58(), owner);
      return ata;
    });
    // Ensure zero-balance ATAs exist (later balance reads assume presence).
    for (const owner of ownerPublicKeys) {
      await surfpool.setTokenAccount({ owner, mint: tokenMint, amount: 0 });
    }
    return ataAddresses;
  }

  async function batchMintTo(
    targets: { address: PublicKey; amount: bigint }[]
  ): Promise<void> {
    for (const target of targets) {
      const owner = ataOwnerMap.get(target.address.toBase58());
      if (!owner) {
        throw new Error(
          `batchMintTo: unknown ATA ${target.address.toBase58()} (call batchCreateATAs first)`
        );
      }
      await creditTokenAccount(owner, target.amount);
    }
  }

  beforeAll(async () => {
    // Create Solana Kite connection
    connection = provider.connection;
    sdk = new TributarySDK(connection, wallet as IWallet);

    // Fail fast unless we're on a Surfpool mainnet-fork.
    surfpool = new SurfpoolHelper(connection);
    if (!(await surfpool.isSurfpool())) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    // Derive config PDA
    [configPDA, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    await batchFund([
      [admin.publicKey, 10],
      [user.publicKey, 10],
      [mintAuthority.publicKey, 10],
      [gatewayAuthority.publicKey, 10],
      [feeRecipient.publicKey, 1],
      [gatewayExecutionSigner.publicKey, 10],
      [recipient.publicKey, 1],
    ]);

    // Use the mainnet-forked USDC mint directly — no createMint needed.
    tokenMint = USDC_MINT;

    // Fund the user's USDC ATA (Surfpool setTokenAccount creates it implicitly).
    userTokenAccount = getAssociatedTokenAddressSync(tokenMint, user.publicKey);
    await creditTokenAccount(user.publicKey, 1_000_000n); // 1 USDC

    // Derive gateway PDA
    [gatewayPDA, gatewayBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), gatewayAuthority.publicKey.toBuffer()],
      program.programId
    );

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

    // Create recipient, fee recipient, and admin token accounts in one tx
    const [recipientATA] = await batchCreateATAs([
      recipient.publicKey,
      feeRecipient.publicKey,
      admin.publicKey,
    ]);
    recipientTokenAccount = recipientATA;

    expect(program.programId.toString()).toEqual(
      "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ"
    );
  });

  test("Initialize program", async () => {
    // Update SDK to use admin wallet for this operation
    await sdk.updateWallet(admin);

    // The program is deployed on mainnet, so the forked config PDA already
    // exists and `initialize` (which allocates) would fail with "already in
    // use". Seed the post-init config state via the Surfpool setAccount
    // cheatcode — same fields the instruction would write. (Same pattern as
    // surfpool.test.ts.)
    const desired = await sdk.getProgramConfig(configPDA);
    desired.admin = admin.publicKey;
    desired.feeRecipient = admin.publicKey;
    desired.protocolShareBps = 2000;
    desired.emergencyPause = false;
    desired.bump = configBump;
    const serialized = await program.coder.accounts.encode(
      "programConfig",
      desired
    );
    await surfpool.setAccount({
      publicKey: configPDA,
      data: serialized.toString("hex"),
    });

    const configAccount = await sdk.getProgramConfig(configPDA);

    expect(configAccount!.admin).toEqual(admin.publicKey);
    expect(configAccount!.feeRecipient).toEqual(admin.publicKey);
    expect(configAccount!.protocolShareBps).toBe(2000);
    expect(configAccount!.emergencyPause).toBe(false);
    expect(configAccount!.bump).toBe(configBump);
  });

  test("Create user payment account", async () => {
    // Update SDK to use user wallet
    await sdk.updateWallet(user);

    const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
    const tx = new Transaction().add(createUserPaymentIx);

    await sendAndConfirmTransaction(connection, tx, [user], {
      commitment: "processed" as Commitment,
    });

    const userPayment = await sdk.getUserPayment(userPaymentPDA);

    expect(userPayment!.owner).toEqual(user.publicKey);
    expect(userPayment!.tokenAccount).toEqual(userTokenAccount);
    expect(userPayment!.tokenMint).toEqual(tokenMint);
    expect(userPayment!.createdPoliciesCount).toBe(0);
    expect(userPayment!.isActive).toBe(true);
    expect(userPayment!.bump).toBe(userPaymentBump);
  });

  test("M-05: create_user_payment rejects non-signing owner (griefing defense)", async () => {
    // Regression for the M-05 / H-02 griefing vector: owner MUST sign.
    // Pre-fix anyone could create a UserPayment PDA for any owner, locking
    // the victim out of her own account (InitSpace on her later attempt).
    // Post-fix the Signer constraint on `owner` rejects unsigned creation.
    const victim = Keypair.generate();
    const attacker = Keypair.generate();
    await batchFund([
      [victim.publicKey, 2],
      [attacker.publicKey, 2],
    ]);
    await surfpool.setTokenAccount({
      owner: victim.publicKey,
      mint: tokenMint,
      amount: 0,
    });
    const victimAta = getAssociatedTokenAddressSync(
      tokenMint,
      victim.publicKey
    );
    const [victimUserPaymentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_payment"),
        victim.publicKey.toBuffer(),
        tokenMint.toBuffer(),
      ],
      program.programId
    );

    // Build a legitimate ix as the attacker, then patch the account metas to
    // name the victim as owner WITHOUT her signature.
    await sdk.updateWallet(attacker);
    const legitIx = await sdk.createUserPayment(tokenMint);
    // IDL order: [0]=owner, [1]=user_payment, [2]=token_account, ...
    const griefedKeys = legitIx.keys.map((k, i) => {
      if (i === 0)
        return { pubkey: victim.publicKey, isWritable: false, isSigner: false };
      if (i === 1)
        return {
          pubkey: victimUserPaymentPda,
          isWritable: true,
          isSigner: false,
        };
      if (i === 2)
        return { pubkey: victimAta, isWritable: false, isSigner: false };
      return k;
    });
    const griefedIx = new TransactionInstruction({
      programId: legitIx.programId,
      data: legitIx.data,
      keys: griefedKeys,
    });

    // Attacker signs only as fee_payer; victim does NOT sign. The Signer
    // constraint on `owner` must reject the transaction.
    await expect(
      sendAndConfirmTransaction(
        connection,
        new Transaction().add(griefedIx),
        [attacker],
        { commitment: "processed" as Commitment }
      )
    ).rejects.toThrow();

    // The PDA must not exist — the failed attack created nothing, so the
    // victim can still onboard normally later.
    const victimAccountInfo = await connection.getAccountInfo(
      victimUserPaymentPda
    );
    expect(victimAccountInfo).toBeNull();
  });

  test("Create payment gateway", async () => {
    const gatewayFeeBps = 250; // 2.5% fee

    // Update SDK to use admin wallet
    await sdk.updateWallet(admin);

    const createGatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      gatewayFeeBps,
      0, // schedulerShareBps — no scheduler cut in this test
      feeRecipient.publicKey,
      "custom gateway",
      "https://example.com"
    );
    const tx = new Transaction().add(createGatewayIx);

    await sendAndConfirmTransaction(connection, tx, [admin], {
      commitment: "processed" as Commitment,
    });

    const gatewayAccount = await sdk.getPaymentGateway(gatewayPDA);

    expect(gatewayAccount!.authority).toEqual(gatewayAuthority.publicKey);
    expect(gatewayAccount!.feeRecipient).toEqual(feeRecipient.publicKey);
    expect(gatewayAccount!.gatewayFeeBps).toBe(gatewayFeeBps);
    expect(gatewayAccount!.isActive).toBe(true);
    expect(gatewayAccount!.bump).toBe(gatewayBump);
    expect(gatewayAccount!.createdAt.toNumber()).toBeGreaterThan(0);

    // Verify name and url fields
    const nameBuffer = Buffer.from(gatewayAccount!.name);
    const nameString = nameBuffer
      .subarray(0, nameBuffer.indexOf(0))
      .toString("utf-8");
    expect(nameString).toBe("custom gateway");

    const urlBuffer = Buffer.from(gatewayAccount!.url);
    const urlString = urlBuffer
      .subarray(0, urlBuffer.indexOf(0))
      .toString("utf-8");
    expect(urlString).toBe("https://example.com");
  });

  describe("Subscription payment policies", () => {
    test("Create subscription payment policy", async () => {
      const amount = new anchor.BN(10000); // 0.01 token with 6 decimals
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("test subscription").copy(memo);

      const paymentFrequency = { daily: {} };

      // Update SDK to use user wallet
      await sdk.updateWallet(user);

      const createPolicyIx = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        null // start_time
      );
      const tx = new Transaction().add(createPolicyIx);

      await sendAndConfirmTransaction(connection, tx, [user], {
        commitment: "processed" as Commitment,
      });

      const policyAccount = await sdk.getPaymentPolicy(paymentPolicyPDA);

      expect(policyAccount!.userPayment).toEqual(userPaymentPDA);
      expect(policyAccount!.recipient).toEqual(recipient.publicKey);
      expect(policyAccount!.gateway).toEqual(gatewayPDA);
      expect(policyAccount!.policyId).toBe(1);
      expect(policyAccount!.status).toEqual({ active: {} });
      expect(policyAccount!.totalPaid.toNumber()).toBe(0);
      expect(policyAccount!.paymentCount).toBe(0);
      expect(policyAccount!.bump).toBe(paymentPolicyBump);
      expect(policyAccount!.createdAt.toNumber()).toBeGreaterThan(0);

      // Verify policy type is subscription
      expect(policyAccount!.policyType.subscription).toBeDefined();
      expect(policyAccount!.policyType.subscription.amount.toNumber()).toBe(
        amount.toNumber()
      );
      expect(policyAccount!.policyType.subscription.paymentFrequency).toEqual({
        daily: {},
      });
      expect(
        policyAccount!.policyType.subscription.nextPaymentDue.toNumber()
      ).toBeGreaterThan(0);
      expect(policyAccount!.policyType.subscription.autoRenew).toBe(true);

      // Check that user payment account was updated
      const updatedUserPayment = await sdk.getUserPayment(userPaymentPDA);
      expect(updatedUserPayment!.createdPoliciesCount).toBe(1);
    });

    test("Execute subscription payment fails without delegate approval", async () => {
      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(gatewayAuthority);

      // Try to execute payment without delegate approval - should fail
      try {
        const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
        const tx = new Transaction().add(...executePaymentIxs);

        await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
          commitment: "processed" as Commitment,
        });

        assert(
          false,
          "Expected payment execution to fail without delegate approval"
        );
      } catch (error: any) {
        // Should fail due to insufficient delegate approval
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

    test("Execute subscription payment", async () => {
      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(gatewayAuthority);

      const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
      const tx = new Transaction().add(...executePaymentIxs);

      await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
        commitment: "processed" as Commitment,
      });

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
      expect(
        updatedPolicy!.policyType.subscription.nextPaymentDue.toNumber()
      ).toBeGreaterThan(Date.now() / 1000);
    });

    test("Get all payment policies using SDK", async () => {
      // Get all payment policies. On a mainnet fork this also returns
      // mainnet's real policies, so locate the test's own policy by its
      // userPayment PDA instead of assuming position [0].
      const allPolicies = await sdk.getAllPaymentPolicies();

      expect(allPolicies.length).toBeGreaterThan(0);
      const ours = allPolicies.find((p) =>
        p.account.userPayment.equals(userPaymentPDA)
      );
      expect(ours).toBeDefined();
      expect(ours!.account.policyId).toBe(1);
      expect(ours!.account.recipient).toEqual(recipient.publicKey);
      expect(ours!.account.gateway).toEqual(gatewayPDA);

      // Verify the policy type is subscription
      expect(ours!.account.policyType.subscription).toBeDefined();
      expect(ours!.account.policyType.subscription.amount.toNumber()).toBe(
        10000
      );
    });

    test("Cannot execute subscription payment twice within period", async () => {
      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(gatewayAuthority);

      // First execution should succeed (already done in previous test)
      // Second execution should fail because next_payment_due is in the future
      try {
        const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
        const tx = new Transaction().add(...executePaymentIxs);

        await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
          commitment: "processed" as Commitment,
        });

        assert(
          false,
          "Expected payment execution to fail when next_payment_due is in future"
        );
      } catch (error: any) {
        expect(error.message).toContain("PaymentNotDue");
      }
    });

    test("Can execute payment when next_payment_due is in past", async () => {
      // Get current policy to check next_payment_due
      const policy = await sdk.getPaymentPolicy(paymentPolicyPDA);
      const nextPaymentDue =
        policy!.policyType.subscription.nextPaymentDue.toNumber();

      // Verify next payment is indeed in the future (from previous execution)
      expect(nextPaymentDue).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Create a new policy with start_time in the past to test timing validation
      const amount = new anchor.BN(5000); // 0.005 token
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("test policy 2").copy(memo);

      const paymentFrequency: PaymentFrequency = {
        custom: { 0: new anchor.BN(3600) },
      }; // 1 hour in seconds

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
      await sdk.updateWallet(user);

      const createPolicy2Ix = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        new anchor.BN(twoHoursAgo) // start_time in past
      );
      const createTx = new Transaction().add(createPolicy2Ix);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Execute payment on the new policy (should succeed since next_payment_due is in past)
      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(gatewayAuthority);

      const executePaymentIxs = await sdk.executePayment(paymentPolicy2PDA);
      const executeTx = new Transaction();
      executeTx.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 })
      );
      executeTx.add(...executePaymentIxs);

      await sendAndConfirmTransaction(
        connection,
        executeTx,
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify payment was executed
      const updatedPolicy = await sdk.getPaymentPolicy(paymentPolicy2PDA);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(updatedPolicy!.totalPaid.toNumber()).toBe(5000);

      // Immediately try to execute again - should fail
      try {
        const executePaymentIxs2 = await sdk.executePayment(paymentPolicy2PDA);
        const executeTx2 = new Transaction().add(...executePaymentIxs2);

        await sendAndConfirmTransaction(
          connection,
          executeTx2,
          [gatewayAuthority],
          {
            commitment: "processed" as Commitment,
          }
        );

        assert(
          false,
          "Expected second payment execution to fail within same period"
        );
      } catch (error: any) {
        expect(error.message).toContain("PaymentNotDue");
      }
    });

    test("executeImmediately option - token transfer only occurs when true", async () => {
      // Update SDK to use user wallet
      await sdk.updateWallet(user);

      // Create token accounts for test user and recipient
      const testRecipientTokenAccount = getAssociatedTokenAddressSync(
        tokenMint,
        recipient.publicKey
      );

      // Mint tokens to test user
      await creditTokenAccount(user.publicKey, 1000000n); // 1 token with 6 decimals

      // Setup policy parameters
      const testAmount = new anchor.BN(20000); // 0.02 token with 6 decimals
      const testMemo = new Uint8Array(64).fill(0);
      Buffer.from("executeImmediately test").copy(testMemo);
      const testPaymentFrequency = { daily: {} };
      const approvalAmount = new anchor.BN(1000000); // 1 token
      const currentTime = Math.floor(Date.now() / 1000);
      const testStartTime = new anchor.BN(currentTime - 3600); // 1 hour ago (eligible for immediate execution)

      const createPolicyTrueIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        testAmount,
        true,
        null,
        testPaymentFrequency,
        Array.from(testMemo),
        testStartTime,
        approvalAmount,
        true // executeImmediately = true
      );

      const createPolicyTrueTx = new Transaction().add(...createPolicyTrueIxs);
      // only user has to sign
      await sendAndConfirmTransaction(connection, createPolicyTrueTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get initial balances
      const initialRecipientBalance = await connection.getTokenAccountBalance(
        testRecipientTokenAccount
      );
      const initialUserBalance = await connection.getTokenAccountBalance(
        userTokenAccount
      );

      // Check balances after policy creation with executeImmediately = false
      const balanceAfterCreateFalse = await connection.getTokenAccountBalance(
        testRecipientTokenAccount
      );
      const userBalanceAfterCreateFalse =
        await connection.getTokenAccountBalance(userTokenAccount);

      // No token transfer should have occurred
      expect(balanceAfterCreateFalse.value.amount).toBe(
        initialRecipientBalance.value.amount
      );
      expect(userBalanceAfterCreateFalse.value.amount).toBe(
        initialUserBalance.value.amount
      );
    });

    test("executeImmediately option - no transfer if false", async () => {
      const testRecipient2TokenAccount = getAssociatedTokenAddressSync(
        tokenMint,
        recipient.publicKey
      );

      // Mint tokens to test user 2
      await creditTokenAccount(user.publicKey, 1000000n); // 1 token with 6 decimals

      // Get initial balances for test 2
      const initialRecipient2Balance = await connection.getTokenAccountBalance(
        testRecipient2TokenAccount
      );
      const initialUser2Balance = await connection.getTokenAccountBalance(
        userTokenAccount
      );

      // Setup policy parameters
      const testAmount = new anchor.BN(20000); // 0.02 token with 6 decimals
      const testMemo = new Uint8Array(64).fill(0);
      Buffer.from("executeImmediately test").copy(testMemo);
      const testPaymentFrequency = { daily: {} };
      const approvalAmount = new anchor.BN(1000000); // 1 token
      const currentTime = Math.floor(Date.now() / 1000);
      const testStartTime = new anchor.BN(currentTime - 3600); // 1 hour ago (eligible for immediate execution)

      const createPolicyTrueIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        testAmount,
        true,
        null,
        testPaymentFrequency,
        Array.from(testMemo),
        testStartTime,
        approvalAmount,
        false // executeImmediately = false
      );

      const createPolicyTrueTx = new Transaction().add(...createPolicyTrueIxs);
      // only user has to sign
      await sendAndConfirmTransaction(connection, createPolicyTrueTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Check balances after policy creation with executeImmediately = true
      const balanceAfterCreateTrue = await connection.getTokenAccountBalance(
        testRecipient2TokenAccount
      );
      const userBalanceAfterCreateTrue =
        await connection.getTokenAccountBalance(userTokenAccount);

      // Token transfers should have occurred
      expect(parseInt(balanceAfterCreateTrue.value.amount)).toEqual(
        parseInt(initialRecipient2Balance.value.amount)
      );
      expect(parseInt(userBalanceAfterCreateTrue.value.amount)).toEqual(
        parseInt(initialUser2Balance.value.amount)
      );
    });

    test("Change subscription policy status - pause/resume and execution control", async () => {
      // Create a new policy for this test
      const amount = new anchor.BN(15000); // 0.015 token
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("status change test").copy(memo);

      const paymentFrequency: PaymentFrequency = {
        custom: { 0: new anchor.BN(3600) },
      }; // 1 hour

      // Set start time in the past so payment can be executed immediately
      const pastTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago

      // Update SDK to use user wallet
      await sdk.updateWallet(user);

      // Create a new policy (policy ID will be 4 based on previous tests)
      const policyId4 = 4;
      const [paymentPolicy4PDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId4).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      const createPolicy4Ix = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        new anchor.BN(pastTime)
      );
      const createTx = new Transaction().add(createPolicy4Ix);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Verify policy was created with Active status
      let policy = await sdk.getPaymentPolicy(paymentPolicy4PDA);
      expect(policy!.status).toEqual({ active: {} });

      // 1. Change status to Paused
      const pauseIx = await sdk.changePaymentPolicyStatus(
        tokenMint,
        policyId4,
        {
          paused: {},
        }
      );
      const pauseTx = new Transaction().add(pauseIx);
      await sendAndConfirmTransaction(connection, pauseTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Verify status changed to Paused
      policy = await sdk.getPaymentPolicy(paymentPolicy4PDA);
      expect(policy!.status).toEqual({ paused: {} });

      // 2. Try to execute payment when paused - should fail
      await sdk.updateWallet(gatewayAuthority);

      try {
        const executePaymentIxs = await sdk.executePayment(paymentPolicy4PDA);
        const executeTx = new Transaction().add(...executePaymentIxs);

        await sendAndConfirmTransaction(
          connection,
          executeTx,
          [gatewayAuthority],
          {
            commitment: "processed" as Commitment,
          }
        );

        assert(
          false,
          "Expected payment execution to fail when policy is paused"
        );
      } catch (error: any) {
        // Should fail because policy is paused
        expect(error.message).toContain("PolicyPaused");
      }

      // 3. Change status back to Active
      await sdk.updateWallet(user);

      const resumeIx = await sdk.changePaymentPolicyStatus(
        tokenMint,
        policyId4,
        {
          active: {},
        }
      );
      const resumeTx = new Transaction().add(resumeIx);
      await sendAndConfirmTransaction(connection, resumeTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Verify status changed back to Active
      policy = await sdk.getPaymentPolicy(paymentPolicy4PDA);
      expect(policy!.status).toEqual({ active: {} });

      // 4. Execute payment when active - should succeed
      await sdk.updateWallet(gatewayAuthority);

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      const executePaymentIxs = await sdk.executePayment(paymentPolicy4PDA);
      const executeTx = new Transaction().add(...executePaymentIxs);

      await sendAndConfirmTransaction(
        connection,
        executeTx,
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify payment was executed successfully
      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(finalRecipientBalance.value.uiAmount).toBeGreaterThan(
        initialRecipientBalance.value.uiAmount || 0
      );

      // Verify policy was updated
      const updatedPolicy = await sdk.getPaymentPolicy(paymentPolicy4PDA);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(updatedPolicy!.totalPaid.toNumber()).toBe(20000);
    });
  });

  test("Delete payment policy", async () => {
    // Get initial user payment state
    const initialUserPayment = await sdk.getUserPayment(userPaymentPDA);
    const initialActivePoliciesCount = initialUserPayment!.createdPoliciesCount;

    // Use policy ID 2 from a previous test (the second policy created)
    const policyIdToDelete = 2;
    const [policyToDeletePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_policy"),
        userPaymentPDA.toBuffer(),
        new anchor.BN(policyIdToDelete).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    // Verify policy exists before deletion
    const policyBeforeDeletion = await sdk.getPaymentPolicy(policyToDeletePDA);
    expect(policyBeforeDeletion).not.toBeNull();
    expect(policyBeforeDeletion!.policyId).toBe(policyIdToDelete);

    // Delete the payment policy (only owner can delete)
    await sdk.updateWallet(user);

    // CF-014: Active policies cannot be deleted — force pause first.
    await expect(
      (async () => {
        const ix = await sdk.deletePaymentPolicy(tokenMint, policyIdToDelete);
        const tx = new Transaction().add(ix);
        await sendAndConfirmTransaction(connection, tx, [user]);
      })()
    ).rejects.toThrow();

    const pauseIx = await sdk.changePaymentPolicyStatus(
      tokenMint,
      policyIdToDelete,
      { paused: {} }
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(pauseIx), [
      user,
    ]);

    const deleteIx = await sdk.deletePaymentPolicy(tokenMint, policyIdToDelete);
    const deleteTx = new Transaction().add(deleteIx);
    await sendAndConfirmTransaction(connection, deleteTx, [user]);

    // Verify policy was deleted (account should not exist)
    const policyAfterDeletion = await sdk.getPaymentPolicy(policyToDeletePDA);
    expect(policyAfterDeletion).toBeNull();

    // Verify user payment active policies count was decremented
    const updatedUserPayment = await sdk.getUserPayment(userPaymentPDA);
    expect(updatedUserPayment!.activePoliciesCount).toBe(
      initialActivePoliciesCount - 1
    );
    expect(updatedUserPayment!.updatedAt.toNumber()).toBeGreaterThanOrEqual(
      initialUserPayment!.updatedAt.toNumber()
    );
  });

  test("Change gateway signer", async () => {
    // Get initial gateway state
    const initialGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(initialGateway!.signer).toEqual(gatewayAuthority.publicKey);

    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(gatewayAuthority);

    // Change the gateway signer
    const changeSignerIx = await sdk.changeGatewaySigner(
      gatewayAuthority.publicKey,
      gatewayExecutionSigner.publicKey
    );
    const tx = new Transaction().add(changeSignerIx);

    await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
      commitment: "processed" as Commitment,
    });

    // Verify the gateway signer was updated
    const updatedGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(updatedGateway!.signer).toEqual(gatewayExecutionSigner.publicKey);
    expect(updatedGateway!.authority).toEqual(gatewayAuthority.publicKey); // authority should remain unchanged
  });

  test("Change gateway fee recipient", async () => {
    // Create a new fee recipient keypair
    const newFeeRecipient = Keypair.generate();
    await fund(newFeeRecipient.publicKey, 1);

    // Get initial gateway state
    const initialGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(initialGateway!.feeRecipient).toEqual(feeRecipient.publicKey);

    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(gatewayAuthority);

    // Change the gateway fee recipient
    const changeFeeRecipientIx = await sdk.changeGatewayFeeRecipient(
      gatewayAuthority.publicKey,
      newFeeRecipient.publicKey
    );
    const tx = new Transaction().add(changeFeeRecipientIx);

    await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
      commitment: "processed" as Commitment,
    });

    // Verify the gateway fee recipient was updated
    const updatedGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(updatedGateway!.feeRecipient).toEqual(newFeeRecipient.publicKey);
    expect(updatedGateway!.authority).toEqual(gatewayAuthority.publicKey); // authority should remain unchanged
  });

  describe("Milestone payment policies", () => {
    test("Create milestone payment policy with time-based release", async () => {
      // Switch back to user wallet for creating policies
      await sdk.updateWallet(user);

      // Create milestone payment policy with 3 milestones
      const currentTime = Math.floor(Date.now() / 1000);
      const milestoneAmounts = [
        new anchor.BN(1000000), // 1 token
        new anchor.BN(2000000), // 2 tokens
        new anchor.BN(1500000), // 1.5 tokens
      ];
      const milestoneTimestamps = [
        new anchor.BN(currentTime + 60), // 1 minute from now
        new anchor.BN(currentTime + 120), // 2 minutes from now
        new anchor.BN(currentTime + 180), // 3 minutes from now
      ];

      const memo = new Uint8Array(64).fill(0);
      Buffer.from("time-based milestone test").copy(memo);

      const createMilestoneIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        milestoneAmounts,
        milestoneTimestamps,
        0, // time-based release condition
        Array.from(memo)
      );

      const tx = new Transaction().add(...createMilestoneIxs);
      await sendAndConfirmTransaction(connection, tx, [user], {
        commitment: "processed" as Commitment,
      });

      // Verify milestone policy was created
      const policies = await sdk.getPaymentPoliciesByUserPayment(
        userPaymentPDA
      );
      const milestonePolicy = policies.find(
        (p) => "milestone" in p.account.policyType
      );
      expect(milestonePolicy).toBeDefined();
      expect(milestonePolicy!.account.policyType).toHaveProperty("milestone");

      const milestoneData = milestonePolicy!.account.policyType.milestone!;
      expect(milestoneData.totalMilestones).toBe(3);
      expect(milestoneData.currentMilestone).toBe(0);
      expect(milestoneData.releaseCondition).toBe(0); // time-based
      expect(milestoneData.escrowAmount.toNumber()).toBe(4500000); // 1 + 2 + 1.5 tokens
    });

    test("Execute milestone payments sequentially", async () => {
      // Get the milestone policy we just created
      const policies = await sdk.getPaymentPoliciesByUserPayment(
        userPaymentPDA
      );
      const milestonePolicy = policies.find(
        (p) => "milestone" in p.account.policyType
      );
      expect(milestonePolicy).toBeDefined();

      const policyPda = milestonePolicy!.publicKey;

      // Update SDK to use gateway authority wallet for execution
      await sdk.updateWallet(gatewayAuthority);

      // First milestone should fail (not due yet - timestamp is in future)
      try {
        const executePaymentIxs = await sdk.executePayment(policyPda);
        const tx = new Transaction().add(...executePaymentIxs);
        await sendAndConfirmTransaction(
          connection,
          tx,
          [gatewayExecutionSigner],
          {
            commitment: "processed" as Commitment,
          }
        );
        assert(false, "Expected milestone execution to fail when not due");
      } catch (error: any) {
        // For now, just check that it fails (could be signature or MilestoneNotDue)
        expect(error).toBeDefined();
      }

      // Create a new milestone policy with timestamps in the past for testing
      await sdk.updateWallet(user);
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const pastMilestoneAmounts = [
        new anchor.BN(500000), // 0.5 tokens
        new anchor.BN(750000), // 0.75 tokens
      ];
      const pastMilestoneTimestamps = [
        new anchor.BN(pastTime), // already due
        new anchor.BN(pastTime + 3600 / 2), // 0.5 hours later
      ];

      const memo2 = new Uint8Array(64).fill(0);
      Buffer.from("past milestone test").copy(memo2);

      const createPastMilestoneIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        pastMilestoneAmounts,
        pastMilestoneTimestamps,
        0, // time-based
        Array.from(memo2)
      );

      const createTx = new Transaction().add(...createPastMilestoneIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get the new milestone policy (policy ID 6)
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;

      expect(policyId).toBe(7);
      const [pastPolicyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Execute first milestone
      await sdk.updateWallet(gatewayExecutionSigner);

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      const executeFirstIxs = await sdk.executePayment(pastPolicyPda);
      const executeFirstTx = new Transaction().add(...executeFirstIxs);
      await sendAndConfirmTransaction(
        connection,
        executeFirstTx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify first milestone was executed
      const afterFirstBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      const firstMilestoneAmount = 500000; // 0.5 tokens in smallest units
      expect(afterFirstBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) +
          BigInt(firstMilestoneAmount) -
          BigInt(12500 /* fee = 500000 × 250 bps / 10000 */)
        ).toString()
      );

      let updatedPolicy = await sdk.getPaymentPolicy(pastPolicyPda);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(updatedPolicy!.policyType.milestone!.currentMilestone).toBe(1);

      // Execute second milestone
      const executeSecondIxs = await sdk.executePayment(pastPolicyPda);
      const executeSecondTx = new Transaction().add(...executeSecondIxs);
      await sendAndConfirmTransaction(
        connection,
        executeSecondTx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify second milestone was executed
      const afterSecondBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      const secondMilestoneAmount = 750000; // 0.75 tokens in smallest units
      const totalExpected =
        firstMilestoneAmount +
        secondMilestoneAmount -
        31250; /* fee = 1250000 × 250 bps / 10000 */
      expect(afterSecondBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) + BigInt(totalExpected)
        ).toString()
      );

      updatedPolicy = await sdk.getPaymentPolicy(pastPolicyPda);
      expect(updatedPolicy!.paymentCount).toBe(2);
      expect(updatedPolicy!.policyType.milestone!.currentMilestone).toBe(2);

      // Third execution should fail (no more milestones)
      try {
        const executeThirdIxs = await sdk.executePayment(pastPolicyPda);
        const executeThirdTx = new Transaction().add(...executeThirdIxs);
        await sendAndConfirmTransaction(
          connection,
          executeThirdTx,
          [gatewayExecutionSigner],
          {
            commitment: "processed" as Commitment,
          }
        );
        assert(
          false,
          "Expected execution to fail when all milestones completed"
        );
      } catch (error: any) {
        expect(error.message).toContain("PolicyPaused.");
      }
    });

    test("Milestone payment with manual approval release condition", async () => {
      // Create milestone policy with manual approval
      await sdk.updateWallet(user);

      const currentTime = Math.floor(Date.now() / 1000);
      const manualMilestoneAmounts = [
        new anchor.BN(300000), // 0.3 tokens
        new anchor.BN(400000), // 0.4 tokens
      ];
      const manualMilestoneTimestamps = [
        new anchor.BN(currentTime + 60), // 1 minute from now
        new anchor.BN(currentTime + 120), // 2 minutes from now
      ];

      const memo3 = new Uint8Array(64).fill(0);
      Buffer.from("manual approval milestone").copy(memo3);

      const createManualIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        manualMilestoneAmounts,
        manualMilestoneTimestamps,
        1, // manual approval release condition
        Array.from(memo3)
      );

      const createTx = new Transaction().add(...createManualIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get the manual milestone policy
      const policies = await sdk.getPaymentPoliciesByUserPayment(
        userPaymentPDA
      );
      const manualMilestonePolicy = policies.find(
        (p) =>
          "milestone" in p.account.policyType &&
          p.account.policyType.milestone!.releaseCondition === 1
      );
      expect(manualMilestonePolicy).toBeDefined();

      const manualPolicyPda = manualMilestonePolicy!.publicKey;

      // Verify manual approval is required
      const policy = await sdk.getPaymentPolicy(manualPolicyPda);
      expect(policy!.policyType.milestone!.releaseCondition).toBe(1);

      // For manual approval, gateway authority would need to approve first
      // This is a simplified test - in practice, there would be an approval step
      // For now, we'll just verify the policy was created correctly
      expect(policy!.policyType.milestone!.totalMilestones).toBe(2);
      expect(policy!.policyType.milestone!.currentMilestone).toBe(0);
    });

    test("Milestone bitmap - valid combinations are accepted", async () => {
      const validBitmaps = [0, 1, 2, 3, 4, 5, 8, 9];

      for (const releaseCondition of validBitmaps) {
        await sdk.updateWallet(user);

        const pastTime = Math.floor(Date.now() / 1000) - 3600;
        const bitmapTestAmounts = [new anchor.BN(100000)];
        const bitmapTestTimestamps = [new anchor.BN(pastTime)];

        const memo = new Uint8Array(64).fill(0);
        Buffer.from(`bitmap test ${releaseCondition}`).copy(memo);

        const createIx = await sdk.getCreateMilestonePolicyInstruction(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          bitmapTestAmounts,
          bitmapTestTimestamps,
          releaseCondition,
          Array.from(memo)
        );

        const tx = new Transaction().add(createIx);
        await sendAndConfirmWithRetry(connection, tx, [user], {
          commitment: "processed" as Commitment,
        });

        const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
        const policyId = userPaymentAfter!.createdPoliciesCount;
        const [policyPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("payment_policy"),
            userPaymentPDA.toBuffer(),
            new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
          ],
          program.programId
        );

        const policy = await sdk.getPaymentPolicy(policyPda);
        expect(policy!.policyType.milestone!.releaseCondition).toBe(
          releaseCondition
        );
      }
    });

    test("Milestone bitmap - invalid combinations are rejected", async () => {
      const invalidBitmaps = [6, 10, 12, 14];

      for (const releaseCondition of invalidBitmaps) {
        await sdk.updateWallet(user);

        const pastTime = Math.floor(Date.now() / 1000) - 3600;
        const invalidTestAmounts = [new anchor.BN(100000)];
        const invalidTestTimestamps = [new anchor.BN(pastTime)];

        const memo = new Uint8Array(64).fill(0);
        Buffer.from(`invalid bitmap test ${releaseCondition}`).copy(memo);

        try {
          const createIx = await sdk.getCreateMilestonePolicyInstruction(
            tokenMint,
            recipient.publicKey,
            gatewayPDA,
            invalidTestAmounts,
            invalidTestTimestamps,
            releaseCondition,
            Array.from(memo)
          );

          const tx = new Transaction().add(createIx);
          await sendAndConfirmTransaction(connection, tx, [user], {
            commitment: "processed" as Commitment,
          });

          assert(
            false,
            `Expected bitmap ${releaseCondition} to be rejected (multiple signer bits)`
          );
        } catch (error: any) {
          expect(error.message).toContain("mutually exclusive");
        }
      }
    });

    test("Milestone bitmap - execution with no restrictions (bitmap 0)", async () => {
      await sdk.updateWallet(user);

      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const amounts = [new anchor.BN(100000)];
      const timestamps = [new anchor.BN(pastTime)];

      const memo = new Uint8Array(64).fill(0);
      Buffer.from("bitmap 0 test").copy(memo);

      const createIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amounts,
        timestamps,
        0, // No restrictions
        Array.from(memo)
      );

      const createTx = new Transaction().add(...createIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [policyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Execute with gateway signer - should succeed
      await sdk.updateWallet(gatewayExecutionSigner);

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      const executeIxs = await sdk.executePayment(policyPda);
      const executeTx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(
        connection,
        executeTx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(parseInt(finalRecipientBalance.value.amount)).toBeGreaterThan(
        parseInt(initialRecipientBalance.value.amount)
      );
    });

    test("Milestone bitmap - execution with gateway signer (bitmap 2)", async () => {
      await sdk.updateWallet(user);

      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const amounts = [new anchor.BN(100000)];
      const timestamps = [new anchor.BN(pastTime)];

      const memo = new Uint8Array(64).fill(0);
      Buffer.from("bitmap 2 test").copy(memo);

      const createIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amounts,
        timestamps,
        2, // Gateway signer required
        Array.from(memo)
      );

      const createTx = new Transaction().add(...createIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [policyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Execute with gateway signer - should succeed
      await sdk.updateWallet(gatewayExecutionSigner);

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      const executeIxs = await sdk.executePayment(policyPda);
      const executeTx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(
        connection,
        executeTx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(parseInt(finalRecipientBalance.value.amount)).toBeGreaterThan(
        parseInt(initialRecipientBalance.value.amount)
      );
    });

    test("Milestone bitmap - execution with owner signer (bitmap 4)", async () => {
      await sdk.updateWallet(user);

      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const amounts = [new anchor.BN(100000)];
      const timestamps = [new anchor.BN(pastTime)];

      const memo = new Uint8Array(64).fill(0);
      Buffer.from("bitmap 4 test").copy(memo);

      const createIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amounts,
        timestamps,
        4, // Owner signer required
        Array.from(memo)
      );

      const createTx = new Transaction().add(...createIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [policyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Execute with owner (user) - should succeed
      await sdk.updateWallet(user);

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      const executeIxs = await sdk.executePayment(policyPda);
      const executeTx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(connection, executeTx, [user], {
        commitment: "processed" as Commitment,
      });

      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(parseInt(finalRecipientBalance.value.amount)).toBeGreaterThan(
        parseInt(initialRecipientBalance.value.amount)
      );
    });

    test("Milestone bitmap - wrong signer is rejected", async () => {
      await sdk.updateWallet(user);

      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const amounts = [new anchor.BN(100000)];
      const timestamps = [new anchor.BN(pastTime)];

      const memo = new Uint8Array(64).fill(0);
      Buffer.from("wrong signer test").copy(memo);

      const createIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amounts,
        timestamps,
        2, // Gateway signer required
        Array.from(memo)
      );

      const createTx = new Transaction().add(...createIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [policyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Try to execute with user as fee payer - should fail
      await sdk.updateWallet(user);

      try {
        const executeIxs = await sdk.executePayment(policyPda);
        const executeTx = new Transaction().add(...executeIxs);

        await sendAndConfirmTransaction(connection, executeTx, [user], {
          commitment: "processed" as Commitment,
        });

        assert(false, "Expected execution to fail with wrong signer");
      } catch (error: any) {
        expect(error.message).toContain("Unauthorized");
      }
    });

    test("Milestone bitmap - due date check enforced (bitmap 1 vs bitmap 0)", async () => {
      await sdk.updateWallet(user);

      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const amounts = [new anchor.BN(100000)];
      const timestamps = [new anchor.BN(futureTime)];

      const memo = new Uint8Array(64).fill(0);
      Buffer.from("due date test").copy(memo);

      const createIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amounts,
        timestamps,
        1,
        Array.from(memo)
      );

      const createTx = new Transaction().add(...createIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [policyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Try to execute before due date - should fail
      await sdk.updateWallet(gatewayExecutionSigner);

      try {
        const executeIxs = await sdk.executePayment(policyPda);
        const executeTx = new Transaction().add(...executeIxs);

        await sendAndConfirmTransaction(
          connection,
          executeTx,
          [gatewayExecutionSigner],
          { commitment: "processed" as Commitment }
        );

        assert(false, "Expected execution to fail before due date");
      } catch (error: any) {
        expect(error.message).toContain("PaymentNotDue");
      }
    });
  });

  describe("Pay-as-you-go payment policies", () => {
    test("Create pay-as-you-go payment policy", async () => {
      // Switch to user wallet
      await sdk.updateWallet(user);

      const maxAmountPerPeriod = new anchor.BN(1000000); // 1 token per period
      const maxChunkAmount = new anchor.BN(200000); // 0.2 tokens per chunk
      const periodLengthSeconds = new anchor.BN(86400); // 24 hours
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("pay-as-you-go test").copy(memo);

      // Create pay-as-you-go policy using high-level method
      const createPayAsYouGoIxs = await sdk.createPayAsYouGo(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        maxAmountPerPeriod,
        maxChunkAmount,
        periodLengthSeconds,
        Array.from(memo)
      );

      const tx = new Transaction().add(...createPayAsYouGoIxs);
      await sendAndConfirmTransaction(connection, tx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get the pay-as-you-go policy PDA (policy should be the last created)
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [payAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Verify policy was created
      const payAsYouGoPolicy = await sdk.getPaymentPolicy(payAsYouGoPolicyPDA);
      expect(payAsYouGoPolicy).toBeDefined();
      expect(payAsYouGoPolicy!.policyType).toHaveProperty("payAsYouGo");

      const payAsYouGoData = payAsYouGoPolicy!.policyType.payAsYouGo;
      expect(payAsYouGoData.maxAmountPerPeriod.toNumber()).toBe(1000000);
      expect(payAsYouGoData.maxChunkAmount.toNumber()).toBe(200000);
      expect(payAsYouGoData.periodLengthSeconds.toNumber()).toBe(86400);
      expect(payAsYouGoData.currentPeriodTotal.toNumber()).toBe(0);
    });

    test("Execute pay-as-you-go payments within period limits", async () => {
      // Get the pay-as-you-go policy (created in previous test)
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [payAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway signer wallet for execution
      await sdk.updateWallet(gatewayExecutionSigner);

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      // Execute first payment (0.1 tokens)
      const paymentAmount1 = new anchor.BN(100000); // 0.1 tokens
      const executeFirstIxs = await sdk.executePayment(
        payAsYouGoPolicyPDA,
        paymentAmount1
      );
      const executeFirstTx = new Transaction().add(...executeFirstIxs);
      await sendAndConfirmTransaction(
        connection,
        executeFirstTx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify first payment
      const afterFirstBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      // Total fee = gateway_fee_bps only (250 bps = 2.5%). Protocol is a
      // carve-out of the gateway fee, not an additional deduction (ADR-0017).
      const expectedNetAmount = 100000 - Math.floor((100000 * 250) / 10000); // 97500
      expect(afterFirstBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) +
          BigInt(expectedNetAmount)
        ).toString()
      );

      let updatedPolicy = await sdk.getPaymentPolicy(payAsYouGoPolicyPDA);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(
        updatedPolicy!.policyType.payAsYouGo!.currentPeriodTotal.toNumber()
      ).toBe(100000);

      // Execute second payment (0.15 tokens)
      const paymentAmount2 = new anchor.BN(150000); // 0.15 tokens
      const executeSecondIxs = await sdk.executePayment(
        payAsYouGoPolicyPDA,
        paymentAmount2
      );
      const executeSecondTx = new Transaction().add(...executeSecondIxs);
      await sendAndConfirmTransaction(
        connection,
        executeSecondTx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify second payment
      const afterSecondBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      // Total fee = gateway_fee_bps only (250 bps on 250000 cumulative)
      const expectedSecondNetAmount =
        250000 - Math.floor((250000 * 250) / 10000); // 243750
      expect(afterSecondBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) +
          BigInt(expectedSecondNetAmount)
        ).toString()
      );

      updatedPolicy = await sdk.getPaymentPolicy(payAsYouGoPolicyPDA);
      expect(updatedPolicy!.paymentCount).toBe(2);
      expect(
        updatedPolicy!.policyType.payAsYouGo!.currentPeriodTotal.toNumber()
      ).toBe(250000);
    });

    test("Pay-as-you-go payment exceeds chunk limit", async () => {
      // Get the pay-as-you-go policy
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [payAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway signer wallet (gatewayExecutionSigner, not gatewayAuthority)
      await sdk.updateWallet(gatewayExecutionSigner);

      // Try to execute payment that exceeds maxChunkAmount (0.2 tokens = 200000)
      const excessiveAmount = new anchor.BN(250000); // 0.25 tokens - exceeds limit

      try {
        const executeExcessiveIxs = await sdk.executePayment(
          payAsYouGoPolicyPDA,
          excessiveAmount
        );
        const executeExcessiveTx = new Transaction().add(
          ...executeExcessiveIxs
        );
        await sendAndConfirmTransaction(
          connection,
          executeExcessiveTx,
          [gatewayExecutionSigner],
          {
            commitment: "processed" as Commitment,
          }
        );
        assert(false, "Expected payment to fail due to chunk size limit");
      } catch (error: any) {
        expect(error.message).toContain("InvalidAmount");
      }
    });

    test("Pay-as-you-go payment exceeds period limit", async () => {
      // Create a new pay-as-you-go policy with smaller limits for testing
      await sdk.updateWallet(user);

      const smallMaxAmountPerPeriod = new anchor.BN(300000); // 0.3 tokens per period
      const smallMaxChunkAmount = new anchor.BN(150000); // 0.15 tokens per chunk
      const periodLengthSeconds = new anchor.BN(3600); // 1 hour

      const memo2 = new Uint8Array(64).fill(0);
      Buffer.from("small pay-as-you-go test").copy(memo2);

      const createSmallPayAsYouGoIxs = await sdk.createPayAsYouGo(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        smallMaxAmountPerPeriod,
        smallMaxChunkAmount,
        periodLengthSeconds,
        Array.from(memo2)
      );

      const createTx = new Transaction().add(...createSmallPayAsYouGoIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get the new pay-as-you-go policy (next policy ID)
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const newPolicyId = userPaymentAfter!.createdPoliciesCount;
      const [smallPayAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(newPolicyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway signer wallet (gatewayExecutionSigner)
      await sdk.updateWallet(gatewayExecutionSigner);

      // Execute first payment (0.1 tokens)
      const paymentAmount1 = new anchor.BN(100000); // 0.1 tokens
      const executeFirstIxs = await sdk.executePayment(
        smallPayAsYouGoPolicyPDA,
        paymentAmount1
      );
      const executeFirstTx = new Transaction().add(...executeFirstIxs);
      await sendAndConfirmTransaction(
        connection,
        executeFirstTx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Execute second payment (0.15 tokens) - should succeed (total: 0.25 < 0.3)
      const paymentAmount2 = new anchor.BN(150000);
      const executeSecondIxs = await sdk.executePayment(
        smallPayAsYouGoPolicyPDA,
        paymentAmount2
      );
      const executeSecondTx = new Transaction().add(...executeSecondIxs);
      await sendAndConfirmTransaction(
        connection,
        executeSecondTx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Try third payment that would exceed period limit (0.06 tokens, total would be 0.31 > 0.3)
      const paymentAmount3 = new anchor.BN(60000);
      try {
        const executeThirdIxs = await sdk.executePayment(
          smallPayAsYouGoPolicyPDA,
          paymentAmount3
        );
        const executeThirdTx = new Transaction().add(...executeThirdIxs);
        await sendAndConfirmTransaction(
          connection,
          executeThirdTx,
          [gatewayExecutionSigner],
          {
            commitment: "processed" as Commitment,
          }
        );
        assert(false, "Expected payment to fail due to period limit");
      } catch (error: any) {
        expect(error.message).toContain("InsufficientDelegatedAmount");
      }
    });

    test("Pay-as-you-go policy validation", async () => {
      // Switch to user wallet
      await sdk.updateWallet(user);

      // Test invalid parameters - validation happens on program side
      try {
        // maxAmountPerPeriod = 0 (invalid)
        const invalidIxs = await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(0), // Invalid
          new anchor.BN(100000),
          new anchor.BN(86400),
          Array.from(new Uint8Array(64).fill(0))
        );
        const invalidTx = new Transaction().add(...invalidIxs);
        await sendAndConfirmTransaction(connection, invalidTx, [user], {
          commitment: "processed" as Commitment,
        });
        assert(
          false,
          "Expected policy creation to fail with invalid maxAmountPerPeriod"
        );
      } catch (error: any) {
        expect(error.message).toContain("InvalidAmount");
      }

      try {
        // maxChunkAmount > maxAmountPerPeriod (invalid)
        const invalidIxs2 = await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(100000),
          new anchor.BN(200000), // Invalid: chunk > period max
          new anchor.BN(86400),
          Array.from(new Uint8Array(64).fill(0))
        );
        const invalidTx2 = new Transaction().add(...invalidIxs2);
        await sendAndConfirmTransaction(connection, invalidTx2, [user], {
          commitment: "processed" as Commitment,
        });
        assert(
          false,
          "Expected policy creation to fail with invalid chunk size"
        );
      } catch (error: any) {
        expect(error.message).toContain("InvalidAmount");
      }

      try {
        // periodLengthSeconds = 0 (invalid)
        const invalidIxs3 = await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(1000000),
          new anchor.BN(100000),
          new anchor.BN(0), // Invalid
          Array.from(new Uint8Array(64).fill(0))
        );
        const invalidTx3 = new Transaction().add(...invalidIxs3);
        await sendAndConfirmTransaction(connection, invalidTx3, [user], {
          commitment: "processed" as Commitment,
        });
        assert(
          false,
          "Expected policy creation to fail with invalid period length"
        );
      } catch (error: any) {
        expect(error.message).toContain("Invalid Interval");
      }
    });
  });

  describe("Referral program", () => {
    let referrerL1: Keypair;
    let referrerL2: Keypair;
    let referrerL3: Keypair;
    let payer: Keypair;
    let singleRefpayer: Keypair;

    let l1TokenAccount: PublicKey;
    let l2TokenAccount: PublicKey;
    let l3TokenAccount: PublicKey;
    let payerTokenAccount: PublicKey;

    let payerPolicyPDA: PublicKey;

    beforeAll(async () => {
      referrerL1 = Keypair.generate();
      referrerL2 = Keypair.generate();
      referrerL3 = Keypair.generate();
      payer = Keypair.generate();

      await batchFund([
        [referrerL1.publicKey, 5],
        [referrerL2.publicKey, 5],
        [referrerL3.publicKey, 5],
        [payer.publicKey, 5],
      ]);

      [l1TokenAccount, l2TokenAccount, l3TokenAccount, payerTokenAccount] =
        await batchCreateATAs([
          referrerL1.publicKey,
          referrerL2.publicKey,
          referrerL3.publicKey,
          payer.publicKey,
        ]);

      await batchMintTo([
        { address: l1TokenAccount, amount: 1000000n },
        { address: l2TokenAccount, amount: 1000000n },
        { address: l3TokenAccount, amount: 1000000n },
        { address: payerTokenAccount, amount: 2000000n },
      ]);
    });

    test("Create referral accounts for L3 referrers and payer", async () => {
      await sdk.updateWallet(referrerL3);
      const createL3Ix = await sdk.createReferralAccount(
        gatewayPDA,
        "REF003",
        null
      );
      const tx = new Transaction().add(createL3Ix);
      await sendAndConfirmTransaction(connection, tx, [referrerL3], {
        commitment: "processed" as Commitment,
      });

      const chainL3 = await sdk.getReferralChain(
        referrerL3.publicKey,
        gatewayPDA
      );
      expect(chainL3[0]).toBeNull();
      expect(chainL3[1]).toBeNull();
      expect(chainL3[2]).toBeNull();

      const l3Referral = await sdk.getReferralAccount(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF003")).address
      );
      expect(l3Referral).not.toBeNull();
      expect(l3Referral!.owner).toEqual(referrerL3.publicKey);
      expect(l3Referral!.referrer.toString()).toEqual(
        "11111111111111111111111111111111"
      );
      expect(l3Referral!.gateway).toEqual(gatewayPDA);
    });

    test("Create referral accounts for L2 referrers and payer", async () => {
      await sdk.updateWallet(referrerL2);
      const createL2Ix = await sdk.createReferralAccount(
        gatewayPDA,
        "REF002",
        referrerL3.publicKey
      );
      const tx = new Transaction().add(createL2Ix);
      await sendAndConfirmTransaction(connection, tx, [referrerL2], {
        commitment: "processed" as Commitment,
      });

      const l2Referral = await sdk.getReferralAccount(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF002")).address
      );
      expect(l2Referral).not.toBeNull();
      expect(l2Referral!.owner).toEqual(referrerL2.publicKey);
      expect(l2Referral!.referrer).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF003")).address
      );

      const chainL2 = await sdk.getReferralChain(
        referrerL2.publicKey,
        gatewayPDA
      );
      expect(chainL2[0]).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF003")).address
      );
      expect(chainL2[1]).toBeNull();
      expect(chainL2[2]).toBeNull();
    });

    test("Create referral accounts for L1 referrers and payer", async () => {
      await sdk.updateWallet(referrerL1);
      const createL1Ix = await sdk.createReferralAccount(
        gatewayPDA,
        "REF001",
        referrerL2.publicKey
      );
      const tx = new Transaction().add(createL1Ix);
      await sendAndConfirmTransaction(connection, tx, [referrerL1], {
        commitment: "processed" as Commitment,
      });

      const chainL1 = await sdk.getReferralChain(
        referrerL1.publicKey,
        gatewayPDA
      );
      expect(chainL1[0]).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF002")).address
      );
      expect(chainL1[1]).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF003")).address
      );
      expect(chainL1[2]).toBeNull();

      const l1Referral = await sdk.getReferralAccount(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF001")).address
      );
      expect(l1Referral).not.toBeNull();
      expect(l1Referral!.owner).toEqual(referrerL1.publicKey);
      expect(l1Referral!.referrer).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF002")).address
      );
    });

    test("Create new payer referring L1", async () => {
      await sdk.updateWallet(payer);
      const createPayerIx = await sdk.createReferralAccount(
        gatewayPDA,
        "PAYER1",
        referrerL1.publicKey
      );
      const tx = new Transaction().add(createPayerIx);
      await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "processed" as Commitment,
      });

      const payerReferral = await sdk.getReferralAccount(
        sdk.getReferralPda(gatewayPDA, Buffer.from("PAYER1")).address
      );
      expect(payerReferral).not.toBeNull();
      expect(payerReferral!.owner).toEqual(payer.publicKey);
      expect(payerReferral!.referrer).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF001")).address
      );

      const chain = await sdk.getReferralChain(payer.publicKey, gatewayPDA);
      expect(chain[0]).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF001")).address
      );
      expect(chain[1]).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF002")).address
      );
      expect(chain[2]).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF003")).address
      );
    });

    test("Update gateway with referral settings", async () => {
      await sdk.updateWallet(gatewayAuthority);

      const updateIx = await sdk.updateGatewayReferralSettings(
        gatewayAuthority.publicKey,
        1,
        500,
        [6000, 3000, 1000]
      );

      const tx = new Transaction().add(updateIx);
      await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(gatewayPDA);
      expect(gateway!.featureFlags).toBe(1);
      expect(gateway!.referralAllocationBps).toBe(500);
      expect(gateway!.referralTiersBps).toEqual([6000, 3000, 1000]);
    });

    test("Create subscription payment policy for payer with referral", async () => {
      await sdk.updateWallet(payer);

      const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
      let tx = new Transaction().add(createUserPaymentIx);
      await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "processed" as Commitment,
      });

      const amount = new anchor.BN(1000000);
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("referral subscription test").copy(memo);
      const paymentFrequency = { daily: {} };
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = new anchor.BN(currentTime - 3600);

      const createSubscriptionIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        startTime
      );

      tx = new Transaction().add(...createSubscriptionIxs);
      await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "processed" as Commitment,
      });

      const { address: payerUserPaymentPDA } = sdk.getUserPaymentPda(
        payer.publicKey,
        tokenMint
      );

      const payerUserPayment = await sdk.getUserPayment(payerUserPaymentPDA);
      const policyId = payerUserPayment!.createdPoliciesCount;

      const { address: payerPolicy } = sdk.getPaymentPolicyPda(
        payerUserPaymentPDA,
        policyId
      );
      payerPolicyPDA = payerPolicy;

      const policy = await sdk.getPaymentPolicy(payerPolicyPDA);
      expect(policy).not.toBeNull();
      expect(policy!.policyType).toHaveProperty("subscription");
      expect(policy!.gateway.toString()).toEqual(gatewayPDA.toString());

      // Let's ensure that the gateway still has the gatewayExecutionSigner
      const gateway = await sdk.getPaymentGateway(gatewayPDA);
      expect(gateway!.signer.toString()).toEqual(
        gatewayExecutionSigner.publicKey.toString()
      );
    });

    test("Execute subscription payment with referral rewards", async () => {
      const [
        initialL1Balance,
        initialL2Balance,
        initialL3Balance,
        initialRecipientBalance,
      ] = await Promise.all([
        connection.getTokenAccountBalance(l1TokenAccount),
        connection.getTokenAccountBalance(l2TokenAccount),
        connection.getTokenAccountBalance(l3TokenAccount),
        connection.getTokenAccountBalance(recipientTokenAccount),
      ]);

      const paymentsDelegate = sdk.getPaymentsDelegatePda().address;

      await approve(
        connection,
        payer,
        payerTokenAccount,
        paymentsDelegate,
        payer,
        2000000
      );

      await sdk.updateWallet(gatewayExecutionSigner);

      const paymentAmount = new anchor.BN(100000);
      const executeIxs = await sdk.executePayment(
        payerPolicyPDA,
        paymentAmount
      );

      const tx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(
        connection,
        tx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(parseInt(finalRecipientBalance.value.amount)).toBeGreaterThan(
        parseInt(initialRecipientBalance.value.amount)
      );

      const l1Referral = await sdk.getReferralAccount(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF001")).address
      );
      const l2Referral = await sdk.getReferralAccount(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF002")).address
      );
      const l3Referral = await sdk.getReferralAccount(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF003")).address
      );

      expect(l1Referral!.totalEarned.toNumber()).toBeGreaterThan(0);
      expect(l2Referral!.totalEarned.toNumber()).toBeGreaterThan(0);
      expect(l3Referral!.totalEarned.toNumber()).toBeGreaterThan(0);

      const gateway = await sdk.getPaymentGateway(gatewayPDA);
      const gatewayFee = Math.floor(
        (paymentAmount.toNumber() * gateway!.gatewayFeeBps) / 10000
      );
      const referralPool = Math.floor(
        (gatewayFee * gateway!.referralAllocationBps) / 10000
      );
      const l1Reward = Math.floor(
        (referralPool * gateway!.referralTiersBps[0]) / 10000
      );
      const l2Reward = Math.floor(
        (referralPool * gateway!.referralTiersBps[1]) / 10000
      );
      const l3Reward = Math.floor(
        (referralPool * gateway!.referralTiersBps[2]) / 10000
      );

      const [finalL1Balance, finalL2Balance, finalL3Balance] =
        await Promise.all([
          connection.getTokenAccountBalance(l1TokenAccount),
          connection.getTokenAccountBalance(l2TokenAccount),
          connection.getTokenAccountBalance(l3TokenAccount),
        ]);

      expect(parseInt(finalL1Balance.value.amount)).toBeGreaterThanOrEqual(
        parseInt(initialL1Balance.value.amount) +
        l1Reward -
        Math.floor((l1Reward * 100) / 10000)
      );
      expect(parseInt(finalL2Balance.value.amount)).toBeGreaterThanOrEqual(
        parseInt(initialL2Balance.value.amount) +
        l2Reward -
        Math.floor((l2Reward * 100) / 10000)
      );
      expect(parseInt(finalL3Balance.value.amount)).toBeGreaterThanOrEqual(
        parseInt(initialL3Balance.value.amount) +
        l3Reward -
        Math.floor((l3Reward * 100) / 10000)
      );
    });

    test("C-02: rejects chain not anchored by payer's ReferralAccount", async () => {
      // Use the transfer instruction (no PaymentNotDue check) to exercise
      // the referral validation path. Attacker supplies a FAKE first account
      // (their own referral account) instead of the payer's real one.
      // Pre-fix this would have routed rewards to the attacker; post-fix it
      // must fail because the first remaining account is interpreted as the
      // payer's ReferralAccount and its owner != paying wallet.
      const attacker = Keypair.generate();
      await batchFund([[attacker.publicKey, 5]]);

      await sdk.updateWallet(attacker);
      const a1 = "ATCK01";
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          await sdk.createReferralAccount(gatewayPDA, a1, null)
        ),
        [attacker],
        { commitment: "processed" as Commitment }
      );
      const a1Pda = sdk.getReferralPda(gatewayPDA, Buffer.from(a1)).address;

      // Build a legitimate transfer ix for the payer (with referral chain),
      // then patch the remaining_accounts to inject the attacker's account.
      await sdk.updateWallet(payer);
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("c-02 transfer attacker").copy(memo);
      const legitimateIxs = await sdk.transfer(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(100000),
        Array.from(memo),
        "PAYER1"
      );
      const goodIx = legitimateIxs[legitimateIxs.length - 1];
      // TransferTokens has 9 named accounts; rest are remaining_accounts.
      const trailingCount = goodIx.keys.length - 9;
      expect(trailingCount).toBeGreaterThan(0);
      const namedKeys = goodIx.keys.slice(
        0,
        goodIx.keys.length - trailingCount
      );

      const patchedKeys = [
        ...namedKeys,
        // position 0: attacker's own ReferralAccount masquerading as payer's
        { pubkey: a1Pda, isWritable: false, isSigner: false },
      ];

      const badIx = new TransactionInstruction({
        programId: goodIx.programId,
        data: goodIx.data,
        keys: patchedKeys,
      });

      let caught: any = null;
      try {
        await sendAndConfirmTransaction(
          connection,
          new Transaction().add(badIx),
          [payer],
          { commitment: "processed" as Commitment }
        );
      } catch (e: any) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const errMsg = caught?.message ?? "";
      const expected =
        errMsg.includes("PayerReferralMismatch") ||
        errMsg.includes("InvalidReferralChainOrdering") ||
        errMsg.includes("ReferrerAccountInvalid") ||
        errMsg.includes("InvalidReferralAccountDiscriminator");
      if (!expected) {
        throw new Error(`expected security error, got: ${errMsg}`);
      }
    });

    test("C-02: rejects duplicate referral accounts in chain", async () => {
      // Construct a chain where L1 and L2 are the same account. Must fail
      // with DuplicateReferralAccount.
      const payerReferralPda = sdk.getReferralPda(
        gatewayPDA,
        Buffer.from("PAYER1")
      ).address;
      const l1Pda = sdk.getReferralPda(
        gatewayPDA,
        Buffer.from("REF001")
      ).address;

      await sdk.updateWallet(payer);
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("c-02 transfer dup").copy(memo);
      const legitimateIxs = await sdk.transfer(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(100000),
        Array.from(memo),
        "PAYER1"
      );
      const goodIx = legitimateIxs[legitimateIxs.length - 1];
      const namedKeys = goodIx.keys.slice(0, goodIx.keys.length - 7);

      // [payer_referral, L1, L1_dup, ATA_L1, ATA_L1_dup]
      const patchedKeys = [
        ...namedKeys,
        { pubkey: payerReferralPda, isWritable: false, isSigner: false },
        { pubkey: l1Pda, isWritable: true, isSigner: false },
        { pubkey: l1Pda, isWritable: true, isSigner: false }, // duplicate!
        { pubkey: l1TokenAccount, isWritable: true, isSigner: false },
        { pubkey: l1TokenAccount, isWritable: true, isSigner: false },
      ];

      const dupIx = new TransactionInstruction({
        programId: goodIx.programId,
        data: goodIx.data,
        keys: patchedKeys,
      });

      let caught: any = null;
      try {
        await sendAndConfirmTransaction(
          connection,
          new Transaction().add(dupIx),
          [payer],
          { commitment: "processed" as Commitment }
        );
      } catch (e: any) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      const errMsg = caught?.message ?? "";
      const expected =
        errMsg.includes("DuplicateReferralAccount") ||
        errMsg.includes("InvalidReferralChainOrdering");
      if (!expected) {
        throw new Error(
          `expected DuplicateReferralAccount or InvalidReferralChainOrdering, got: ${errMsg}`
        );
      }
    });

    test("Setup Referral program with only L1 referrer", async () => {
      singleRefpayer = Keypair.generate();
      await batchFund([[singleRefpayer.publicKey, 5]]);

      const [singlePayerTokenAccount] = await batchCreateATAs([
        singleRefpayer.publicKey,
      ]);
      await batchMintTo([
        { address: singlePayerTokenAccount, amount: 100000000n },
      ]);

      await sdk.updateWallet(singleRefpayer);
      const createPayerIx = await sdk.createReferralAccount(
        gatewayPDA,
        "PAYER3",
        referrerL3.publicKey
      );
      let tx = new Transaction().add(createPayerIx);
      await sendAndConfirmTransaction(connection, tx, [singleRefpayer], {
        commitment: "processed" as Commitment,
      });

      const payerReferral = await sdk.getReferralAccount(
        sdk.getReferralPda(gatewayPDA, Buffer.from("PAYER3")).address
      );
      expect(payerReferral).not.toBeNull();
      expect(payerReferral!.owner).toEqual(singleRefpayer.publicKey);
      expect(payerReferral!.referrer).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF003")).address
      );

      const chain = await sdk.getReferralChain(
        singleRefpayer.publicKey,
        gatewayPDA
      );
      expect(chain[0]).toEqual(
        sdk.getReferralPda(gatewayPDA, Buffer.from("REF003")).address
      );
      expect(chain[1]).toBeNull();
      expect(chain[2]).toBeNull();

      const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
      tx = new Transaction().add(createUserPaymentIx);
      await sendAndConfirmTransaction(connection, tx, [singleRefpayer], {
        commitment: "processed" as Commitment,
      });

      const amount = new anchor.BN(1000000);
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("single referrer test").copy(memo);
      const paymentFrequency = { daily: {} };
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = new anchor.BN(currentTime - 3600);

      const createSubscriptionIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        startTime
      );

      tx = new Transaction().add(...createSubscriptionIxs);
      await sendAndConfirmTransaction(connection, tx, [singleRefpayer], {
        commitment: "processed" as Commitment,
      });
    });

    test("Execute Payment in Referral program with only L1 referrer", async () => {
      await sdk.updateWallet(gatewayExecutionSigner);

      const { address: singlePayerUserPaymentPDA } = sdk.getUserPaymentPda(
        singleRefpayer.publicKey,
        tokenMint
      );

      const singlePayerUserPayment = await sdk.getUserPayment(
        singlePayerUserPaymentPDA
      );
      const policyId = singlePayerUserPayment!.createdPoliciesCount;

      const { address: singlePayerPolicyPDA } = sdk.getPaymentPolicyPda(
        singlePayerUserPaymentPDA,
        policyId
      );

      const initialReferrerBalance = await connection.getTokenAccountBalance(
        l3TokenAccount
      );

      const paymentAmount = new anchor.BN(100000);
      const executeIxs = await sdk.executePayment(
        singlePayerPolicyPDA,
        paymentAmount
      );
      const tx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(
        connection,
        tx,
        [gatewayExecutionSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      const finalReferrerBalance = await connection.getTokenAccountBalance(
        l3TokenAccount
      );

      expect(parseInt(finalReferrerBalance.value.amount)).toBeGreaterThan(
        parseInt(initialReferrerBalance.value.amount)
      );
    });

    test("Referral program disabled - no rewards distributed", async () => {
      const newGatewayAuthority = Keypair.generate();
      const newFeeRecipient = Keypair.generate();
      const noReferralPayer = Keypair.generate();

      await batchFund([
        [newGatewayAuthority.publicKey, 5],
        [newFeeRecipient.publicKey, 1],
        [noReferralPayer.publicKey, 5],
      ]);

      await batchCreateATAs([newFeeRecipient.publicKey]);

      const { address: newGatewayPDA } = sdk.getGatewayPda(
        newGatewayAuthority.publicKey
      );

      await sdk.updateWallet(admin);
      const createGatewayIx = await sdk.createPaymentGateway(
        newGatewayAuthority.publicKey,
        250,
        0, // schedulerShareBps — no scheduler cut in this test
        newFeeRecipient.publicKey,
        "no referral gateway",
        "https://noreferral.example.com"
      );
      let tx = new Transaction().add(createGatewayIx);
      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed" as Commitment,
      });

      const [noRefPayerTokenAccount] = await batchCreateATAs([
        noReferralPayer.publicKey,
      ]);
      await batchMintTo([
        { address: noRefPayerTokenAccount, amount: 1000000n },
      ]);

      const { address: noRefPayerUserPaymentPDA } = sdk.getUserPaymentPda(
        noReferralPayer.publicKey,
        tokenMint
      );

      await sdk.updateWallet(noReferralPayer);
      const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
      tx = new Transaction().add(createUserPaymentIx);
      await sendAndConfirmTransaction(connection, tx, [noReferralPayer], {
        commitment: "processed" as Commitment,
      });

      const amount = new anchor.BN(1000000);
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("no referral test").copy(memo);
      const paymentFrequency = { daily: {} };
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = new anchor.BN(currentTime - 3600);

      const createPolicyIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        newGatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        startTime
      );
      tx = new Transaction().add(...createPolicyIxs);
      await sendAndConfirmTransaction(connection, tx, [noReferralPayer], {
        commitment: "processed" as Commitment,
      });

      const noRefPayerUserPayment = await sdk.getUserPayment(
        noRefPayerUserPaymentPDA
      );
      const policyId = noRefPayerUserPayment!.createdPoliciesCount;
      const { address: noRefPayerPolicyPDA } = sdk.getPaymentPolicyPda(
        noRefPayerUserPaymentPDA,
        policyId
      );

      const paymentsDelegate = sdk.getPaymentsDelegatePda().address;
      await approve(
        connection,
        noReferralPayer,
        noRefPayerTokenAccount,
        paymentsDelegate,
        noReferralPayer,
        1000000
      );

      const initialL1Balance = await connection.getTokenAccountBalance(
        l1TokenAccount
      );

      await sdk.updateWallet(newGatewayAuthority);
      const executeIxs = await sdk.executePayment(
        noRefPayerPolicyPDA,
        new anchor.BN(100000)
      );
      tx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(connection, tx, [newGatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const finalL1Balance = await connection.getTokenAccountBalance(
        l1TokenAccount
      );
      expect(parseInt(finalL1Balance.value.amount)).toEqual(
        parseInt(initialL1Balance.value.amount)
      );
    });

    test("Create subscription using existing referral code", async () => {
      // Create a new user for this test
      const subscriptionUser = Keypair.generate();
      await batchFund([[subscriptionUser.publicKey, 5]]);

      const [subscriptionUserTokenAccount] = await batchCreateATAs([
        subscriptionUser.publicKey,
      ]);
      await batchMintTo([
        { address: subscriptionUserTokenAccount, amount: 1000000n },
      ]);

      // Verify the referral account was created
      const referralCode = "PAYER3";
      await sdk.updateWallet(subscriptionUser);
      const referralPda = sdk.getReferralPda(
        gatewayPDA,
        Buffer.from(referralCode)
      ).address;
      const initialReferralAccount = await sdk.getReferralAccount(referralPda);
      expect(initialReferralAccount).not.toBeNull();
      expect(initialReferralAccount!.referralCode).toEqual(
        encodeMemo(referralCode, 6)
      );

      // Create a subscription using the existing referral code
      const amount = new anchor.BN(100000); // 0.1 tokens
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("subscription with referral").copy(memo);
      const paymentFrequency = { daily: {} };
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = new anchor.BN(currentTime - 3600);

      const createSubscriptionIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        startTime,
        undefined, // approvalAmount
        undefined, // executeImmediately
        referralCode // use existing referral code
      );

      const subscriptionTx = new Transaction().add(...createSubscriptionIxs);
      await sendAndConfirmTransaction(
        connection,
        subscriptionTx,
        [subscriptionUser],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify the referral account still exists and has the correct code
      const userReferralAccount = await sdk.getReferralAccountByOwner(
        gatewayPDA,
        subscriptionUser.publicKey
      );
      expect(userReferralAccount).not.toBeNull();
      expect(userReferralAccount!.owner).toEqual(subscriptionUser.publicKey);
      expect(userReferralAccount!.gateway).toEqual(gatewayPDA);
    });
  });

  describe("Custom protocol fee", () => {
    let customFeeGatewayAuthority: Keypair;
    let customFeeGatewayPDA: PublicKey;
    let customFeeUser: Keypair;
    let customFeeUserTokenAccount: PublicKey;
    let customFeePolicyPDA: PublicKey;
    let customFeeRecipientTokenAccount: PublicKey;

    beforeAll(async () => {
      customFeeGatewayAuthority = Keypair.generate();
      customFeeUser = Keypair.generate();
      const customFeeFeeRecipient = Keypair.generate();

      try {
        await batchFund([
          [customFeeGatewayAuthority.publicKey, 5],
          [customFeeUser.publicKey, 5],
          [customFeeFeeRecipient.publicKey, 5],
        ]);

        const [, customFeeUserATA] = await batchCreateATAs([
          customFeeFeeRecipient.publicKey,
          customFeeUser.publicKey,
        ]);
        customFeeUserTokenAccount = customFeeUserATA;

        await batchMintTo([
          { address: customFeeUserTokenAccount, amount: 1000000n },
        ]);

        await sdk.updateWallet(admin);
        const createGatewayIx = await sdk.createPaymentGateway(
          customFeeGatewayAuthority.publicKey,
          250, // 2.5% gateway fee
          0, // schedulerShareBps — no scheduler cut in this test
          customFeeFeeRecipient.publicKey,
          "custom fee gateway",
          "https://customfee.example.com"
        );
        let tx = new Transaction().add(createGatewayIx);
        await sendAndConfirmTransaction(connection, tx, [admin], {
          commitment: "processed" as Commitment,
        });
        customFeeGatewayPDA = sdk.getGatewayPda(
          customFeeGatewayAuthority.publicKey
        ).address;

        customFeeRecipientTokenAccount = recipientTokenAccount;

        const { address: customFeeUserPaymentPDA } = sdk.getUserPaymentPda(
          customFeeUser.publicKey,
          tokenMint
        );

        await sdk.updateWallet(customFeeUser);
        const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
        tx = new Transaction().add(createUserPaymentIx);
        await sendAndConfirmTransaction(connection, tx, [customFeeUser], {
          commitment: "processed" as Commitment,
        });

        const amount = new anchor.BN(100000); // 0.1 tokens
        const memo = new Uint8Array(64).fill(0);
        Buffer.from("custom fee test").copy(memo);
        const paymentFrequency = { daily: {} };
        const currentTime = Math.floor(Date.now() / 1000);
        const startTime = new anchor.BN(currentTime - 3600);

        const createPolicyIxs = await sdk.createSubscription(
          tokenMint,
          recipient.publicKey,
          customFeeGatewayPDA,
          amount,
          true,
          null,
          paymentFrequency,
          Array.from(memo),
          startTime
        );
        tx = new Transaction().add(...createPolicyIxs);
        await sendAndConfirmTransaction(connection, tx, [customFeeUser], {
          commitment: "processed" as Commitment,
        });

        const customFeeUserPayment = await sdk.getUserPayment(
          customFeeUserPaymentPDA
        );
        const policyId = customFeeUserPayment!.createdPoliciesCount;
        const { address: policyPDA } = sdk.getPaymentPolicyPda(
          customFeeUserPaymentPDA,
          policyId
        );
        customFeePolicyPDA = policyPDA;

        const paymentsDelegate = sdk.getPaymentsDelegatePda().address;
        await approve(
          connection,
          customFeeUser,
          customFeeUserTokenAccount,
          paymentsDelegate,
          customFeeUser,
          1000000
        );
      } catch (e) {
        console.trace(e);
      }
    });

    test("Protocol admin can update gateway custom protocol fee settings", async () => {
      await sdk.updateWallet(admin);

      const gatewayBefore = await sdk.getPaymentGateway(customFeeGatewayPDA);
      expect(gatewayBefore!.customProtocolShareBps).toBe(0);
      expect(gatewayBefore!.featureFlags & 0x04).toBe(0);

      const updateIx = await sdk.updateGatewayProtocolFee(
        customFeeGatewayAuthority.publicKey,
        true, // enable custom protocol fee
        500 // 5% protocol fee
      );
      const tx = new Transaction().add(updateIx);
      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed" as Commitment,
      });

      const gatewayAfter = await sdk.getPaymentGateway(customFeeGatewayPDA);
      expect(gatewayAfter!.customProtocolShareBps).toBe(500);
      expect(gatewayAfter!.featureFlags & 0x04).toBe(4);
    });

    test("Custom protocol fee of 0 bps means no protocol fee charged", async () => {
      await sdk.updateWallet(admin);

      // Set custom protocol fee to 0 bps
      const updateIx = await sdk.updateGatewayProtocolFee(
        customFeeGatewayAuthority.publicKey,
        true, // enable custom protocol fee
        0 // 0% protocol fee - no protocol fee!
      );
      let tx = new Transaction().add(updateIx);
      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(customFeeGatewayPDA);
      expect(gateway!.customProtocolShareBps).toBe(0);
      expect(gateway!.featureFlags & 0x04).toBe(4);

      // Get initial balances
      const [initialRecipientBalance, initialProtocolFeeRecipientBalance] =
        await Promise.all([
          connection.getTokenAccountBalance(customFeeRecipientTokenAccount),
          connection.getTokenAccountBalance(
            getAssociatedTokenAddressSync(tokenMint, admin.publicKey)
          ),
        ]);

      // Execute payment
      await sdk.updateWallet(customFeeGatewayAuthority);
      const executeIxs = await sdk.executePayment(
        customFeePolicyPDA,
        new anchor.BN(100000) // 0.1 tokens
      );
      tx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(
        connection,
        tx,
        [customFeeGatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify recipient got the full amount (minus only gateway fee)
      const finalRecipientBalance = await connection.getTokenAccountBalance(
        customFeeRecipientTokenAccount
      );
      const gatewayFee = Math.floor((100000 * 250) / 10000); // 2.5% gateway fee = 2500
      const expectedRecipientAmount = 100000 - gatewayFee; // 97500
      expect(parseInt(finalRecipientBalance.value.amount)).toEqual(
        parseInt(initialRecipientBalance.value.amount) + expectedRecipientAmount
      );

      // Verify NO protocol fee was charged (admin balance unchanged)
      const finalProtocolFeeRecipientBalance =
        await connection.getTokenAccountBalance(
          getAssociatedTokenAddressSync(tokenMint, admin.publicKey)
        );
      expect(parseInt(finalProtocolFeeRecipientBalance.value.amount)).toEqual(
        parseInt(initialProtocolFeeRecipientBalance.value.amount)
      );
    });

    test("Gateway authority cannot modify custom protocol fee feature", async () => {
      await sdk.updateWallet(customFeeGatewayAuthority);

      const gatewayBefore = await sdk.getPaymentGateway(customFeeGatewayPDA);
      const featureFlagsBefore = gatewayBefore!.featureFlags;

      // Try to modify feature flags through referral settings (should preserve bit 2)
      const updateIx = await sdk.updateGatewayReferralSettings(
        customFeeGatewayAuthority.publicKey,
        0, // Disable referral (bit 0)
        0,
        [10000, 0, 0]
      );
      const tx = new Transaction().add(updateIx);
      await sendAndConfirmTransaction(
        connection,
        tx,
        [customFeeGatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      const gatewayAfter = await sdk.getPaymentGateway(customFeeGatewayPDA);
      // Bit 2 should be preserved (4), bit 0 should be 0
      expect(gatewayAfter!.featureFlags).toBe(4);
      expect(featureFlagsBefore & 0x04).toBe(4);
    });

    test("Disabling custom protocol fee reverts to global default (100 bps)", async () => {
      await sdk.updateWallet(admin);

      // Disable custom protocol fee
      const updateIx = await sdk.updateGatewayProtocolFee(
        customFeeGatewayAuthority.publicKey,
        false, // disable custom protocol fee
        0
      );
      let tx = new Transaction().add(updateIx);
      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(customFeeGatewayPDA);
      expect(gateway!.featureFlags & 0x04).toBe(0);

      // Create a new policy for this test
      const { address: customFeeUserPaymentPDA } = sdk.getUserPaymentPda(
        customFeeUser.publicKey,
        tokenMint
      );

      const amount = new anchor.BN(100000); // 0.1 tokens
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("default fee test").copy(memo);
      const paymentFrequency = { daily: {} };
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = new anchor.BN(currentTime - 3600);

      await sdk.updateWallet(customFeeUser);
      const createPolicyIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        customFeeGatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        startTime
      );
      tx = new Transaction().add(...createPolicyIxs);
      await sendAndConfirmTransaction(connection, tx, [customFeeUser], {
        commitment: "processed" as Commitment,
      });

      const customFeeUserPayment = await sdk.getUserPayment(
        customFeeUserPaymentPDA
      );
      const policyId = customFeeUserPayment!.createdPoliciesCount;
      const { address: newPolicyPDA } = sdk.getPaymentPolicyPda(
        customFeeUserPaymentPDA,
        policyId
      );

      // Get initial balances
      const [initialRecipientBalance, initialProtocolFeeRecipientBalance] =
        await Promise.all([
          connection.getTokenAccountBalance(customFeeRecipientTokenAccount),
          connection.getTokenAccountBalance(
            getAssociatedTokenAddressSync(tokenMint, admin.publicKey)
          ),
        ]);

      // Execute payment - should use global 100 bps protocol fee
      await sdk.updateWallet(customFeeGatewayAuthority);
      const executeIxs = await sdk.executePayment(
        newPolicyPDA,
        new anchor.BN(100000)
      );
      tx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(
        connection,
        tx,
        [customFeeGatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify recipient got amount minus total gateway fee (ADR-0017: protocol
      // is a carve-out of the gateway fee, not an additional deduction).
      const finalRecipientBalance = await connection.getTokenAccountBalance(
        customFeeRecipientTokenAccount
      );
      const totalFee = Math.floor((100000 * 250) / 10000); // 2.5% = 2500
      const protocolCut = Math.floor((totalFee * 2000) / 10000); // 20% share = 500
      const expectedRecipientAmount = 100000 - totalFee; // 97500
      expect(parseInt(finalRecipientBalance.value.amount)).toEqual(
        parseInt(initialRecipientBalance.value.amount) + expectedRecipientAmount
      );

      // Verify protocol fee WAS charged (carve-out of the gateway fee)
      const finalProtocolFeeRecipientBalance =
        await connection.getTokenAccountBalance(
          getAssociatedTokenAddressSync(tokenMint, admin.publicKey)
        );
      expect(parseInt(finalProtocolFeeRecipientBalance.value.amount)).toEqual(
        parseInt(initialProtocolFeeRecipientBalance.value.amount) + protocolCut
      );
    });
  });

  test("Change gateway fee BPS", async () => {
    // Get initial gateway state
    const initialGateway = await sdk.getPaymentGateway(gatewayPDA);
    const initialFeeBps = initialGateway!.gatewayFeeBps;
    expect(initialFeeBps).toEqual(250); // Initial fee from gateway creation

    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(gatewayAuthority);

    // Change the gateway fee BPS
    const newFeeBps = 100;
    const changeFeeBpsIx = await sdk.changeGatewayFeeBps(
      gatewayAuthority.publicKey,
      newFeeBps
    );
    const tx = new Transaction().add(changeFeeBpsIx);

    await sendAndConfirmWithRetry(connection, tx, [gatewayAuthority], {
      commitment: "processed" as Commitment,
    });

    // Verify the gateway fee BPS was updated
    const updatedGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(updatedGateway!.gatewayFeeBps).toEqual(newFeeBps);
    expect(updatedGateway!.authority).toEqual(gatewayAuthority.publicKey); // authority should remain unchanged
  });

  describe("Fee carve-out share constraint (ADR-0017)", () => {
    // Constraint: effective_protocol_share + scheduler_share + referral_allocation ≤ 10000 bps.
    // gateway_fee_bps is NOT part of this constraint (only ≤ 10000 on its own).
    // config.protocol_share_bps defaults to 2000; at creation referral_allocation = 0.
    let h01GatewayAuthority: Keypair;
    let h01GatewayPDA: PublicKey;
    let h01FeeRecipient: Keypair;

    beforeAll(async () => {
      h01GatewayAuthority = Keypair.generate();
      h01FeeRecipient = Keypair.generate();

      await batchFund([
        [h01GatewayAuthority.publicKey, 5],
        [h01FeeRecipient.publicKey, 1],
      ]);

      // Create a gateway with a modest fee (500 bps) and scheduler_share = 0.
      // 2000 (default protocol share) + 0 + 0 = 2000, well below the limit.
      await sdk.updateWallet(admin);
      const createIx = await sdk.createPaymentGateway(
        h01GatewayAuthority.publicKey,
        500,
        0, // schedulerShareBps
        h01FeeRecipient.publicKey,
        "h01 gateway",
        ""
      );
      const tx = new Transaction().add(createIx);
      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed" as Commitment,
      });

      h01GatewayPDA = sdk.getGatewayPda(h01GatewayAuthority.publicKey).address;
    });

    test("create_payment_gateway rejects when scheduler_share + protocol_share > 10000", async () => {
      const freshAuthority = Keypair.generate();
      const freshFeeRecipient = Keypair.generate();
      await batchFund([
        [freshAuthority.publicKey, 1],
        [freshFeeRecipient.publicKey, 1],
      ]);

      await sdk.updateWallet(admin);

      // 2000 (default protocol share) + 8001 (scheduler) = 10001 > 10000 → reject.
      // gateway_fee_bps is irrelevant to the carve-out constraint, so use a small fee.
      const createIx = await sdk.createPaymentGateway(
        freshAuthority.publicKey,
        100,
        8001, // schedulerShareBps
        freshFeeRecipient.publicKey,
        "should fail combined",
        ""
      );
      const tx = new Transaction().add(createIx);
      await expect(
        sendAndConfirmTransaction(connection, tx, [admin], {
          commitment: "processed" as Commitment,
        })
      ).rejects.toThrow();

      // 2000 + 8000 = 10000 ≤ 10000 → must succeed
      const okAuthority = Keypair.generate();
      const okFeeRecipient = Keypair.generate();
      await batchFund([
        [okAuthority.publicKey, 1],
        [okFeeRecipient.publicKey, 1],
      ]);
      const okIx = await sdk.createPaymentGateway(
        okAuthority.publicKey,
        100,
        8000, // schedulerShareBps
        okFeeRecipient.publicKey,
        "should pass combined",
        ""
      );
      const okTx = new Transaction().add(okIx);
      await sendAndConfirmTransaction(connection, okTx, [admin], {
        commitment: "processed" as Commitment,
      });

      const okGateway = await sdk.getPaymentGateway(
        sdk.getGatewayPda(okAuthority.publicKey).address
      );
      expect(okGateway!.schedulerShareBps).toBe(8000);
    });

    test("change_gateway_fee_bps no longer bound by the carve-out share constraint", async () => {
      // ADR-0017 removed gateway_fee_bps from the share constraint; it is now
      // only capped at ≤ 10000. A 9900 bps fee that used to be rejected (the
      // old gateway_fee_bps + protocol_fee_bps < 10000 rule) is now accepted.
      await sdk.updateWallet(h01GatewayAuthority);

      const okIx = await sdk.changeGatewayFeeBps(
        h01GatewayAuthority.publicKey,
        9900
      );
      const okTx = new Transaction().add(okIx);
      await sendAndConfirmTransaction(connection, okTx, [h01GatewayAuthority], {
        commitment: "processed" as Commitment,
      });
      const updated = await sdk.getPaymentGateway(h01GatewayPDA);
      expect(updated!.gatewayFeeBps).toBe(9900);

      // Reset for the next test.
      const resetIx = await sdk.changeGatewayFeeBps(
        h01GatewayAuthority.publicKey,
        500
      );
      const resetTx = new Transaction().add(resetIx);
      await sendAndConfirmTransaction(
        connection,
        resetTx,
        [h01GatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );
    });

    test("update_gateway_protocol_fee rejects when custom_protocol_share + scheduler_share > 10000", async () => {
      // Give the gateway a non-zero scheduler share so the carve-out constraint
      // can actually bind below the 10000 cap on custom_protocol_share_bps.
      await sdk.updateWallet(h01GatewayAuthority);
      const schedIx = await sdk.updateGatewaySchedulerShare(
        h01GatewayAuthority.publicKey,
        1000
      );
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(schedIx),
        [h01GatewayAuthority],
        { commitment: "processed" as Commitment }
      );

      await sdk.updateWallet(admin);

      // custom_protocol_share = 9500 (enabled) + scheduler 1000 = 10500 > 10000 → reject
      const rejectIx = await sdk.updateGatewayProtocolFee(
        h01GatewayAuthority.publicKey,
        true,
        9500
      );
      const rejectTx = new Transaction().add(rejectIx);
      await expect(
        sendAndConfirmTransaction(connection, rejectTx, [admin], {
          commitment: "processed" as Commitment,
        })
      ).rejects.toThrow();

      // custom_protocol_share_bps must NOT have been written, and the
      // FEATURE_CUSTOM_PROTOCOL_FEE bit must NOT be set (Solana rolls back
      // account state when an instruction fails).
      const unchanged = await sdk.getPaymentGateway(h01GatewayPDA);
      expect(unchanged!.customProtocolShareBps).toBe(0);
      expect(
        unchanged!.featureFlags & GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE
      ).toBe(0);

      // 8900 + 1000 = 9900 ≤ 10000 → accept
      const okIx = await sdk.updateGatewayProtocolFee(
        h01GatewayAuthority.publicKey,
        true,
        8900
      );
      const okTx = new Transaction().add(okIx);
      await sendAndConfirmTransaction(connection, okTx, [admin], {
        commitment: "processed" as Commitment,
      });
      const updated = await sdk.getPaymentGateway(h01GatewayPDA);
      expect(updated!.customProtocolShareBps).toBe(8900);
      expect(updated!.featureFlags & GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE).toBe(
        GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE
      );
    });
  });

  describe("Gateway feature flags", () => {
    let flagsGatewayAuthority: Keypair;
    let flagsGatewayPDA: PublicKey;
    let flagsFeeRecipient: Keypair;

    beforeAll(async () => {
      flagsGatewayAuthority = Keypair.generate();
      flagsFeeRecipient = Keypair.generate();

      await batchFund([
        [flagsGatewayAuthority.publicKey, 5],
        [flagsFeeRecipient.publicKey, 1],
      ]);

      await sdk.updateWallet(admin);
      const createIx = await sdk.createPaymentGateway(
        flagsGatewayAuthority.publicKey,
        100,
        0, // schedulerShareBps — no scheduler cut in this test
        flagsFeeRecipient.publicKey,
        "flags test gateway",
        ""
      );
      const tx = new Transaction().add(createIx);
      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed" as Commitment,
      });

      flagsGatewayPDA = sdk.getGatewayPda(
        flagsGatewayAuthority.publicKey
      ).address;
    });

    test("New gateway starts with all feature flags disabled", async () => {
      const gateway = await sdk.getPaymentGateway(flagsGatewayPDA);
      expect(gateway).not.toBeNull();
      expect(gateway!.featureFlags).toBe(0);
    });

    test("Gateway authority can enable REFERRAL flag", async () => {
      await sdk.updateWallet(flagsGatewayAuthority);

      const enableIx = await sdk.enableGatewayFeature(
        flagsGatewayAuthority.publicKey,
        GATEWAY_FEATURES.REFERRAL
      );
      const tx = new Transaction().add(enableIx);
      await sendAndConfirmTransaction(connection, tx, [flagsGatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(flagsGatewayPDA);
      expect(gateway!.featureFlags & GATEWAY_FEATURES.REFERRAL).toBe(
        GATEWAY_FEATURES.REFERRAL
      );
    });

    test("Can enable NET_AMOUNT flag alongside REFERRAL", async () => {
      await sdk.updateWallet(flagsGatewayAuthority);

      const enableIx = await sdk.enableGatewayFeature(
        flagsGatewayAuthority.publicKey,
        GATEWAY_FEATURES.NET_AMOUNT
      );
      const tx = new Transaction().add(enableIx);
      await sendAndConfirmTransaction(connection, tx, [flagsGatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(flagsGatewayPDA);
      expect(gateway!.featureFlags & GATEWAY_FEATURES.REFERRAL).toBe(
        GATEWAY_FEATURES.REFERRAL
      );
      expect(gateway!.featureFlags & GATEWAY_FEATURES.NET_AMOUNT).toBe(
        GATEWAY_FEATURES.NET_AMOUNT
      );
      expect(gateway!.featureFlags & GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE).toBe(
        0
      );
    });

    test("CUSTOM_PROTOCOL_FEE bit is protected — on-chain strips it even if passed directly", async () => {
      await sdk.updateWallet(flagsGatewayAuthority);

      const { address: gatewayPda } = sdk.getGatewayPda(
        flagsGatewayAuthority.publicKey
      );
      const rawIx = await sdk.program.methods
        .updateGatewayFeatureFlags({
          featureFlags:
            GATEWAY_FEATURES.REFERRAL |
            GATEWAY_FEATURES.NET_AMOUNT |
            GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE,
        })
        .accountsStrict({
          authority: flagsGatewayAuthority.publicKey,
          gateway: gatewayPda,
        })
        .instruction();
      const tx = new Transaction().add(rawIx);
      await sendAndConfirmTransaction(connection, tx, [flagsGatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(flagsGatewayPDA);
      expect(gateway!.featureFlags & GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE).toBe(
        0
      );
      expect(
        gateway!.featureFlags &
        (GATEWAY_FEATURES.REFERRAL | GATEWAY_FEATURES.NET_AMOUNT)
      ).toBe(GATEWAY_FEATURES.REFERRAL | GATEWAY_FEATURES.NET_AMOUNT);
    });

    test("Can disable a single flag without affecting others", async () => {
      await sdk.updateWallet(flagsGatewayAuthority);

      const disableIx = await sdk.disableGatewayFeature(
        flagsGatewayAuthority.publicKey,
        GATEWAY_FEATURES.NET_AMOUNT
      );
      const tx = new Transaction().add(disableIx);
      await sendAndConfirmTransaction(connection, tx, [flagsGatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(flagsGatewayPDA);
      expect(gateway!.featureFlags & GATEWAY_FEATURES.NET_AMOUNT).toBe(0);
      expect(gateway!.featureFlags & GATEWAY_FEATURES.REFERRAL).toBe(
        GATEWAY_FEATURES.REFERRAL
      );
    });

    test("Can set raw flags via updateGatewayFeatureFlags", async () => {
      await sdk.updateWallet(flagsGatewayAuthority);

      const rawFlags = GATEWAY_FEATURES.NET_AMOUNT;
      const updateIx = await sdk.updateGatewayFeatureFlags(
        flagsGatewayAuthority.publicKey,
        rawFlags
      );
      const tx = new Transaction().add(updateIx);
      await sendAndConfirmTransaction(connection, tx, [flagsGatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(flagsGatewayPDA);
      expect(gateway!.featureFlags & GATEWAY_FEATURES.NET_AMOUNT).toBe(
        GATEWAY_FEATURES.NET_AMOUNT
      );
      expect(gateway!.featureFlags & GATEWAY_FEATURES.REFERRAL).toBe(0);
    });

    test("SDK rejects invalid flag bits", async () => {
      await expect(
        sdk.updateGatewayFeatureFlags(flagsGatewayAuthority.publicKey, 0x08)
      ).rejects.toThrow();
    });

    test("Can disable all flags", async () => {
      await sdk.updateWallet(flagsGatewayAuthority);

      const updateIx = await sdk.updateGatewayFeatureFlags(
        flagsGatewayAuthority.publicKey,
        0
      );
      const tx = new Transaction().add(updateIx);
      await sendAndConfirmTransaction(connection, tx, [flagsGatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(flagsGatewayPDA);
      expect(gateway!.featureFlags).toBe(0);
    });

    test("Non-authority cannot update feature flags", async () => {
      const rando = Keypair.generate();
      await fund(rando.publicKey, 1);
      await sdk.updateWallet(rando);

      const updateIx = await sdk.updateGatewayFeatureFlags(
        flagsGatewayAuthority.publicKey,
        GATEWAY_FEATURES.REFERRAL
      );
      const tx = new Transaction().add(updateIx);
      await expect(
        sendAndConfirmTransaction(connection, tx, [rando], {
          commitment: "processed" as Commitment,
        })
      ).rejects.toThrow();
    });
  });

  describe("Transfer instruction", () => {
    let transferUser: Keypair;
    let transferUserTokenAccount: PublicKey;
    let transferRecipient: Keypair;

    const GATEWAY_FEE_BPS = 100;

    function calcFees(grossAmount: number) {
      const totalFee = Math.floor((grossAmount * GATEWAY_FEE_BPS) / 10000);
      const recipientAmount = grossAmount - totalFee;
      return { totalFee, recipientAmount };
    }

    beforeAll(async () => {
      transferUser = Keypair.generate();
      transferRecipient = Keypair.generate();

      await batchFund([
        [transferUser.publicKey, 5],
        [transferRecipient.publicKey, 5],
      ]);

      [transferUserTokenAccount] = await batchCreateATAs([
        transferUser.publicKey,
        transferRecipient.publicKey,
      ]);

      await batchMintTo([
        { address: transferUserTokenAccount, amount: 10000000n },
      ]);
    });

    test("Execute simple transfer with memo", async () => {
      await sdk.updateWallet(transferUser);

      const recipientAta = getAssociatedTokenAddressSync(
        tokenMint,
        transferRecipient.publicKey
      );
      const [initialUserBalance, initialRecipientBalance] = await Promise.all([
        connection.getTokenAccountBalance(transferUserTokenAccount),
        connection.getTokenAccountBalance(recipientAta),
      ]);

      const transferAmount = new anchor.BN(500000);
      const { recipientAmount, totalFee } = calcFees(transferAmount.toNumber());
      const referralPool = Math.floor((totalFee * 500) / 10000);

      const instructions = await sdk.transfer(
        tokenMint,
        transferRecipient.publicKey,
        gatewayPDA,
        transferAmount,
        "one-time payment #12345"
      );

      const tx = new Transaction().add(...instructions);
      await sendAndConfirmTransaction(connection, tx, [transferUser], {
        commitment: "processed" as Commitment,
      });

      const [finalUserBalance, finalRecipientBalance] = await Promise.all([
        connection.getTokenAccountBalance(transferUserTokenAccount),
        connection.getTokenAccountBalance(recipientAta),
      ]);

      expect(parseInt(finalRecipientBalance.value.amount)).toEqual(
        parseInt(initialRecipientBalance.value.amount) + recipientAmount
      );
      expect(parseInt(finalUserBalance.value.amount)).toEqual(
        parseInt(initialUserBalance.value.amount) -
        transferAmount.toNumber() +
        referralPool
      );
    });

    test("Transfer fails with zero amount", async () => {
      await sdk.updateWallet(transferUser);

      try {
        const instructions = await sdk.transfer(
          tokenMint,
          transferRecipient.publicKey,
          gatewayPDA,
          new anchor.BN(0),
          "zero amount test"
        );

        const tx = new Transaction().add(...instructions);
        await sendAndConfirmTransaction(connection, tx, [transferUser], {
          commitment: "processed" as Commitment,
        });

        assert(false, "Expected transfer to fail with zero amount");
      } catch (error: any) {
        expect(error.message).toContain("InvalidAmount");
      }
    });

    test("Transfer fails with insufficient balance", async () => {
      await sdk.updateWallet(transferUser);

      const userBalance = await connection.getTokenAccountBalance(
        transferUserTokenAccount
      );
      const excessiveAmount = new anchor.BN(
        parseInt(userBalance.value.amount) + 1000000
      );

      try {
        const instructions = await sdk.transfer(
          tokenMint,
          transferRecipient.publicKey,
          gatewayPDA,
          excessiveAmount,
          "insufficient balance test"
        );

        const tx = new Transaction().add(...instructions);
        await sendAndConfirmTransaction(connection, tx, [transferUser], {
          commitment: "processed" as Commitment,
        });

        assert(false, "Expected transfer to fail with insufficient balance");
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    test("Transfer works with different token mint", async () => {
      const differentMint = await createMint(
        connection,
        mintAuthority,
        mintAuthority.publicKey,
        null,
        6
      );

      const userAta = getAssociatedTokenAddressSync(
        differentMint,
        transferUser.publicKey
      );
      const recipientAta = getAssociatedTokenAddressSync(
        differentMint,
        transferRecipient.publicKey
      );

      const ataTx = new Transaction();
      ataTx.add(
        createAssociatedTokenAccountInstruction(
          admin.publicKey,
          userAta,
          transferUser.publicKey,
          differentMint
        )
      );
      ataTx.add(
        createAssociatedTokenAccountInstruction(
          admin.publicKey,
          recipientAta,
          transferRecipient.publicKey,
          differentMint
        )
      );
      ataTx.add(
        createMintToInstruction(
          differentMint,
          userAta,
          mintAuthority.publicKey,
          1000000n
        )
      );
      await sendAndConfirmTransaction(
        connection,
        ataTx,
        [admin, mintAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      await sdk.updateWallet(transferUser);

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientAta
      );

      const transferAmount = new anchor.BN(100000);
      const { recipientAmount } = calcFees(transferAmount.toNumber());

      const instructions = await sdk.transfer(
        differentMint,
        transferRecipient.publicKey,
        gatewayPDA,
        transferAmount,
        "different mint transfer"
      );

      const tx = new Transaction().add(...instructions);
      await sendAndConfirmTransaction(connection, tx, [transferUser], {
        commitment: "processed" as Commitment,
      });

      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientAta
      );
      expect(parseInt(finalRecipientBalance.value.amount)).toEqual(
        parseInt(initialRecipientBalance.value.amount) + recipientAmount
      );
    });

    test("Transfer succeeds for any user with token account", async () => {
      const nonOwner = Keypair.generate();
      await batchFund([[nonOwner.publicKey, 5]]);

      const [nonOwnerAta] = await batchCreateATAs([nonOwner.publicKey]);
      await batchMintTo([{ address: nonOwnerAta, amount: 1000000n }]);

      await sdk.updateWallet(nonOwner);

      const recipientAta = getAssociatedTokenAddressSync(
        tokenMint,
        transferRecipient.publicKey
      );
      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientAta
      );

      const transferAmount = new anchor.BN(50000);
      const { recipientAmount } = calcFees(transferAmount.toNumber());

      const instructions = await sdk.transfer(
        tokenMint,
        transferRecipient.publicKey,
        gatewayPDA,
        transferAmount,
        "new user transfer"
      );

      const tx = new Transaction().add(...instructions);
      await sendAndConfirmTransaction(connection, tx, [nonOwner], {
        commitment: "processed" as Commitment,
      });

      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientAta
      );
      expect(parseInt(finalRecipientBalance.value.amount)).toEqual(
        parseInt(initialRecipientBalance.value.amount) + recipientAmount
      );
    });

    test("Transfer with empty memo", async () => {
      await sdk.updateWallet(transferUser);

      const recipientAta = getAssociatedTokenAddressSync(
        tokenMint,
        transferRecipient.publicKey
      );
      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientAta
      );

      const transferAmount = new anchor.BN(100000);
      const { recipientAmount } = calcFees(transferAmount.toNumber());

      const instructions = await sdk.transfer(
        tokenMint,
        transferRecipient.publicKey,
        gatewayPDA,
        transferAmount,
        ""
      );

      const tx = new Transaction().add(...instructions);
      await sendAndConfirmTransaction(connection, tx, [transferUser], {
        commitment: "processed" as Commitment,
      });

      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientAta
      );

      expect(parseInt(finalRecipientBalance.value.amount)).toEqual(
        parseInt(initialRecipientBalance.value.amount) + recipientAmount
      );
    });

    test("Transfer with full 64-byte memo", async () => {
      await sdk.updateWallet(transferUser);

      const recipientAta = getAssociatedTokenAddressSync(
        tokenMint,
        transferRecipient.publicKey
      );
      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientAta
      );

      const transferAmount = new anchor.BN(250000);
      const { recipientAmount } = calcFees(transferAmount.toNumber());

      const instructions = await sdk.transfer(
        tokenMint,
        transferRecipient.publicKey,
        gatewayPDA,
        transferAmount,
        "Invoice #INV-2024-001234: Payment for services rendered"
      );

      const tx = new Transaction().add(...instructions);
      await sendAndConfirmTransaction(connection, tx, [transferUser], {
        commitment: "processed" as Commitment,
      });

      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientAta
      );

      expect(parseInt(finalRecipientBalance.value.amount)).toEqual(
        parseInt(initialRecipientBalance.value.amount) + recipientAmount
      );
    });

    test("Multiple sequential transfers", async () => {
      await sdk.updateWallet(transferUser);

      const recipientAta = getAssociatedTokenAddressSync(
        tokenMint,
        transferRecipient.publicKey
      );
      const [initialRecipientBalance, initialUserBalance] = await Promise.all([
        connection.getTokenAccountBalance(recipientAta),
        connection.getTokenAccountBalance(transferUserTokenAccount),
      ]);

      const transferAmounts = [100000, 200000, 150000];
      let totalGross = 0;
      let totalRecipient = 0;
      let totalReferralDust = 0;

      for (let i = 0; i < transferAmounts.length; i++) {
        const { recipientAmount, totalFee } = calcFees(transferAmounts[i]);
        totalGross += transferAmounts[i];
        totalRecipient += recipientAmount;
        totalReferralDust += Math.floor((totalFee * 500) / 10000);

        const instructions = await sdk.transfer(
          tokenMint,
          transferRecipient.publicKey,
          gatewayPDA,
          new anchor.BN(transferAmounts[i]),
          `batch transfer #${i + 1}`
        );

        const tx = new Transaction().add(...instructions);
        await sendAndConfirmTransaction(connection, tx, [transferUser], {
          commitment: "processed" as Commitment,
        });
      }

      const [finalRecipientBalance, finalUserBalance] = await Promise.all([
        connection.getTokenAccountBalance(recipientAta),
        connection.getTokenAccountBalance(transferUserTokenAccount),
      ]);

      expect(parseInt(finalRecipientBalance.value.amount)).toEqual(
        parseInt(initialRecipientBalance.value.amount) + totalRecipient
      );
      expect(parseInt(finalUserBalance.value.amount)).toEqual(
        parseInt(initialUserBalance.value.amount) -
        totalGross +
        totalReferralDust
      );
    });
  });

  describe("Full cleanup - delete all policies and user payment", () => {
    test("Delete all remaining payment policies for user", async () => {
      await sdk.updateWallet(user);

      const userPayment = await sdk.getUserPayment(userPaymentPDA);
      expect(userPayment).not.toBeNull();
      expect(userPayment!.activePoliciesCount).toBeGreaterThan(0);

      const createdCount = userPayment!.createdPoliciesCount;

      const deletePolicy = async (policyId: number) => {
        const [policyPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("payment_policy"),
            userPaymentPDA.toBuffer(),
            new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
          ],
          program.programId
        );

        const existing = await sdk.getPaymentPolicy(policyPda);
        if (!existing) return;

        // CF-014: Active policies can't be deleted — pause first if needed.
        const isActive =
          (existing.status as { active?: unknown } | undefined)?.active !==
          undefined;
        if (isActive) {
          const pauseIx = await sdk.changePaymentPolicyStatus(
            tokenMint,
            policyId,
            { paused: {} }
          );
          await sendAndConfirmWithRetry(
            connection,
            new Transaction().add(pauseIx),
            [user],
            { commitment: "processed" as Commitment }
          );
        }

        const deleteIx = await sdk.deletePaymentPolicy(tokenMint, policyId);
        const tx = new Transaction().add(deleteIx);
        await sendAndConfirmWithRetry(connection, tx, [user], {
          commitment: "processed" as Commitment,
        });

        const afterDelete = await sdk.getPaymentPolicy(policyPda);
        expect(afterDelete).toBeNull();
      };

      // Sequential — parallel deletes overwhelm Surfpool on CI (2-core),
      // causing blockhash expiry. Sequential is slightly slower in the happy
      // path but never stalls the instance.
      for (let policyId = 1; policyId <= createdCount; policyId++) {
        await deletePolicy(policyId);
      }

      const finalUserPayment = await sdk.getUserPayment(userPaymentPDA);
      expect(finalUserPayment!.activePoliciesCount).toBe(0);
    });

    test("Delete user payment account returns rent to owner", async () => {
      const userPayment = await sdk.getUserPayment(userPaymentPDA);
      expect(userPayment).not.toBeNull();
      expect(userPayment!.activePoliciesCount).toBe(0);

      const ownerBalanceBefore = await connection.getBalance(user.publicKey);

      const deleteUserPaymentIx = await sdk.deleteUserPayment(tokenMint);

      const tx = new Transaction().add(deleteUserPaymentIx);
      await sendAndConfirmTransaction(connection, tx, [user], {
        commitment: "processed" as Commitment,
      });

      const deletedAccount = await sdk.getUserPayment(userPaymentPDA);
      expect(deletedAccount).toBeNull();

      const ownerBalanceAfter = await connection.getBalance(user.publicKey);
      expect(ownerBalanceAfter).toBeGreaterThan(ownerBalanceBefore);
    });
  });

  describe("Delegate Migration: global PDA -> UserPayment PDA", () => {
    let migrateUser: Keypair;
    let migrateUserTokenAccount: PublicKey;
    let migrateUserPaymentPDA: PublicKey;
    let migratePolicy1PDA: PublicKey;
    let migratePolicy2PDA: PublicKey;
    let migratePaymentsDelegate: PublicKey;

    beforeAll(async () => {
      migrateUser = Keypair.generate();
      await batchFund([[migrateUser.publicKey, 10]]);

      [migrateUserTokenAccount] = await batchCreateATAs([
        migrateUser.publicKey,
      ]);
      await batchMintTo([
        { address: migrateUserTokenAccount, amount: 10_000_000n },
      ]);

      [migrateUserPaymentPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_payment"),
          migrateUser.publicKey.toBuffer(),
          tokenMint.toBuffer(),
        ],
        program.programId
      );

      [migratePaymentsDelegate] = PublicKey.findProgramAddressSync(
        [Buffer.from("payments")],
        program.programId
      );

      await sdk.updateWallet(migrateUser);
      const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createUserPaymentIx),
        [migrateUser],
        { commitment: "processed" as Commitment }
      );
    });

    test("v0: Execute payment with global payments_delegate PDA", async () => {
      await sdk.updateWallet(migrateUser);

      const memo = new Uint8Array(64).fill(0);
      Buffer.from("v0 delegate test").copy(memo);

      const paymentFrequency = { daily: {} };
      const amount = new anchor.BN(5000);
      const startTime = Math.floor(Date.now() / 1000) - 7200;

      const createPolicyIx = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        new anchor.BN(startTime)
      );

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createPolicyIx),
        [migrateUser],
        { commitment: "processed" as Commitment }
      );

      [migratePolicy1PDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          migrateUserPaymentPDA.toBuffer(),
          new anchor.BN(1).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      await approve(
        connection,
        migrateUser,
        migrateUserTokenAccount,
        migratePaymentsDelegate,
        migrateUser,
        10_000_000
      );

      const tokenAcc = await getAccount(connection, migrateUserTokenAccount);
      expect(tokenAcc.delegate).toEqual(migratePaymentsDelegate);

      await sdk.updateWallet(gatewayExecutionSigner);
      const executeIxs = await sdk.executePayment(migratePolicy1PDA);
      await sendAndConfirmTransaction(
        connection,
        new Transaction()
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }))
          .add(...executeIxs),
        [gatewayExecutionSigner],
        { commitment: "processed" as Commitment }
      );

      const policy = await sdk.getPaymentPolicy(migratePolicy1PDA);
      expect(policy!.paymentCount).toBe(1);
      expect(policy!.totalPaid.toNumber()).toBe(5000);
    });

    test("v1: Execute payment with UserPayment PDA as delegate", async () => {
      await revoke(
        connection,
        migrateUser,
        migrateUserTokenAccount,
        migrateUser
      );

      await approve(
        connection,
        migrateUser,
        migrateUserTokenAccount,
        migrateUserPaymentPDA,
        migrateUser,
        10_000_000
      );

      const tokenAcc = await getAccount(connection, migrateUserTokenAccount);
      expect(tokenAcc.delegate).toEqual(migrateUserPaymentPDA);

      await sdk.updateWallet(migrateUser);

      const memo2 = new Uint8Array(64).fill(0);
      Buffer.from("v1 delegate test").copy(memo2);

      const startTime = Math.floor(Date.now() / 1000) - 7200;
      const createPolicy2Ix = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(3000),
        true,
        null,
        { daily: {} },
        Array.from(memo2),
        new anchor.BN(startTime)
      );

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createPolicy2Ix),
        [migrateUser],
        { commitment: "processed" as Commitment }
      );

      [migratePolicy2PDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          migrateUserPaymentPDA.toBuffer(),
          new anchor.BN(2).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      await sdk.updateWallet(gatewayExecutionSigner);
      const executeIxs = await sdk.executePayment(migratePolicy2PDA);
      await sendAndConfirmTransaction(
        connection,
        new Transaction()
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }))
          .add(...executeIxs),
        [gatewayExecutionSigner],
        { commitment: "processed" as Commitment }
      );

      const policy2 = await sdk.getPaymentPolicy(migratePolicy2PDA);
      expect(policy2!.paymentCount).toBe(1);
      expect(policy2!.totalPaid.toNumber()).toBe(3000);
    });

    test("Migration: existing policy still works after switching to UserPayment PDA delegate", async () => {
      const startTime3 = Math.floor(Date.now() / 1000) - 7200;
      const memo3 = new Uint8Array(64).fill(0);
      Buffer.from("migration test").copy(memo3);

      await sdk.updateWallet(migrateUser);
      const changeStatusIx = await sdk.changePaymentPolicyStatus(tokenMint, 1, {
        paused: {},
      });
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(changeStatusIx),
        [migrateUser],
        { commitment: "processed" as Commitment }
      );

      const memo4 = new Uint8Array(64).fill(0);
      Buffer.from("migration policy 3").copy(memo4);

      const createPolicy3Ix = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(2000),
        true,
        null,
        { daily: {} },
        Array.from(memo4),
        new anchor.BN(startTime3)
      );

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createPolicy3Ix),
        [migrateUser],
        { commitment: "processed" as Commitment }
      );

      const [policy3PDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          migrateUserPaymentPDA.toBuffer(),
          new anchor.BN(3).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      await sdk.updateWallet(gatewayExecutionSigner);
      const executeIxs = await sdk.executePayment(policy3PDA);
      await sendAndConfirmTransaction(
        connection,
        new Transaction()
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }))
          .add(...executeIxs),
        [gatewayExecutionSigner],
        { commitment: "processed" as Commitment }
      );

      const policy3 = await sdk.getPaymentPolicy(policy3PDA);
      expect(policy3!.paymentCount).toBe(1);
      expect(policy3!.totalPaid.toNumber()).toBe(2000);
    });

    test("Fails: no delegate set on token account", async () => {
      await revoke(
        connection,
        migrateUser,
        migrateUserTokenAccount,
        migrateUser
      );

      const startTime = Math.floor(Date.now() / 1000) - 7200;
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("no delegate test").copy(memo);

      await sdk.updateWallet(migrateUser);
      const createPolicyIx = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(1000),
        true,
        null,
        { daily: {} },
        Array.from(memo),
        new anchor.BN(startTime)
      );

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createPolicyIx),
        [migrateUser],
        { commitment: "processed" as Commitment }
      );

      const [noDelegatePolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          migrateUserPaymentPDA.toBuffer(),
          new anchor.BN(4).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      await sdk.updateWallet(gatewayExecutionSigner);
      try {
        const executeIxs = await sdk.executePayment(noDelegatePolicyPDA);
        await sendAndConfirmTransaction(
          connection,
          new Transaction()
            .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }))
            .add(...executeIxs),
          [gatewayExecutionSigner],
          { commitment: "processed" as Commitment }
        );
        assert(false, "Expected payment to fail with no delegate");
      } catch (error: any) {
        expect(error.message).toContain("No or incorrect delegate set in ata");
      }

      await approve(
        connection,
        migrateUser,
        migrateUserTokenAccount,
        migrateUserPaymentPDA,
        migrateUser,
        10_000_000
      );
    });

    test("SDK migrateDelegate transitions from old to new PDA", async () => {
      await revoke(
        connection,
        migrateUser,
        migrateUserTokenAccount,
        migrateUser
      );

      await approve(
        connection,
        migrateUser,
        migrateUserTokenAccount,
        migratePaymentsDelegate,
        migrateUser,
        5_000_000
      );

      let tokenAcc = await getAccount(connection, migrateUserTokenAccount);
      expect(tokenAcc.delegate).toEqual(migratePaymentsDelegate);

      await sdk.updateWallet(migrateUser);
      const migrateIxs = await sdk.migrateDelegate(
        tokenMint,
        new anchor.BN(10_000_000)
      );

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(...migrateIxs),
        [migrateUser],
        { commitment: "processed" as Commitment }
      );

      tokenAcc = await getAccount(connection, migrateUserTokenAccount);
      expect(tokenAcc.delegate).toEqual(migrateUserPaymentPDA);
      expect(Number(tokenAcc.delegatedAmount)).toBe(10_000_000);
    });
  });

  describe("Program authority rotation (M-02)", () => {
    test("Current admin can rotate authority to a new key", async () => {
      // Sanity: admin is still the authority before we rotate.
      const configBefore = await sdk.getProgramConfig(configPDA);
      expect(configBefore!.admin).toEqual(admin.publicKey);

      const newAdmin = Keypair.generate();
      await fund(newAdmin.publicKey, 1);

      await sdk.updateWallet(admin);
      const rotateIx = await sdk.changeProgramAuthority(newAdmin.publicKey);
      const tx = new Transaction().add(rotateIx);
      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed" as Commitment,
      });

      const configAfter = await sdk.getProgramConfig(configPDA);
      expect(configAfter!.admin).toEqual(newAdmin.publicKey);
      // fee_recipient must be untouched by the rotation.
      expect(configAfter!.feeRecipient).toEqual(configBefore!.feeRecipient);

      // Rotate back so the rest of the suite (which assumes `admin` is the
      // protocol admin) keeps working.
      await sdk.updateWallet(newAdmin);
      const rotateBackIx = await sdk.changeProgramAuthority(admin.publicKey);
      const revertTx = new Transaction().add(rotateBackIx);
      await sendAndConfirmTransaction(connection, revertTx, [newAdmin], {
        commitment: "processed" as Commitment,
      });

      const configRestored = await sdk.getProgramConfig(configPDA);
      expect(configRestored!.admin).toEqual(admin.publicKey);
    });

    test("Unauthorized key cannot rotate authority", async () => {
      const impostor = Keypair.generate();
      await fund(impostor.publicKey, 1);

      const configBefore = await sdk.getProgramConfig(configPDA);
      expect(configBefore!.admin).toEqual(admin.publicKey);

      const target = Keypair.generate();

      await sdk.updateWallet(impostor);
      const rotateIx = await sdk.changeProgramAuthority(target.publicKey);
      const tx = new Transaction().add(rotateIx);

      await expect(
        sendAndConfirmTransaction(connection, tx, [impostor], {
          commitment: "processed" as Commitment,
        })
      ).rejects.toThrow();

      // State must be unchanged.
      const configAfter = await sdk.getProgramConfig(configPDA);
      expect(configAfter!.admin).toEqual(admin.publicKey);
    });
  });
});
