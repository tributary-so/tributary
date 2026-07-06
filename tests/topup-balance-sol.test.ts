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
  getPreValidationPda,
  getPostValidationPda,
  getPaymentsDelegatePda,
} from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import { ADMIN_KEYPAIR } from "./helpers/composable";
import {
  METEORA_DLMM_PUBKEY,
  METEORA_DLMM_SOL_USDC_POOL,
  LIGHTHOUSE_PUBKEY,
} from "./constants";

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

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

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
  let preValidationPDA: PublicKey;
  let postValidationPDA: PublicKey;

  // Input side (USDC) — fee accounts are input-side post-ADR-0026 (skimmed
  // from the gross pull in input_mint BEFORE the forward runs).
  let coldWalletUsdcAta: PublicKey;
  let feeRecipientUsdcAta: PublicKey;
  let adminUsdcAta: PublicKey;

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
    feeRecipientUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      feeRecipient.publicKey
    );
    adminUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, admin.publicKey);

    // Create ATAs: input USDC for coldWallet + fee accounts. hotWallet needs
    // no ATA — NATIVE_OUTPUT sweeps SOL into its system wallet, and the
    // Lighthouse guard reads lamports off that wallet. Fee accounts are
    // input-side (ADR-0026).
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
        feeRecipientUsdcAta,
        feeRecipient.publicKey,
        USDC_MINT
      )
    );
    ataTx.add(
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        adminUsdcAta,
        admin.publicKey,
        USDC_MINT
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

    // feeRecipient / admin USDC ATAs: empty (must exist for input-side fee
    // skim — ADR-0026).
    await surfpool.setTokenAccount({
      owner: feeRecipient.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });
    await surfpool.setTokenAccount({
      owner: admin.publicKey,
      mint: USDC_MINT,
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
    await sdk.updateWallet(admin);

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
    await sdk.updateWallet(coldWallet);

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
        expiryDate: null,
        padding: new Array(79).fill(0),
      },
    };

    const memo = new Array(32).fill(0);
    Buffer.from("Topup native SOL").copy(Buffer.from(memo));

    // NATIVE_OUTPUT: bit 0 set. outputMint MUST be NATIVE_MINT (WSOL),
    // enforced at create-time. The execute-side sweep then closeAccounts
    // the WSOL intermediate into hotWallet.publicKey (recipient system
    // wallet), shipping the WSOL value as native SOL. Forward ENABLED:
    // instructionConstraint pins the swap selector + the first forward
    // account (degenerate-pin guard + execute positional pin-check).
    const forwardConfig = {
      inputMint: USDC_MINT,
      outputMint: NATIVE_MINT,
      forwardFlags: FORWARD_FLAG_NATIVE_OUTPUT,
      instructionConstraint: {
        programId: METEORA_DLMM_PUBKEY,
        numDataChecks: 1,
        dataChecks: [
          { offset: 0, length: 8, expected: discriminator }, // pin swap selector
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
        ],
        numPinnedAccounts: 1,
        pinnedAccounts: [
          swapIx.keys[0].pubkey,
          PublicKey.default,
          PublicKey.default,
          PublicKey.default,
        ],
      },
    };

    // Lighthouse: assert hotWallet native SOL (lamports) is below the
    // topup threshold. NATIVE_OUTPUT sweep mutates this balance, so the
    // system wallet is the correct sensor (not a WSOL ATA).
    const guard = lighthouse
      .accountInfo(hotWallet.publicKey)
      .lamports(SOL_TOPUP_THRESHOLD, "<")
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
    expect(policy.forwardConfig.instructionConstraint.programId).toEqual(
      METEORA_DLMM_PUBKEY
    );
    expect(policy.forwardConfig.inputMint).toEqual(USDC_MINT);
    expect(policy.forwardConfig.outputMint).toEqual(NATIVE_MINT);
    expect(policy.forwardConfig.forwardFlags).toBe(FORWARD_FLAG_NATIVE_OUTPUT);
    expect(policy.forwardConfig.instructionConstraint.numDataChecks).toBe(1);
    expect(policy.recipient).toEqual(hotWallet.publicKey);
    expect(policy.status).toEqual({ active: {} });
  });

  test("Execute NATIVE_OUTPUT topup — succeeds (coldWallet USDC → hotWallet native SOL)", async () => {
    await sdk.updateWallet(coldWallet);

    const hotSolBefore = await connection.getBalance(hotWallet.publicKey);

    // Two intermediates (input USDC, output WSOL), both owned by the
    // ComposablePolicy PDA. The swap draws USDC from input, sends WSOL to
    // output; input-side fees are skimmed from intermediate_input BEFORE
    // the forward (ADR-0026); the WSOL intermediate is then closed into
    // hotWallet.publicKey, shipping its value as native SOL.
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
        preValidationProgram: LIGHTHOUSE_PUBKEY,
        postValidationProgram: SystemProgram.programId,
        preValidationPda: preValidationPDA,
        postValidationPda: postValidationPDA,
        userTokenAccount: coldWalletUsdcAta,
        mint: USDC_MINT,
        outputMint: NATIVE_MINT,
        intermediateInputTokenAccount,
        intermediateOutputTokenAccount,
        recipientTokenAccount: hotWallet.publicKey,
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
    // Fees are input-side (ADR-0026) → assert on the USDC ATA.
    const config = await program.account.programConfig.fetch(configPDA);
    expect(config.protocolShareBps).toBeGreaterThan(0);
    const adminUsdcAfter = await connection.getTokenAccountBalance(
      adminUsdcAta
    );
    expect(Number(adminUsdcAfter.value.amount)).toBe(0);

    // Gateway fee = 0 bps → feeRecipient USDC unchanged.
    const feeRecipientUsdcAfter = await connection.getTokenAccountBalance(
      feeRecipientUsdcAta
    );
    expect(Number(feeRecipientUsdcAfter.value.amount)).toBe(0);

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
    await sdk.updateWallet(coldWallet);

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
          preValidationProgram: LIGHTHOUSE_PUBKEY,
          postValidationProgram: SystemProgram.programId,
          preValidationPda: preValidationPDA,
          postValidationPda: postValidationPDA,
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: NATIVE_MINT,
          intermediateInputTokenAccount,
          intermediateOutputTokenAccount,
          recipientTokenAccount: hotWallet.publicKey,
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
