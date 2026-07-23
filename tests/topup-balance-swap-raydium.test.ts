import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import { Tributary } from "../target/types/tributary";
import {
  getComposablePolicyPda,
  getPreValidationPda,
  getPostValidationPda,
} from "../packages/sdk/src/pda";
import {
  lighthouse,
  resolveValidationTargets,
  assembleComposableRemainingAccounts,
  type ComposablePolicy,
} from "../packages/sdk/src";
import {
  createRaydiumClmmForward,
  raydiumClmmForwardConfig,
} from "../packages/forward-builders/src";
import { USDC_MINT } from "./surfpool-helpers";
import {
  DISABLED_SPEC,
  DISABLED_INIT,
  programCallSpec,
  validationInit,
} from "./helpers/composable";
import { setupTopupSwapEnv, type TopupSwapEnv } from "./helpers/topup-swap-env";
import { sendV0WithAlt } from "./helpers/v0-alt";
import {
  RAYDIUM_CLMM_PUBKEY,
  RAYDIUM_CLMM_USDC_WSOL_POOL,
  LIGHTHOUSE_PUBKEY,
  loadClmmPoolAmmConfig,
} from "./constants";

// ── Test constants ────────────────────────────────────────────────────
// Topup chunk pulled from coldWallet (USDC, 6 decimals) → swapped to WSOL.
const SWAP_INPUT_AMOUNT = 50_000_000; // 50 USDC
const FORWARD_SLIPPAGE_BPS = 100;

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

jest.setTimeout(300_000);

describe("Composable Topup-Swap Flow — Raydium CLMM (USDC → WSOL)", () => {
  let env: TopupSwapEnv;
  let program: anchor.Program<Tributary>;

  let composablePolicyPDA: PublicKey;
  let preValidationPDA: PublicKey;
  let postValidationPDA: PublicKey;
  let composablePolicyId: number;

  let clmmPool: PublicKey;
  let clmmAmmConfig: PublicKey;

  beforeAll(async () => {
    env = await setupTopupSwapEnv();
    program = env.program;

    clmmPool = RAYDIUM_CLMM_USDC_WSOL_POOL;

    // Warmup: CLMM program + ProgramData (surfpool CPI cache).
    const clmmProgram = await env.connection.getAccountInfo(
      RAYDIUM_CLMM_PUBKEY
    );
    expect(clmmProgram).not.toBeNull();
    expect(clmmProgram!.executable).toBe(true);

    const BPF_LOADER_UPGRADEABLE = new PublicKey(
      "BPFLoaderUpgradeab1e11111111111111111111111"
    );
    const [clmmProgramData] = PublicKey.findProgramAddressSync(
      [RAYDIUM_CLMM_PUBKEY.toBuffer()],
      BPF_LOADER_UPGRADEABLE
    );
    const programDataAcct = await env.connection.getAccountInfo(
      clmmProgramData
    );
    expect(programDataAcct).not.toBeNull();

    // Warmup: pool + ammConfig.
    const poolAcct = await env.connection.getAccountInfo(clmmPool);
    expect(poolAcct).not.toBeNull();
    expect(poolAcct!.owner.equals(RAYDIUM_CLMM_PUBKEY)).toBe(true);

    clmmAmmConfig = await loadClmmPoolAmmConfig(env.connection, clmmPool);

    const configAcct = await env.connection.getAccountInfo(clmmAmmConfig);
    expect(configAcct).not.toBeNull();
    expect(configAcct!.owner.equals(RAYDIUM_CLMM_PUBKEY)).toBe(true);
  });

  test("Create composable swap policy — CLMM forward USDC→WSOL + Lighthouse", async () => {
    await env.sdk.updateWallet(new anchor.Wallet(env.wallets.coldWallet));

    const userPayment = await env.sdk.getUserPayment(env.pdas.userPayment);
    composablePolicyId = (userPayment!.createdComposableCount ?? 0) + 1;
    composablePolicyPDA = getComposablePolicyPda(
      env.pdas.userPayment,
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

    const policyType = {
      payAsYouGo: {
        maxAmountPerPeriod: new BN(SWAP_INPUT_AMOUNT),
        maxChunkAmount: new BN(SWAP_INPUT_AMOUNT),
        periodLengthSeconds: new BN(30 * 24 * 3600),
        currentPeriodStart: new BN(now),
        currentPeriodTotal: new BN(0),
        expiryDate: null,
        padding: new Array(79).fill(0),
      },
    };

    const memo = new Array(32).fill(0);
    Buffer.from("Topup WSOL clmm").copy(Buffer.from(memo));

    const forwardConfig = raydiumClmmForwardConfig({
      inputMint: USDC_MINT,
      outputMint: NATIVE_MINT,
      pool: clmmPool,
      ammConfig: clmmAmmConfig,
    });

    // Lighthouse: assert hotWallet WSOL balance < 1 WSOL before topping up.
    const guard = lighthouse
      .tokenAccount(env.atas.hotWalletWsol)
      .amount(1_000_000_000, "<")
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
        feePayer: env.wallets.hotWallet.publicKey,
        recipient: env.wallets.hotWallet.publicKey,
        user: env.wallets.coldWallet.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: env.pdas.userPayment,
        gateway: env.pdas.gateway,
        config: env.pdas.config,
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
      env.connection,
      new Transaction().add(ix),
      [env.wallets.hotWallet, env.wallets.coldWallet],
      { commitment: "processed" }
    );

    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.forwardConfig.instructionConstraint.programId).toEqual(
      RAYDIUM_CLMM_PUBKEY
    );
    expect(policy.forwardConfig.inputMint).toEqual(USDC_MINT);
    expect(policy.forwardConfig.outputMint).toEqual(NATIVE_MINT);
    expect(policy.forwardConfig.instructionConstraint.numDataChecks).toBe(1);
    expect(policy.forwardConfig.instructionConstraint.numPinnedAccounts).toBe(
      2
    );
    expect(policy.recipient).toEqual(env.wallets.hotWallet.publicKey);
    expect(policy.status).toEqual({ active: {} });
  });

  test("Execute swap topup — succeeds (coldWallet USDC → hotWallet WSOL)", async () => {
    await env.sdk.updateWallet(new anchor.Wallet(env.wallets.coldWallet));

    // Snapshot balances before execute — tests run consecutively against the
    // same surfpool instance, so starting balances can't be assumed.
    const coldUsdcBefore = Number(
      (await env.connection.getTokenAccountBalance(env.atas.coldWalletUsdc))
        .value.amount
    );
    const hotWsolBefore = Number(
      (await env.connection.getTokenAccountBalance(env.atas.hotWalletWsol))
        .value.amount
    );
    const adminUsdcBefore = Number(
      (await env.connection.getTokenAccountBalance(env.atas.adminUsdc)).value
        .amount
    );
    const feeRecipientUsdcBefore = Number(
      (await env.connection.getTokenAccountBalance(env.atas.feeRecipientUsdc))
        .value.amount
    );

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

    const face = new BN(SWAP_INPUT_AMOUNT);
    const policy = (await program.account.composablePolicy.fetch(
      composablePolicyPDA
    )) as unknown as ComposablePolicy;

    const forwardPayload = await createRaydiumClmmForward({
      pool: clmmPool,
      ammConfig: clmmAmmConfig,
      slippageBps: FORWARD_SLIPPAGE_BPS,
    }).build({
      connection: env.connection,
      policy,
      composablePolicyPda: composablePolicyPDA,
      face,
    });

    const [preTargets, postTargets] = await Promise.all([
      resolveValidationTargets(
        env.connection,
        composablePolicyPDA,
        policy.preValidation,
        program.programId,
        "pre"
      ),
      resolveValidationTargets(
        env.connection,
        composablePolicyPDA,
        policy.postValidation,
        program.programId,
        "post"
      ),
    ]);

    const remainingAccounts = assembleComposableRemainingAccounts({
      preTargets,
      forwardAccounts: forwardPayload.forwardAccounts,
      postTargets,
    });

    const ix = await program.methods
      .executeComposable(forwardPayload.instructionData, face)
      .accountsStrict({
        feePayer: env.wallets.coldWallet.publicKey,
        paymentsDelegate: env.pdas.paymentsDelegate,
        composablePolicy: composablePolicyPDA,
        userPayment: env.pdas.userPayment,
        gateway: env.pdas.gateway,
        config: env.pdas.config,
        preValidationProgram: LIGHTHOUSE_PUBKEY,
        postValidationProgram: SystemProgram.programId,
        forwardProgram: RAYDIUM_CLMM_PUBKEY,
        preValidationPda: preValidationPDA,
        postValidationPda: postValidationPDA,
        userTokenAccount: env.atas.coldWalletUsdc,
        mint: USDC_MINT,
        outputMint: NATIVE_MINT,
        intermediateInputTokenAccount,
        intermediateOutputTokenAccount,
        recipientTokenAccount: env.atas.hotWalletWsol,
        gatewayFeeAccount: env.atas.feeRecipientUsdc,
        protocolFeeAccount: env.atas.adminUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    // v0 + ALT: CLMM tickSpacing=1 generates enough tick arrays that the
    // legacy 1232-byte limit is exceeded. ALT compresses accounts to 1-byte
    // indices.
    await sendV0WithAlt(env.connection, [ix], [env.wallets.coldWallet]);

    // ── Verify balances ──────────────────────────────────────────────
    const coldUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.coldWalletUsdc
    );
    expect(Number(coldUsdcAfter.value.amount)).toBe(
      coldUsdcBefore - SWAP_INPUT_AMOUNT
    );

    const hotWsolAfter = await env.connection.getTokenAccountBalance(
      env.atas.hotWalletWsol
    );
    expect(Number(hotWsolAfter.value.amount)).toBeGreaterThan(hotWsolBefore);

    const config = await program.account.programConfig.fetch(env.pdas.config);
    expect(config.protocolShareBps).toBeGreaterThan(0);
    const adminUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.adminUsdc
    );
    expect(Number(adminUsdcAfter.value.amount)).toBeGreaterThanOrEqual(
      adminUsdcBefore
    );

    const feeRecipientUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.feeRecipientUsdc
    );
    expect(Number(feeRecipientUsdcAfter.value.amount)).toBeGreaterThanOrEqual(
      feeRecipientUsdcBefore
    );

    // ── Verify policy state ───────────────────────────────────────────
    const policyAfter = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policyAfter.totalInput.toNumber()).toBe(SWAP_INPUT_AMOUNT);
    expect(policyAfter.totalOutput.toNumber()).toBeGreaterThan(0);
    expect(policyAfter.paymentCount).toBe(1);
    expect(
      policyAfter.policyType.payAsYouGo.currentPeriodTotal.toNumber()
    ).toBe(SWAP_INPUT_AMOUNT);
  });

  test("Execute swap topup again — fails (PayAsYouGo period cap exhausted)", async () => {
    await env.sdk.updateWallet(new anchor.Wallet(env.wallets.coldWallet));

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

    const face = new BN(SWAP_INPUT_AMOUNT);
    const policy = (await program.account.composablePolicy.fetch(
      composablePolicyPDA
    )) as unknown as ComposablePolicy;

    const forwardPayload = await createRaydiumClmmForward({
      pool: clmmPool,
      ammConfig: clmmAmmConfig,
      slippageBps: FORWARD_SLIPPAGE_BPS,
    }).build({
      connection: env.connection,
      policy,
      composablePolicyPda: composablePolicyPDA,
      face,
    });

    const [preTargets, postTargets] = await Promise.all([
      resolveValidationTargets(
        env.connection,
        composablePolicyPDA,
        policy.preValidation,
        program.programId,
        "pre"
      ),
      resolveValidationTargets(
        env.connection,
        composablePolicyPDA,
        policy.postValidation,
        program.programId,
        "post"
      ),
    ]);
    const remainingAccounts = assembleComposableRemainingAccounts({
      preTargets,
      forwardAccounts: forwardPayload.forwardAccounts,
      postTargets,
    });

    try {
      const ix = await program.methods
        .executeComposable(forwardPayload.instructionData, face)
        .accountsStrict({
          feePayer: env.wallets.coldWallet.publicKey,
          paymentsDelegate: env.pdas.paymentsDelegate,
          composablePolicy: composablePolicyPDA,
          userPayment: env.pdas.userPayment,
          gateway: env.pdas.gateway,
          config: env.pdas.config,
          preValidationProgram: LIGHTHOUSE_PUBKEY,
          postValidationProgram: SystemProgram.programId,
          forwardProgram: RAYDIUM_CLMM_PUBKEY,
          preValidationPda: preValidationPDA,
          postValidationPda: postValidationPDA,
          userTokenAccount: env.atas.coldWalletUsdc,
          mint: USDC_MINT,
          outputMint: NATIVE_MINT,
          intermediateInputTokenAccount,
          intermediateOutputTokenAccount,
          recipientTokenAccount: env.atas.hotWalletWsol,
          gatewayFeeAccount: env.atas.feeRecipientUsdc,
          protocolFeeAccount: env.atas.adminUsdc,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      await sendV0WithAlt(env.connection, [ix], [env.wallets.coldWallet]);

      expect(true).toBe(false); // should not reach here
    } catch (error: any) {
      expect(error).toBeDefined();
      // Period cap exhausted → InsufficientDelegatedAmount (0x1775 / 6005).
      expect(error.message).toMatch(/0x1775|6005|custom program error/);
    }

    // Policy state unchanged (transaction reverted).
    const policyAfter = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policyAfter.paymentCount).toBe(1);
    expect(
      policyAfter.policyType.payAsYouGo.currentPeriodTotal.toNumber()
    ).toBe(SWAP_INPUT_AMOUNT);
  });
});
