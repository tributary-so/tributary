import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Tributary } from "../target/types/tributary";
import {
  Tributary as TributarySDK,
  lighthouse,
  parseValidationPda,
} from "../packages/sdk/src";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getComposablePolicyPda,
  getPreValidationPda,
  getPostValidationPda,
  getPaymentsDelegatePda,
} from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import assert from "assert";
import { Buffer } from "buffer";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { LIGHTHOUSE_PUBKEY } from "./constants";
import { ADMIN_KEYPAIR } from "./helpers/composable";

// ── Composable v2.1 helpers (mirrors tests/composable.test.ts) ───────────
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

// A composable policy with forward_config.target_program = PublicKey.default
// has its forward CPI disabled (the "no forward step" sentinel — mirrors the
// validation_program sentinel). The topup flow is a same-mint pull → sweep:
// the intermediate is funded by the pull and swept directly to the recipient,
// so no forward program is required. Allowing tokenProgram as the forward
// target instead would be a drain vector (the forward AccountMeta list's
// `to` account is not validated, so the gateway could redirect the sweep).
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// ── Lighthouse assertion ─────────────────────────────────────────────────
// Built via the SDK facade (packages/sdk/src/lighthouse.ts), which wraps the
// vendored official Lighthouse client. See topup-balance usage below.

describe("Composable Topup Balance Flow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let surfpool: SurfpoolHelper;
  let sdk: TributarySDK;

  const admin = Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR));
  const feeRecipient = Keypair.generate();
  const gatewayAuthority = Keypair.generate();
  const configPDA = getConfigPda(program.programId).address;

  const hotWallet = Keypair.generate();
  const coldWallet = Keypair.generate();

  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let paymentsDelegatePDA: PublicKey;
  let composablePolicyPDA: PublicKey;
  let preValidationPDA: PublicKey;
  let postValidationPDA: PublicKey;

  let coldWalletUsdcAta: PublicKey;
  let hotWalletUsdcAta: PublicKey;
  let feeRecipientUsdcAta: PublicKey;
  let adminUsdcAta: PublicKey;

  let composablePolicyId: number;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);

    const isSurfpool = await surfpool.isSurfpool();
    if (!isSurfpool) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    // ── Fund SOL ────────────────────────────────────────────────────────
    await surfpool.setAccount({
      publicKey: hotWallet.publicKey,
      lamports: 10_000_000_000,
    });
    await surfpool.setAccount({
      publicKey: coldWallet.publicKey,
      lamports: 10_000_000_000,
    });
    await surfpool.setAccount({
      publicKey: feeRecipient.publicKey,
      lamports: 1_000_000_000,
    });
    await surfpool.setAccount({
      publicKey: admin.publicKey,
      lamports: 1_000_000_000,
    });
    await surfpool.setAccount({
      publicKey: gatewayAuthority.publicKey,
      lamports: 1_000_000_000,
    });
    await surfpool.setAccount({
      publicKey: wallet.publicKey,
      lamports: 1_000_000_000,
    });

    // SDK
    sdk = new TributarySDK(connection, wallet.payer);

    // need to fetch the lighthouse contract so surfpool has it
    const lighthouseProgram = await sdk.connection.getAccountInfo(
      LIGHTHOUSE_PUBKEY
    );
    expect(lighthouseProgram).not.toBeNull();
    expect(lighthouseProgram!.data).toBeDefined();
    expect(lighthouseProgram!.data.length).toBeGreaterThan(0);

    // Derive PDAs
    gatewayPDA = getGatewayPda(hotWallet.publicKey, program.programId).address;
    paymentsDelegatePDA = getPaymentsDelegatePda(program.programId).address;
    userPaymentPDA = getUserPaymentPda(
      coldWallet.publicKey,
      USDC_MINT,
      program.programId
    ).address;

    // Derive token accounts
    coldWalletUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      coldWallet.publicKey
    );
    hotWalletUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      hotWallet.publicKey
    );
    feeRecipientUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      feeRecipient.publicKey
    );
    adminUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, admin.publicKey);

    const ataTx = new Transaction();
    ataTx.add(
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        coldWalletUsdcAta,
        coldWallet.publicKey,
        USDC_MINT
      )
    );
    ataTx.add(
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        hotWalletUsdcAta,
        hotWallet.publicKey,
        USDC_MINT
      )
    );
    ataTx.add(
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        feeRecipientUsdcAta,
        feeRecipient.publicKey,
        USDC_MINT
      )
    );
    try {
      await sendAndConfirmTransaction(connection, ataTx, [admin], {
        commitment: "processed",
      });
    } catch {
      // ATAs seem to exist already
    }
    try {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          createAssociatedTokenAccountInstruction(
            admin.publicKey,
            adminUsdcAta,
            admin.publicKey,
            USDC_MINT
          )
        ),
        [admin],
        {
          commitment: "processed",
        }
      );
    } catch {
      // admin ATA seems to exist already
    }

    // ── Fund USDC ───────────────────────────────────────────────────────
    // hotWallet: 40 USDC (below the 50 USDC threshold)
    await surfpool.setTokenAccount({
      owner: hotWallet.publicKey,
      mint: USDC_MINT,
      amount: 40_000_000, // 40 USDC
    });

    // coldWallet: 1000 USDC (funding source for topup)
    // Delegate set to the UserPayment PDA (v1 model per MIGRATION.md)
    await surfpool.setTokenAccount({
      owner: coldWallet.publicKey,
      mint: USDC_MINT,
      amount: 1_000_000_000, // 1000 USDC
      delegate: userPaymentPDA,
      delegatedAmount: 1_000_000_000,
    });

    // feeRecipient: empty ATA (gateway fee = 0, but account must exist)
    await surfpool.setTokenAccount({
      owner: feeRecipient.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });

    // wallet
    await surfpool.setTokenAccount({
      owner: wallet.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });

    // Mock admin key into the global state
    const configAccount = await sdk.getProgramConfig(configPDA);
    configAccount.admin = admin.publicKey;
    configAccount.feeRecipient = admin.publicKey;
    const serialized = await program.coder.accounts.encode(
      "programConfig",
      configAccount
    );
    await surfpool.setAccount({
      publicKey: configPDA,
      data: serialized.toString("hex"),
    });
  });

  test("create gateway", async () => {
    await sdk.updateWallet(admin);

    gatewayPDA = getGatewayPda(
      gatewayAuthority.publicKey,
      program.programId
    ).address;

    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      0, // 0 bps gateway fee — simplifies math
      0, // schedulerShareBps — no scheduler cut in this test
      feeRecipient.publicKey, // fee recipient
      "Gateway",
      "https://tributary.so"
    );
    const tx = new Transaction().add(gatewayIx);

    await sendAndConfirmTransaction(connection, tx, [admin], {
      commitment: "processed",
    });

    const gatewayAccount = await sdk.getPaymentGateway(gatewayPDA);

    expect(gatewayAccount!.authority).toEqual(gatewayAuthority.publicKey);
    expect(gatewayAccount!.feeRecipient).toEqual(feeRecipient.publicKey);
    expect(gatewayAccount!.gatewayFeeBps).toBe(0);
    expect(gatewayAccount!.isActive).toBe(true);
    expect(gatewayAccount!.createdAt.toNumber()).toBeGreaterThan(0);
  });

  test("create coldWallet payment for USDC mint", async () => {
    await sdk.updateWallet(coldWallet);

    userPaymentPDA = getUserPaymentPda(
      coldWallet.publicKey,
      USDC_MINT,
      program.programId
    ).address;

    const createUserPaymentIx = await sdk.createUserPayment(USDC_MINT);
    const tx = new Transaction().add(createUserPaymentIx);

    await sendAndConfirmTransaction(connection, tx, [coldWallet], {
      commitment: "processed",
    });

    const userPayment = await sdk.getUserPayment(userPaymentPDA);

    expect(userPayment).not.toBeNull();
    expect(userPayment!.owner).toEqual(coldWallet.publicKey);
    expect(userPayment!.tokenMint).toEqual(USDC_MINT);
    expect(userPayment!.createdPoliciesCount).toBe(0);
    expect(userPayment!.isActive).toBe(true);
  });

  test("Create composable topup policy — pay-as-you-go policy + Lighthouse validation", async () => {
    await sdk.updateWallet(coldWallet);

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

    const now = Math.floor(Date.now() / 1000);

    // PayAsYouGo policy: 100 USDC/month max, 50 USDC max chunk
    const policyType = {
      payAsYouGo: {
        maxAmountPerPeriod: new anchor.BN(100_000_000), // 100 USDC
        maxChunkAmount: new anchor.BN(50_000_000), // 50 USDC
        periodLengthSeconds: new anchor.BN(30 * 24 * 3600), // 30 days
        currentPeriodStart: new anchor.BN(now),
        currentPeriodTotal: new anchor.BN(0),
        expiryDate: null,
        padding: new Array(79).fill(0),
      },
    };

    const memo = new Array(32).fill(0);
    Buffer.from("Topup balance").copy(Buffer.from(memo));

    // Forward disabled: instructionConstraint.programId = PublicKey.default
    // is the "no forward step" sentinel. The topup is a same-mint pull →
    // sweep, so no swap program is involved. num_data_checks must be 0
    // (there is no forward instruction_data to byte-range validate).
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
          PublicKey.default,
          PublicKey.default,
          PublicKey.default,
          PublicKey.default,
        ],
      },
    };

    // Lighthouse validation: assert hotWallet USDC amount < 50 USDC
    const guard = lighthouse
      .tokenAccount(hotWalletUsdcAta)
      .amount(50_000_000, "<")
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
        feePayer: hotWallet.publicKey,
        recipient: hotWallet.publicKey,
        user: coldWallet.publicKey,
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

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [hotWallet, coldWallet],
      { commitment: "processed" }
    );

    // ── Verify policy was created correctly ─────────────────────────────
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );

    expect(policy.userPayment).toEqual(userPaymentPDA);
    expect(policy.gateway).toEqual(gatewayPDA);
    expect(policy.status).toEqual({ active: {} });
    expect(policy.policyId).toBe(composablePolicyId);

    // Recipient defaults to fee_payer (gateway signer = hotWallet)
    expect(policy.recipient).toEqual(hotWallet.publicKey);

    // Forward config — disabled (programId = default), no data checks
    expect(policy.forwardConfig.instructionConstraint.programId).toEqual(
      PublicKey.default
    );
    expect(policy.forwardConfig.inputMint).toEqual(USDC_MINT);
    expect(policy.forwardConfig.instructionConstraint.numDataChecks).toBe(0);

    // Validation config — pre-validation is Lighthouse (ProgramCall),
    // post-validation is disabled. Pinned arity lives on the pre
    // ValidationPda (ADR-0016).
    expect(policy.preValidation).toEqual({
      programCall: { programId: LIGHTHOUSE_PUBKEY },
    });
    expect(policy.postValidation).toEqual({ disabled: {} });

    // PayAsYouGo policy
    expect(policy.policyType.payAsYouGo.maxAmountPerPeriod.toNumber()).toBe(
      100_000_000
    );
    expect(policy.policyType.payAsYouGo.maxChunkAmount.toNumber()).toBe(
      50_000_000
    );
    expect(policy.policyType.payAsYouGo.currentPeriodTotal.toNumber()).toBe(0);

    // Verify pre ValidationPDA was created with correct assertion data. Decode
    // via the SDK's parseValidationPda (mirrors the on-chain typed
    // ValidationPda layout), rather than hand-rolled offsets — the struct
    // gained bump / num_pinned_accounts / pinned_accounts[2] fields, so the
    // legacy readUInt16LE(8) / slice(10, ...) reads the wrong bytes.
    const valPdaAccount = await connection.getAccountInfo(preValidationPDA);
    expect(valPdaAccount).not.toBeNull();
    const parsed = parseValidationPda(valPdaAccount!.data);
    expect(parsed.numPinnedAccounts).toBe(guard.numAccounts);
    expect(parsed.dataLen).toBe(guard.data.length);
    expect(Buffer.from(parsed.data)).toEqual(guard.data);
  });

  test("Execute topup — succeeds (hotWallet below threshold)", async () => {
    await sdk.updateWallet(coldWallet);

    // Pre-execution balance check
    const hotBalanceBefore = await connection.getTokenAccountBalance(
      hotWalletUsdcAta
    );
    expect(hotBalanceBefore.value.uiAmount).toBe(40);

    // Forward is disabled (target_program = default), so instruction_data
    // is unused — the program skips both byte-range validation and the
    // forward CPI. Pass an empty buffer.
    const instructionData = Buffer.alloc(0);

    // Derive intermediate ATA (owned by the ComposablePolicy PDA — not the
    // UserPayment PDA; this decouples intermediate authority from the
    // user-source delegate).
    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true, // allowOwnerOffCurve (PDA)
      TOKEN_PROGRAM_ID
    );
    const intermediateOutputTokenAccount = intermediateInputTokenAccount;

    // remaining_accounts (ADR-0016): ValidationPda was pulled out of the
    // slice — it's now a named account on the instruction. The slice is
    // `[...lighthouseTargets, ...forwardAccounts]` only. Here: just the
    // hotWallet USDC ATA (the account Lighthouse reads). No forward
    // accounts are required (forward disabled).
    const remainingAccounts = [
      { pubkey: hotWalletUsdcAta, isSigner: false, isWritable: false },
    ];

    const accounts = {
      feePayer: coldWallet.publicKey,
      paymentsDelegate: paymentsDelegatePDA,
      composablePolicy: composablePolicyPDA,
      userPayment: userPaymentPDA,
      gateway: gatewayPDA,
      config: configPDA,
      preValidationProgram: LIGHTHOUSE_PUBKEY,
      postValidationProgram: SystemProgram.programId,
      preValidationPda: preValidationPDA,
      postValidationPda: postValidationPDA,
      userTokenAccount: coldWalletUsdcAta,
      mint: USDC_MINT,
      outputMint: USDC_MINT,
      intermediateInputTokenAccount: intermediateInputTokenAccount,
      intermediateOutputTokenAccount: intermediateOutputTokenAccount,
      recipientTokenAccount: hotWalletUsdcAta,
      gatewayFeeAccount: feeRecipientUsdcAta,
      protocolFeeAccount: adminUsdcAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
    const ix = await program.methods
      .executeComposable(instructionData, new anchor.BN(50_000_000))
      .accountsStrict(accounts)
      .remainingAccounts(remainingAccounts)
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [coldWallet],
      { commitment: "processed" }
    );

    // ── Fee calculation (ADR-0017 carve-out model) ─────────────────────
    // totalFee = pull * gatewayFeeBps / 10000; protocolCut = totalFee * protocolShareBps / 10000.
    // gatewayFeeBps is 0 here → totalFee = 0 → no carve-out flows at all.
    const config = await program.account.programConfig.fetch(configPDA);
    const protocolShareBps = config.protocolShareBps;
    const gateway = await program.account.paymentGateway.fetch(gatewayPDA);
    const gatewayFeeBps = gateway.gatewayFeeBps;

    const inputAmount = 50_000_000;
    const totalFee = Math.floor((inputAmount * gatewayFeeBps) / 10000);
    const protocolFee = Math.floor((totalFee * protocolShareBps) / 10000);
    const netInput = inputAmount - totalFee;
    const expectedHotWalletBalance = 40_000_000 + netInput;

    // ── Verify balances ────────────────────────────────────────────────
    const hotBalanceAfter = await connection.getTokenAccountBalance(
      hotWalletUsdcAta
    );
    expect(Number(hotBalanceAfter.value.amount)).toBe(expectedHotWalletBalance);

    const coldBalanceAfter = await connection.getTokenAccountBalance(
      coldWalletUsdcAta
    );
    expect(Number(coldBalanceAfter.value.amount)).toBe(
      1_000_000_000 - inputAmount
    );

    // Protocol fee account should have received the fee
    const adminBalanceAfter = await connection.getTokenAccountBalance(
      adminUsdcAta
    );
    expect(Number(adminBalanceAfter.value.amount)).toBe(protocolFee);

    // Gateway fee = 0, so feeRecipient gets nothing
    const feeRecipientBalance = await connection.getTokenAccountBalance(
      feeRecipientUsdcAta
    );
    expect(Number(feeRecipientBalance.value.amount)).toBe(0);

    // ── Verify policy state ─────────────────────────────────────────────
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.totalInput.toNumber()).toBe(inputAmount);
    expect(policy.totalOutput.toNumber()).toBe(netInput);
    expect(policy.paymentCount).toBe(1);
    expect(policy.policyType.payAsYouGo.currentPeriodTotal.toNumber()).toBe(
      inputAmount
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  //  3. Execute topup again — fails (hotWallet balance now > 50 threshold)
  // ══════════════════════════════════════════════════════════════════════
  test("Execute topup again — fails (hotWallet above threshold)", async () => {
    await sdk.updateWallet(coldWallet);

    // hotWallet should now have ~90 USDC (> 50 USDC threshold)
    const hotBalance = await connection.getTokenAccountBalance(
      hotWalletUsdcAta
    );
    expect(Number(hotBalance.value.amount)).toBeGreaterThan(50_000_000);

    // Forward disabled — instruction_data unused (empty).
    const instructionData = Buffer.alloc(0);

    // Derive intermediate ATA (same as first execution — owned by
    // ComposablePolicy PDA).
    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );
    const intermediateOutputTokenAccount = intermediateInputTokenAccount;

    // Validation only — no forward accounts (forward disabled).
    // ValidationPda is a named account now; remaining_accounts is the
    // bare target slice.
    const remainingAccounts = [
      { pubkey: hotWalletUsdcAta, isSigner: false, isWritable: false },
    ];

    try {
      const ix = await program.methods
        .executeComposable(instructionData, new anchor.BN(50_000_000))
        .accountsStrict({
          feePayer: coldWallet.publicKey,
          paymentsDelegate: paymentsDelegatePDA,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationProgram: LIGHTHOUSE_PUBKEY,
          postValidationProgram: SystemProgram.programId,
          preValidationPda: preValidationPDA,
          postValidationPda: postValidationPDA,
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: USDC_MINT,
          intermediateInputTokenAccount: intermediateInputTokenAccount,
          intermediateOutputTokenAccount: intermediateOutputTokenAccount,
          recipientTokenAccount: hotWalletUsdcAta,
          gatewayFeeAccount: feeRecipientUsdcAta,
          protocolFeeAccount: adminUsdcAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [coldWallet],
        { commitment: "processed" }
      );

      assert(false, "Expected Lighthouse validation to fail");
    } catch (error: any) {
      // Lighthouse assertion fails because hotWallet balance (89.5 USDC)
      // is NOT less than 50 USDC.
      expect(error).toBeDefined();

      // either hex or decimal form — RPC providers serialize it differently.
      expect(error.message).toMatch(/0x1771|custom program error.*6001/);
    }

    // ── Verify policy state unchanged (transaction reverted) ────────────
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.paymentCount).toBe(1);
    expect(policy.policyType.payAsYouGo.currentPeriodTotal.toNumber()).toBe(
      50_000_000
    );
  });
});
