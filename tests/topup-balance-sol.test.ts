import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import DLMM from "@meteora-ag/dlmm";
import { Tributary } from "../target/types/tributary";
import { Tributary as TributarySDK, lighthouse } from "../packages/sdk/src";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getComposablePolicyPda,
  getValidationPda,
  getPaymentsDelegatePda,
} from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import {
  METEORA_DLMM_PUBKEY,
  METEORA_DLMM_SOL_USDC_POOL,
  LIGHTHOUSE_PUBKEY,
} from "./constants";

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

// Topup chunk pulled from coldWallet (USDC, 6 decimals) → swapped to WSOL,
// then unwrapped to native SOL via NATIVE_OUTPUT forward flag.
const SWAP_INPUT_AMOUNT = 50_000_000; // 50 USDC

// NATIVE_OUTPUT forward flag bit 0 — see
// programs/tributary/src/constants.rs::FORWARD_FLAG_NATIVE_OUTPUT.
const FORWARD_FLAG_NATIVE_OUTPUT = 1;

// Lighthouse topup trigger: only fire when hotWallet native SOL (lamports)
// is below this. hotWallet is funded with 10 SOL at setup, so the threshold
// sits above that to make the `<` assertion hold. NATIVE_OUTPUT sweep mutates
// this balance, so this is the correct sensor (not a WSOL ATA).
const SOL_TOPUP_THRESHOLD = 20_000_000_000; // 20 SOL

// DLMM state is lazy-forked from mainnet through surfpool, which makes pool
// loading + bin-array fetches slow. Give the suite ample room.
jest.setTimeout(300_000);

describe("Composable Topup-SOL Flow (USDC → WSOL → native SOL via NATIVE_OUTPUT)", () => {
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

  // hotWallet is the recipient — in NATIVE_OUTPUT mode it receives the
  // WSOL value as native SOL via closeAccount. The Lighthouse guard asserts
  // on its native SOL (lamports) balance directly.
  const hotWallet = Keypair.generate();
  const coldWallet = Keypair.generate();

  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let paymentsDelegatePDA: PublicKey;
  let composablePolicyPDA: PublicKey;
  let validationPDA: PublicKey;

  // Input side (USDC)
  let coldWalletUsdcAta: PublicKey;
  // Output side (WSOL) — fee accounts stay WSOL (taken BEFORE the close).
  let feeRecipientWsolAta: PublicKey;
  let adminWsolAta: PublicKey;

  let composablePolicyId: number;

  // DLMM pool + swap ix, built once the ComposablePolicy PDA is known.
  let dlmmPool: DLMM;
  let binArraysPubkey: PublicKey[];
  let swapMinOutAmount: anchor.BN;
  let swapIx: TransactionInstruction;

  // Captured at execute time: the WSOL value swept to the recipient as
  // native SOL (= output_amount − fees). Used by the post-execute assertion.
  let expectedSweepLamports: bigint;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);

    const isSurfpool = await surfpool.isSurfpool();
    if (!isSurfpool) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    // ── Work around surfpool RPC gaps (see topup-balance-swap.test.ts) ──
    const conn = connection as unknown as {
      getMultipleAccountsInfo: (
        keys: PublicKey[],
        opts?: unknown
      ) => Promise<{ data: Buffer | null }[] | null[]>;
    };
    conn.getMultipleAccountsInfo = (keys, opts) =>
      Promise.all(
        keys.map((k) => connection.getAccountInfo(k, opts as never))
      ) as Promise<{ data: Buffer | null }[] | null[]>;

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

    sdk = new TributarySDK(connection, wallet.payer);

    // ── Warm surfpool with mainnet-fork state ──────────────────────────
    const lighthouseProgram = await sdk.connection.getAccountInfo(
      LIGHTHOUSE_PUBKEY
    );
    expect(lighthouseProgram).not.toBeNull();

    const dlmmProgram = await connection.getAccountInfo(METEORA_DLMM_PUBKEY);
    expect(dlmmProgram).not.toBeNull();
    expect(dlmmProgram!.executable).toBe(true);

    const poolAccount = await connection.getAccountInfo(
      METEORA_DLMM_SOL_USDC_POOL
    );
    expect(poolAccount).not.toBeNull();
    expect(poolAccount!.owner.equals(METEORA_DLMM_PUBKEY)).toBe(true);

    // ── Derive PDAs ────────────────────────────────────────────────────
    gatewayPDA = getGatewayPda(
      gatewayAuthority.publicKey,
      program.programId
    ).address;
    paymentsDelegatePDA = getPaymentsDelegatePda(program.programId).address;
    userPaymentPDA = getUserPaymentPda(
      coldWallet.publicKey,
      USDC_MINT,
      program.programId
    ).address;

    // ── Derive token accounts ──────────────────────────────────────────
    coldWalletUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      coldWallet.publicKey
    );
    feeRecipientWsolAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      feeRecipient.publicKey
    );
    adminWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, admin.publicKey);

    // Create ATAs (input USDC for coldWallet; output WSOL fee accounts).
    // hotWallet needs no ATA — NATIVE_OUTPUT sweeps SOL into its system
    // wallet, and the Lighthouse guard reads lamports off that wallet.
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
        feeRecipientWsolAta,
        feeRecipient.publicKey,
        NATIVE_MINT
      )
    );
    ataTx.add(
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        adminWsolAta,
        admin.publicKey,
        NATIVE_MINT
      )
    );
    try {
      await sendAndConfirmTransaction(connection, ataTx, [admin], {
        commitment: "processed",
      });
    } catch {
      // ATAs already exist
    }

    // ── Fund tokens ────────────────────────────────────────────────────
    // coldWallet: 1000 USDC (funding source), delegate → UserPayment PDA
    await surfpool.setTokenAccount({
      owner: coldWallet.publicKey,
      mint: USDC_MINT,
      amount: 1_000_000_000, // 1000 USDC
      delegate: userPaymentPDA,
      delegatedAmount: 1_000_000_000,
    });

    // feeRecipient / admin WSOL ATAs: empty (must exist for fee sweep)
    await surfpool.setTokenAccount({
      owner: feeRecipient.publicKey,
      mint: NATIVE_MINT,
      amount: 0,
    });
    await surfpool.setTokenAccount({
      owner: admin.publicKey,
      mint: NATIVE_MINT,
      amount: 0,
    });

    // ── Mock admin into global config ──────────────────────────────────
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

    // ── Load DLMM pool + bin arrays (documented API) ───────────────────
    dlmmPool = await DLMM.create(connection, METEORA_DLMM_SOL_USDC_POOL, {
      cluster: "mainnet-beta",
      skipSolWrappingOperation: true,
    });

    const swapForY = USDC_MINT.equals(dlmmPool.tokenX.publicKey);
    const binArrays = await dlmmPool.getBinArrayForSwap(swapForY);
    const quote = dlmmPool.swapQuote(
      new anchor.BN(SWAP_INPUT_AMOUNT),
      swapForY,
      new anchor.BN(100), // 1% slippage
      binArrays
    );
    binArraysPubkey = quote.binArraysPubkey as PublicKey[];
    swapMinOutAmount = quote.minOutAmount;
  });

  test("create gateway", async () => {
    await sdk.updateWallet(new anchor.Wallet(admin));

    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      0, // 0 bps gateway fee — simplifies math
      0, // schedulerShareBps — no scheduler cut in this test
      feeRecipient.publicKey,
      "Gateway",
      "https://tributary.so"
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(gatewayIx),
      [admin],
      { commitment: "processed" }
    );

    const gatewayAccount = await sdk.getPaymentGateway(gatewayPDA);
    expect(gatewayAccount!.authority).toEqual(gatewayAuthority.publicKey);
    expect(gatewayAccount!.feeRecipient).toEqual(feeRecipient.publicKey);
    expect(gatewayAccount!.gatewayFeeBps).toBe(0);
    expect(gatewayAccount!.isActive).toBe(true);
  });

  test("create coldWallet payment for USDC mint", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    const createUserPaymentIx = await sdk.createUserPayment(USDC_MINT);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createUserPaymentIx),
      [coldWallet],
      { commitment: "processed" }
    );

    const userPayment = await sdk.getUserPayment(userPaymentPDA);
    expect(userPayment).not.toBeNull();
    expect(userPayment!.owner).toEqual(coldWallet.publicKey);
    expect(userPayment!.tokenMint).toEqual(USDC_MINT);
    expect(userPayment!.isActive).toBe(true);
  });

  test("Create composable NATIVE_OUTPUT policy — DLMM USDC→WSOL + Lighthouse, sweep unwraps WSOL→SOL", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    const userPayment = await sdk.getUserPayment(userPaymentPDA);
    composablePolicyId = (userPayment!.createdComposableCount ?? 0) + 1;
    composablePolicyPDA = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    ).address;
    validationPDA = getValidationPda(
      composablePolicyPDA,
      program.programId
    ).address;

    // Build the DLMM swap ix (user = ComposablePolicy PDA, owner of both
    // intermediates). Reused at execute time; here we only need its 8-byte
    // discriminator to pin via data_checks.
    swapIx = await buildSwapIx(composablePolicyPDA);
    const discriminator = Array.from(swapIx.data.slice(0, 8));

    const now = Math.floor(Date.now() / 1000);

    // PayAsYouGo: period cap == one chunk → second execute in the same
    // period is rejected (deterministic failure case below).
    const policyType = {
      payAsYouGo: {
        maxAmountPerPeriod: new anchor.BN(SWAP_INPUT_AMOUNT),
        maxChunkAmount: new anchor.BN(SWAP_INPUT_AMOUNT),
        periodLengthSeconds: new anchor.BN(30 * 24 * 3600),
        currentPeriodStart: new anchor.BN(now),
        currentPeriodTotal: new anchor.BN(0),
        padding: new Array(88).fill(0),
      },
    };

    const memo = new Array(32).fill(0);
    Buffer.from("Topup native SOL").copy(Buffer.from(memo));

    // NATIVE_OUTPUT: bit 0 set. outputMint MUST be NATIVE_MINT (WSOL),
    // enforced at create-time. The execute-side sweep then closeAccounts
    // the WSOL intermediate into hotWallet.publicKey (recipient system
    // wallet), shipping the WSOL value as native SOL.
    const forwardConfig = {
      targetProgram: METEORA_DLMM_PUBKEY,
      inputMint: USDC_MINT,
      outputMint: NATIVE_MINT,
      minOutputAmount: null, // disabled — slippage handled inside the swap ix
      forwardFlags: FORWARD_FLAG_NATIVE_OUTPUT,
      numDataChecks: 1,
      dataChecks: [
        { offset: 0, length: 8, expected: discriminator }, // pin swap selector
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
      ],
    };

    // Lighthouse: assert hotWallet native SOL (lamports) is below the
    // topup threshold. NATIVE_OUTPUT sweep mutates this balance, so the
    // system wallet is the correct sensor (not a WSOL ATA).
    const guard = lighthouse
      .accountInfo(hotWallet.publicKey)
      .lamports(SOL_TOPUP_THRESHOLD, "<")
      .build();

    // Pinned target accounts (ADR-0016): the lighthouse facade owns the
    // target_account(s). Normalise to the fixed-size [Pubkey; 2].
    const pinnedAccounts: [PublicKey, PublicKey] = [
      guard.accounts[0]?.pubkey ?? PublicKey.default,
      guard.accounts[1]?.pubkey ?? PublicKey.default,
    ];
    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        guard.numAccounts,
        pinnedAccounts,
        guard.data
      )
      .accountsStrict({
        feePayer: hotWallet.publicKey,
        recipient: hotWallet.publicKey,
        user: coldWallet.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPDA,
        validationProgram: LIGHTHOUSE_PUBKEY,
        inputMint: USDC_MINT,
        outputMint: NATIVE_MINT,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [hotWallet, coldWallet],
      { commitment: "processed" }
    );

    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.forwardConfig.targetProgram).toEqual(METEORA_DLMM_PUBKEY);
    expect(policy.forwardConfig.inputMint).toEqual(USDC_MINT);
    expect(policy.forwardConfig.outputMint).toEqual(NATIVE_MINT);
    expect(policy.forwardConfig.forwardFlags).toBe(FORWARD_FLAG_NATIVE_OUTPUT);
    expect(policy.forwardConfig.numDataChecks).toBe(1);
    expect(policy.recipient).toEqual(hotWallet.publicKey);
    expect(policy.status).toEqual({ active: {} });
  });

  test("Execute NATIVE_OUTPUT topup — succeeds (coldWallet USDC → hotWallet native SOL)", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    const hotSolBefore = await connection.getBalance(hotWallet.publicKey);

    // Two intermediates (input USDC, output WSOL), both owned by the
    // ComposablePolicy PDA. The swap draws USDC from input, sends WSOL to
    // output; fees sweep WSOL to fee ATAs; the WSOL intermediate is then
    // closed into hotWallet.publicKey, shipping its value as native SOL.
    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );
    const intermediateOutputTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    swapIx = await buildSwapIx(composablePolicyPDA);
    const forwardAccounts = swapIx.keys.map((k) => ({
      pubkey: k.pubkey,
      isSigner: false,
      // Mark all forward accounts writable — DLMM mutates several accounts
      // the dlmm-sdk IDL marks read-only; the runtime permits the upgrade.
      isWritable: true,
    }));

    // ADR-0016: ValidationPda is a named account; remaining_accounts is
    // the bare [target, ...forward] slice.
    const remainingAccounts = [
      // validation target: hotWallet system wallet (SOL sensor)
      { pubkey: hotWallet.publicKey, isSigner: false, isWritable: false },
      // forward: DLMM swap accounts
      ...forwardAccounts,
    ];

    // recipientTokenAccount = hotWallet.publicKey (SYSTEM WALLET, not a
    // WSOL ATA). In NATIVE_OUTPUT mode the handler validates this equals
    // composable_policy.recipient. closeAccount ships the WSOL value here
    // as native SOL.
    const ix = await program.methods
      .executeComposable(swapIx.data, new anchor.BN(SWAP_INPUT_AMOUNT))
      .accountsStrict({
        feePayer: coldWallet.publicKey,
        paymentsDelegate: paymentsDelegatePDA,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationProgram: LIGHTHOUSE_PUBKEY,
        validationPda: validationPDA,
        userTokenAccount: coldWalletUsdcAta,
        mint: USDC_MINT,
        outputMint: NATIVE_MINT,
        intermediateInputTokenAccount,
        intermediateOutputTokenAccount,
        recipientTokenAccount: hotWallet.publicKey,
        gatewayFeeAccount: feeRecipientWsolAta,
        protocolFeeAccount: adminWsolAta,
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

    // ── Verify balances ────────────────────────────────────────────────
    // coldWallet USDC: reduced by exactly the pull amount (no fee on input).
    const coldUsdcAfter = await connection.getTokenAccountBalance(
      coldWalletUsdcAta
    );
    expect(Number(coldUsdcAfter.value.amount)).toBe(
      1_000_000_000 - SWAP_INPUT_AMOUNT
    );

    // hotWallet native SOL: increased by the swept WSOL value. closeAccount
    // also ships rent, so the delta is >= sweep_amount (bean open-decision
    // (2): total_output excludes rent, the test asserts >= sweep_amount).
    const hotSolAfter = await connection.getBalance(hotWallet.publicKey);
    expect(hotSolAfter).toBeGreaterThan(hotSolBefore);

    // Protocol fee is a carve-out of the gateway fee (ADR-0017). With
    // gatewayFeeBps = 0, no total fee is generated → protocol receives
    // nothing despite protocolShareBps > 0. Account is a fresh ATA (0).
    const config = await program.account.programConfig.fetch(configPDA);
    expect(config.protocolShareBps).toBeGreaterThan(0);
    const adminWsolAfter = await connection.getTokenAccountBalance(
      adminWsolAta
    );
    expect(Number(adminWsolAfter.value.amount)).toBe(0);

    // Gateway fee = 0 bps → feeRecipient WSOL unchanged.
    const feeRecipientWsolAfter = await connection.getTokenAccountBalance(
      feeRecipientWsolAta
    );
    expect(Number(feeRecipientWsolAfter.value.amount)).toBe(0);

    // ── Verify the WSOL intermediate was closed by the sweep ──────────
    // closeAccount zeroes the account; the rent went to the recipient
    // along with the WSOL value. The account may be GC'd (null) or zeroed.
    const intermediateOutputInfo = await connection.getAccountInfo(
      intermediateOutputTokenAccount
    );
    expect(
      intermediateOutputInfo === null ||
        intermediateOutputInfo.lamports === 0 ||
        intermediateOutputInfo.data.length === 0
    ).toBe(true);

    // ── Verify policy state ─────────────────────────────────────────────
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.totalInput.toNumber()).toBe(SWAP_INPUT_AMOUNT);
    // total_output == sweep_amount (excludes rent — bean open-decision (2)).
    expect(policy.totalOutput.toNumber()).toBeGreaterThan(0);
    expectedSweepLamports = BigInt(policy.totalOutput.toNumber());
    expect(policy.paymentCount).toBe(1);
    expect(policy.policyType.payAsYouGo.currentPeriodTotal.toNumber()).toBe(
      SWAP_INPUT_AMOUNT
    );

    // Sanity: SOL delta matches or exceeds the recorded sweep_amount
    // (closeAccount also ships the closed ATA's rent to the recipient).
    const solDelta = BigInt(hotSolAfter - hotSolBefore);
    expect(solDelta).toBeGreaterThanOrEqual(expectedSweepLamports);
  });

  test("Execute NATIVE_OUTPUT topup again — fails (PayAsYouGo period cap exhausted)", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );
    const intermediateOutputTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    swapIx = await buildSwapIx(composablePolicyPDA);
    const forwardAccounts = swapIx.keys.map((k) => ({
      pubkey: k.pubkey,
      isSigner: false,
      isWritable: true,
    }));
    const remainingAccounts = [
      { pubkey: hotWallet.publicKey, isSigner: false, isWritable: false },
      ...forwardAccounts,
    ];

    try {
      const ix = await program.methods
        .executeComposable(swapIx.data, new anchor.BN(SWAP_INPUT_AMOUNT))
        .accountsStrict({
          feePayer: coldWallet.publicKey,
          paymentsDelegate: paymentsDelegatePDA,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          validationProgram: LIGHTHOUSE_PUBKEY,
          validationPda: validationPDA,
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: NATIVE_MINT,
          intermediateInputTokenAccount,
          intermediateOutputTokenAccount,
          recipientTokenAccount: hotWallet.publicKey,
          gatewayFeeAccount: feeRecipientWsolAta,
          protocolFeeAccount: adminWsolAta,
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

      expect(true).toBe(false); // should not reach here
    } catch (error: any) {
      // validate_policy_execution rejects the second chunk because the
      // PayAsYouGo period cap is already exhausted. Runs BEFORE the
      // Lighthouse CPI, so the failure is deterministic.
      expect(error).toBeDefined();
      // InsufficientDelegatedAmount 0x1775 (=6005). RPC providers serialize
      // it differently — match either form.
      expect(error.message).toMatch(/0x1775|custom program error.*6005/);
    }

    // Policy state unchanged (transaction reverted).
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.paymentCount).toBe(1);
    expect(policy.policyType.payAsYouGo.currentPeriodTotal.toNumber()).toBe(
      SWAP_INPUT_AMOUNT
    );
  });

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Build the DLMM swap instruction (USDC → WSOL) via `pool.swap()`, with
   * `user` = ComposablePolicy PDA. Identical to the swap test's helper —
   * NATIVE_OUTPUT only changes the post-swap sweep (program-side). See
   * topup-balance-swap.test.ts::buildSwapIx for the hostFeeIn / CU-estimate
   * workaround rationale.
   */
  async function buildSwapIx(user: PublicKey): Promise<TransactionInstruction> {
    const swapTx = await dlmmPool.swap({
      lbPair: METEORA_DLMM_SOL_USDC_POOL,
      inToken: USDC_MINT,
      outToken: NATIVE_MINT,
      inAmount: new anchor.BN(SWAP_INPUT_AMOUNT),
      minOutAmount: swapMinOutAmount,
      user,
      binArraysPubkey,
    });
    const found = swapTx.instructions.find((i) =>
      i.programId.equals(METEORA_DLMM_PUBKEY)
    );
    if (!found) {
      throw new Error("DLMM swap instruction not found in pool.swap() output");
    }
    // Rewrite hostFeeIn (System Program → DLMM program id) — see swap test.
    const keys = found.keys.map((k) =>
      k.pubkey.equals(SystemProgram.programId)
        ? {
            pubkey: METEORA_DLMM_PUBKEY,
            isSigner: k.isSigner,
            isWritable: k.isWritable,
          }
        : k
    );
    return new TransactionInstruction({
      keys,
      programId: found.programId,
      data: found.data,
    });
  }
});
