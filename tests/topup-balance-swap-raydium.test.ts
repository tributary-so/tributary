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
  buildComposableExecutionPayload,
  encodeMemo,
  type ComposablePolicy,
  type ForwardBuilder,
} from "../packages/sdk/src";
import { createRaydiumClmmSwapWhenBalanceLow } from "../packages/forward-builders/src";
import { USDC_MINT } from "./surfpool-helpers";
import { setupTopupSwapEnv, type TopupSwapEnv } from "./helpers/topup-swap-env";
import { sendV0WithAlt } from "./helpers/v0-alt";
import {
  RAYDIUM_CLMM_PUBKEY,
  RAYDIUM_CLMM_USDC_WSOL_POOL,
  LIGHTHOUSE_PUBKEY,
  loadClmmPoolAmmConfig,
} from "./constants";

// ── Test constants ────────────────────────────────────────────────────
const SWAP_INPUT_AMOUNT = 50_000_000; // 50 USDC
const FORWARD_SLIPPAGE_BPS = 100;

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

jest.setTimeout(300_000);

describe("Composable Topup-Swap Flow — Raydium CLMM (USDC → WSOL)", () => {
  let env: TopupSwapEnv;
  let program: anchor.Program<Tributary>;

  let composablePolicyPDA: PublicKey;
  let preValidationPDA: PublicKey;
  let postValidationPDA: PublicKey;
  let composablePolicyId: number;
  let forwardBuilder: ForwardBuilder;

  let clmmPool: PublicKey;
  let clmmAmmConfig: PublicKey;

  beforeAll(async () => {
    env = await setupTopupSwapEnv();
    program = env.program;

    clmmPool = RAYDIUM_CLMM_USDC_WSOL_POOL;

    const clmmProgram =
      await env.connection.getAccountInfo(RAYDIUM_CLMM_PUBKEY);
    expect(clmmProgram).not.toBeNull();
    expect(clmmProgram!.executable).toBe(true);

    const BPF_LOADER_UPGRADEABLE = new PublicKey(
      "BPFLoaderUpgradeab1e11111111111111111111111",
    );
    const [clmmProgramData] = PublicKey.findProgramAddressSync(
      [RAYDIUM_CLMM_PUBKEY.toBuffer()],
      BPF_LOADER_UPGRADEABLE,
    );
    const programDataAcct =
      await env.connection.getAccountInfo(clmmProgramData);
    expect(programDataAcct).not.toBeNull();

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
      program.programId,
    ).address;
    preValidationPDA = getPreValidationPda(
      composablePolicyPDA,
      program.programId,
    ).address;
    postValidationPDA = getPostValidationPda(
      composablePolicyPDA,
      program.programId,
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

    // createRaydiumClmmSwapWhenBalanceLow composes all three tiers: tier-1
    // forward config + builder, tier-2 recipientOutputBalanceCheck (the
    // "balance low" pre-swap trigger), tier-3 composablePolicyRecipe
    // enforcement.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const recipe = createRaydiumClmmSwapWhenBalanceLow({
      policyType,
      memo: "Topup WSOL clmm",
      recipient: env.wallets.hotWallet.publicKey,
      inputMint: USDC_MINT,
      outputMint: NATIVE_MINT,
      pool: clmmPool,
      ammConfig: clmmAmmConfig,
      slippageBps: FORWARD_SLIPPAGE_BPS,
      threshold: 1_000_000_000,
      op: "<",
    });
    warnSpy.mockRestore();
    ({ forwardBuilder } = recipe);

    const ix = await program.methods
      .createComposablePolicy(
        recipe.create.policyType,
        encodeMemo(recipe.create.memo, 32),
        recipe.create.forwardConfig,
        recipe.create.preValidation,
        recipe.create.preValidationInit,
        recipe.create.postValidation,
        recipe.create.postValidationInit,
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
      { commitment: "processed" },
    );

    const policy =
      await program.account.composablePolicy.fetch(composablePolicyPDA);
    expect(policy.forwardConfig.instructionConstraint.programId).toEqual(
      RAYDIUM_CLMM_PUBKEY,
    );
    expect(policy.forwardConfig.inputMint).toEqual(USDC_MINT);
    expect(policy.forwardConfig.outputMint).toEqual(NATIVE_MINT);
    expect(policy.forwardConfig.instructionConstraint.numDataChecks).toBe(1);
    expect(policy.forwardConfig.instructionConstraint.numPinnedAccounts).toBe(
      2,
    );
    expect(policy.recipient).toEqual(env.wallets.hotWallet.publicKey);
    expect(policy.status).toEqual({ active: {} });
  });

  test("Execute swap topup — succeeds (coldWallet USDC → hotWallet WSOL)", async () => {
    await env.sdk.updateWallet(new anchor.Wallet(env.wallets.coldWallet));

    const coldUsdcBefore = Number(
      (await env.connection.getTokenAccountBalance(env.atas.coldWalletUsdc))
        .value.amount,
    );
    const hotWsolBefore = Number(
      (await env.connection.getTokenAccountBalance(env.atas.hotWalletWsol))
        .value.amount,
    );
    const adminUsdcBefore = Number(
      (await env.connection.getTokenAccountBalance(env.atas.adminUsdc)).value
        .amount,
    );
    const feeRecipientUsdcBefore = Number(
      (await env.connection.getTokenAccountBalance(env.atas.feeRecipientUsdc))
        .value.amount,
    );

    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID,
    );
    const intermediateOutputTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID,
    );

    const face = new BN(SWAP_INPUT_AMOUNT);
    const policy = (await program.account.composablePolicy.fetch(
      composablePolicyPDA,
    )) as unknown as ComposablePolicy;

    const { instructionData, remainingAccounts } =
      await buildComposableExecutionPayload({
        connection: env.connection,
        policy,
        composablePolicyPda: composablePolicyPDA,
        programId: program.programId,
        forwardBuilder,
        face,
      });

    const ix = await program.methods
      .executeComposable(instructionData, face)
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
    // legacy 1232-byte limit is exceeded.
    await sendV0WithAlt(env.connection, [ix], [env.wallets.coldWallet]);

    // ── Verify balances ──────────────────────────────────────────────
    const coldUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.coldWalletUsdc,
    );
    expect(Number(coldUsdcAfter.value.amount)).toBe(
      coldUsdcBefore - SWAP_INPUT_AMOUNT,
    );

    const hotWsolAfter = await env.connection.getTokenAccountBalance(
      env.atas.hotWalletWsol,
    );
    expect(Number(hotWsolAfter.value.amount)).toBeGreaterThan(hotWsolBefore);

    const config = await program.account.programConfig.fetch(env.pdas.config);
    expect(config.protocolShareBps).toBeGreaterThan(0);
    const adminUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.adminUsdc,
    );
    expect(Number(adminUsdcAfter.value.amount)).toBeGreaterThanOrEqual(
      adminUsdcBefore,
    );

    const feeRecipientUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.feeRecipientUsdc,
    );
    expect(Number(feeRecipientUsdcAfter.value.amount)).toBeGreaterThanOrEqual(
      feeRecipientUsdcBefore,
    );

    // ── Verify policy state ───────────────────────────────────────────
    const policyAfter =
      await program.account.composablePolicy.fetch(composablePolicyPDA);
    expect(policyAfter.totalInput.toNumber()).toBe(SWAP_INPUT_AMOUNT);
    expect(policyAfter.totalOutput.toNumber()).toBeGreaterThan(0);
    expect(policyAfter.paymentCount).toBe(1);
    expect(
      policyAfter.policyType.payAsYouGo.currentPeriodTotal.toNumber(),
    ).toBe(SWAP_INPUT_AMOUNT);
  });

  test("Execute swap topup again — fails (PayAsYouGo period cap exhausted)", async () => {
    await env.sdk.updateWallet(new anchor.Wallet(env.wallets.coldWallet));

    const face = new BN(SWAP_INPUT_AMOUNT);
    const policy = (await program.account.composablePolicy.fetch(
      composablePolicyPDA,
    )) as unknown as ComposablePolicy;

    const { instructionData, remainingAccounts } =
      await buildComposableExecutionPayload({
        connection: env.connection,
        policy,
        composablePolicyPda: composablePolicyPDA,
        programId: program.programId,
        forwardBuilder,
        face,
      });

    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID,
    );
    const intermediateOutputTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID,
    );

    try {
      const ix = await program.methods
        .executeComposable(instructionData, face)
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
    const policyAfter =
      await program.account.composablePolicy.fetch(composablePolicyPDA);
    expect(policyAfter.paymentCount).toBe(1);
    expect(
      policyAfter.policyType.payAsYouGo.currentPeriodTotal.toNumber(),
    ).toBe(SWAP_INPUT_AMOUNT);
  });
});
