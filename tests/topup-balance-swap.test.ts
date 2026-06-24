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
import { Tributary as TributarySDK } from "../packages/sdk/src";
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

// Topup chunk pulled from coldWallet (USDC, 6 decimals) → swapped to WSOL.
const SWAP_INPUT_AMOUNT = 50_000_000; // 50 USDC

// ── Lighthouse assertion builder ─────────────────────────────────────────
// Layout (12 bytes):
//   [0]    discriminator = 9 (AssertTokenAccount)
//   [1]    logLevel = 0 (Silent)
//   [2]    assertion variant = 2 (TokenAccountAssertion::Amount)
//   [3-10] amount as u64 LE
//   [11]   operator (3 = LessThan)
function buildLighthouseTokenAccountAmountAssertion(
  amount: number,
  operator: number
): Buffer {
  const buf = Buffer.alloc(12);
  buf.writeUInt8(9, 0);
  buf.writeUInt8(0, 1);
  buf.writeUInt8(2, 2);
  buf.writeBigUInt64LE(BigInt(amount), 3);
  buf.writeUInt8(operator, 11);
  return buf;
}

const OP_LESS_THAN = 3;

// DLMM state is lazy-forked from mainnet through surfpool, which makes pool
// loading + bin-array fetches slow. Give the suite ample room.
jest.setTimeout(300_000);

describe("Composable Topup-Swap Flow (USDC → WSOL via Meteora DLMM)", () => {
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
  let validationPDA: PublicKey;

  // Input side (USDC)
  let coldWalletUsdcAta: PublicKey;
  // Output side (WSOL) — recipient + fee accounts must be output-mint ATAs
  let hotWalletWsolAta: PublicKey;
  let feeRecipientWsolAta: PublicKey;
  let adminWsolAta: PublicKey;

  let composablePolicyId: number;

  // DLMM pool + swap ix, built once the ComposablePolicy PDA is known.
  // The swap `user` = ComposablePolicy PDA (owner of both intermediates);
  // run_forward_cpi promotes it to signer via invoke_signed.
  let dlmmPool: DLMM;
  let binArraysPubkey: PublicKey[];
  let swapMinOutAmount: anchor.BN;
  let swapIx: TransactionInstruction;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);

    const isSurfpool = await surfpool.isSurfpool();
    if (!isSurfpool) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    // ── Work around surfpool RPC gaps ──────────────────────────────────
    // surfpool returns "Method not found" (-32601) for getMultipleAccountsInfo
    // — which @meteora-ag/dlmm uses for DLMM.create + getBinArrayForSwap.
    // getAccountInfo works, so fan getMultipleAccountsInfo out to it.
    // (This test is surfpool-only — see the isSurfpool guard above.)
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
    // Lighthouse + the DLMM program/pool/bin-arrays must be present so the
    // validation + forward CPIs resolve. Reading them forces surfpool to
    // lazy-fetch from mainnet.
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
    hotWalletWsolAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      hotWallet.publicKey
    );
    feeRecipientWsolAta = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      feeRecipient.publicKey
    );
    adminWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, admin.publicKey);

    // Create ATAs (input USDC for coldWallet; output WSOL for recipient/fees)
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
        hotWalletWsolAta,
        hotWallet.publicKey,
        NATIVE_MINT
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
    // hotWallet: 0.4 WSOL (below the 1 WSOL Lighthouse threshold)
    await surfpool.setTokenAccount({
      owner: hotWallet.publicKey,
      mint: NATIVE_MINT,
      amount: 400_000_000, // 0.4 WSOL
    });

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
    // skipSolWrappingOperation: pool.swap() otherwise appends a WSOL unwrap
    // post-instruction; we only want the raw swap ix (intermediates are WSOL
    // token accounts, not native SOL, and Tributary creates them itself).
    dlmmPool = await DLMM.create(connection, METEORA_DLMM_SOL_USDC_POOL, {
      cluster: "mainnet-beta",
      skipSolWrappingOperation: true,
    });

    // swapForY = true ⟹ in-token is X (sell X, buy Y). We sell USDC.
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

  test("Create composable swap policy — DLMM forward USDC→WSOL + Lighthouse", async () => {
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

    // Build the DLMM swap ix now (user = ComposablePolicy PDA, which owns the
    // two intermediates). We reuse it at execute time; here we only need its
    // 8-byte discriminator to pin via data_checks. pool.swap() may prepend
    // idempotent ATA-create / SOL-wrap instructions — we keep ONLY the swap
    // instruction (programId == DLMM).
    swapIx = await buildSwapIx(composablePolicyPDA);
    const discriminator = Array.from(swapIx.data.slice(0, 8));

    const now = Math.floor(Date.now() / 1000);

    // PayAsYouGo: period cap == one chunk, so a second execute in the same
    // period is rejected by validate_policy_execution (deterministic failure
    // case below, independent of swap output price).
    const policyType = {
      payAsYouGo: {
        maxAmountPerPeriod: new anchor.BN(SWAP_INPUT_AMOUNT), // 50 USDC
        maxChunkAmount: new anchor.BN(SWAP_INPUT_AMOUNT), // 50 USDC
        periodLengthSeconds: new anchor.BN(30 * 24 * 3600),
        currentPeriodStart: new anchor.BN(now),
        currentPeriodTotal: new anchor.BN(0),
        padding: new Array(88).fill(0),
      },
    };

    const memo = new Array(64).fill(0);
    Buffer.from("Topup WSOL swap").copy(Buffer.from(memo));

    const forwardConfig = {
      targetProgram: METEORA_DLMM_PUBKEY,
      inputMint: USDC_MINT,
      outputMint: NATIVE_MINT,
      minOutputAmount: null, // disabled — slippage handled inside the swap ix
      forwardFlags: 0,
      numDataChecks: 1,
      dataChecks: [
        { offset: 0, length: 8, expected: discriminator }, // pin swap selector
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
      ],
    };

    // Lighthouse: assert hotWallet WSOL balance < 1 WSOL before topping up.
    const validationData = buildLighthouseTokenAccountAmountAssertion(
      1_000_000_000, // 1 WSOL threshold
      OP_LESS_THAN
    );

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        1, // numValidationAccounts (hotWallet WSOL ATA)
        validationData
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
    expect(policy.forwardConfig.numDataChecks).toBe(1);
    expect(policy.recipient).toEqual(hotWallet.publicKey);
    expect(policy.status).toEqual({ active: {} });
  });

  test("Execute swap topup — succeeds (coldWallet USDC → hotWallet WSOL)", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    const hotWsolBefore = await connection.getTokenAccountBalance(
      hotWalletWsolAta
    );
    expect(Number(hotWsolBefore.value.amount)).toBe(400_000_000);

    // Two distinct intermediates (input_mint != output_mint), both owned by
    // the ComposablePolicy PDA. The swap draws USDC from the input ATA and
    // sends WSOL to the output ATA; fees + sweep then move WSOL to recipient.
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

    // Forward remaining_accounts = swap ix keys in SDK order (writability
    // preserved). The DLMM program is already included in swapIx.keys
    // (Meteora lists its own program id in the swap accounts); run_forward_cpi
    // keeps the target program in the AccountMeta list so the self-listed
    // slot stays aligned. isSigner is re-derived by build_forward_account_metas
    // (only the ComposablePolicy PDA becomes signer), so false here is fine.
    swapIx = await buildSwapIx(composablePolicyPDA);
    const forwardAccounts = swapIx.keys.map((k) => ({
      pubkey: k.pubkey,
      isSigner: false,
      // Mark all forward accounts writable. The DLMM program mutates several
      // accounts the dlmm-sdk@0.7.7 IDL marks read-only (e.g.
      // bin_array_bitmap_extension, oracle); the runtime permits marking an
      // account writable even if the callee never writes it, so this is safe
      // and sidesteps the stale-IDL mutability mismatch.
      isWritable: true,
    }));

    const remainingAccounts = [
      // validation: [ValidationPDA, hotWallet WSOL ATA]
      { pubkey: validationPDA, isSigner: false, isWritable: false },
      { pubkey: hotWalletWsolAta, isSigner: false, isWritable: false },
      // forward: DLMM swap accounts (see above)
      ...forwardAccounts,
    ];

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
        userTokenAccount: coldWalletUsdcAta,
        mint: USDC_MINT,
        outputMint: NATIVE_MINT,
        intermediateInputTokenAccount,
        intermediateOutputTokenAccount,
        recipientTokenAccount: hotWalletWsolAta,
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

    // hotWallet WSOL: increased by the swept output (swap out − fees).
    const hotWsolAfter = await connection.getTokenAccountBalance(
      hotWalletWsolAta
    );
    expect(Number(hotWsolAfter.value.amount)).toBeGreaterThan(400_000_000);

    // Protocol fee (100 bps default) is taken in the OUTPUT mint (WSOL).
    const config = await program.account.programConfig.fetch(configPDA);
    if (config.protocolFeeBps > 0) {
      const adminWsolAfter = await connection.getTokenAccountBalance(
        adminWsolAta
      );
      expect(Number(adminWsolAfter.value.amount)).toBeGreaterThan(0);
    }

    // Gateway fee = 0 bps → feeRecipient WSOL unchanged.
    const feeRecipientWsolAfter = await connection.getTokenAccountBalance(
      feeRecipientWsolAta
    );
    expect(Number(feeRecipientWsolAfter.value.amount)).toBe(0);

    // ── Verify policy state ─────────────────────────────────────────────
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.totalInput.toNumber()).toBe(SWAP_INPUT_AMOUNT);
    expect(policy.totalOutput.toNumber()).toBeGreaterThan(0);
    expect(policy.paymentCount).toBe(1);
    expect(policy.policyType.payAsYouGo.currentPeriodTotal.toNumber()).toBe(
      SWAP_INPUT_AMOUNT
    );
  });

  test("Execute swap topup again — fails (PayAsYouGo period cap exhausted)", async () => {
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
      // Mark all forward accounts writable. The DLMM program mutates several
      // accounts the dlmm-sdk@0.7.7 IDL marks read-only (e.g.
      // bin_array_bitmap_extension, oracle); the runtime permits marking an
      // account writable even if the callee never writes it, so this is safe
      // and sidesteps the stale-IDL mutability mismatch.
      isWritable: true,
    }));
    const remainingAccounts = [
      { pubkey: validationPDA, isSigner: false, isWritable: false },
      { pubkey: hotWalletWsolAta, isSigner: false, isWritable: false },
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
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: NATIVE_MINT,
          intermediateInputTokenAccount,
          intermediateOutputTokenAccount,
          recipientTokenAccount: hotWalletWsolAta,
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
      // PayAsYouGo period cap (== SWAP_INPUT_AMOUNT) is already exhausted.
      // This runs BEFORE the Lighthouse CPI, so the failure is deterministic
      // and independent of the swap output price.
      expect(error).toBeDefined();

      // Insufficient delegated amount 0x1777 (=6007)
      // InsufficientDelegatedAmount. Match the code in either hex or decimal
      // form — RPC providers serialize it differently.
      expect(error.message).toMatch(/0x1777|custom program error.*6007/);
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
   * Build the DLMM swap instruction (USDC → WSOL) via the documented
   * `pool.swap()` API, with `user` = ComposablePolicy PDA (owner of both
   * intermediates; run_forward_cpi promotes it to signer via invoke_signed).
   *
   * `skipSolWrappingOperation` (set at DLMM.create) prevents pool.swap() from
   * appending a WSOL wrap/unwrap — we only want the raw swap ix. pool.swap()
   * returns a Transaction (CU-estimation ix + idempotent ATA-create + the
   * swap ix); we keep ONLY the swap instruction.
   *
   * hostFeeIn fix: the SDK passes hostFeeIn: null → Anchor serializes that as
   * the System Program id. The on-chain DLMM swap rejects a System-Program-
   * owned host_fee_in (AccountOwnedByWrongProgram); Meteora's own CLI/tests
   * use the DLMM program id itself as the "no host fee" placeholder, so we
   * rewrite that one account meta.
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
    // Rewrite hostFeeIn (System Program → DLMM program id). For this pool it's
    // the only System Program account meta in the swap ix.
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
