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
import {
  RAYDIUM_CLMM_PUBKEY,
  RAYDIUM_CLMM_USDC_WSOL_POOL,
  LIGHTHOUSE_PUBKEY,
  loadClmmPoolAmmConfig,
} from "./constants";

// ── Test constants ────────────────────────────────────────────────────
// Topup chunk pulled from coldWallet (USDC, 6 decimals) → swapped to WSOL.
const SWAP_INPUT_AMOUNT = 50_000_000; // 50 USDC
// ponytail: pool + amm_config are pinned on-chain; slippage is a
// scheduler-side knob (matches apps/scheduler/src/composable.ts:42-43).
// CLMM has no host-fee SystemProgram quirk → no applyHostFeeInFix flag.
const FORWARD_SLIPPAGE_BPS = 100;

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// CLMM pool + amm_config + tick-arrays lazy-fork from mainnet via surfpool.
// The builder reads pool state + tick-arrays + runs a simulation, so it's
// heavier than CPMM but matches the Meteora DLMM pattern.
jest.setTimeout(300_000);

describe("Composable Topup-Swap Flow — Raydium CLMM (USDC → WSOL)", () => {
  let env: TopupSwapEnv;
  let program: anchor.Program<Tributary>;

  let composablePolicyPDA: PublicKey;
  let preValidationPDA: PublicKey;
  let postValidationPDA: PublicKey;
  let composablePolicyId: number;

  // Fixed USDC/WSOL CLMM pool (verified on mainnet). The paired amm_config
  // is read on-chain via loadClmmPoolAmmConfig (configId @ offset 9 of the
  // pool_state account — after disc(8) + bump(1)).
  let clmmPool: PublicKey;
  let clmmAmmConfig: PublicKey;

  beforeAll(async () => {
    env = await setupTopupSwapEnv();
    program = env.program;

    // ── Raydium CLMM-specific warmup ──────────────────────────────
    // Force surfpool to lazy-fetch the CLMM program + the fixed pool so
    // the forward CPI resolves. Read amm_config from the pool account.
    clmmPool = RAYDIUM_CLMM_USDC_WSOL_POOL;

    const clmmProgram = await env.connection.getAccountInfo(
      RAYDIUM_CLMM_PUBKEY
    );
    expect(clmmProgram).not.toBeNull();
    expect(clmmProgram!.executable).toBe(true);

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

    // PayAsYouGo: period cap == one chunk, so a second execute in the same
    // period is rejected by validate_policy_execution (deterministic failure
    // case below, independent of swap output price).
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

    // Forward ENABLED: Raydium CLMM swap_v2 (USDC → WSOL). The
    // constraint pins poolId at index 2 + ammConfig at index 1, plus
    // the swap_v2 discriminator at offset 0. Built by the setup-time
    // half of the forward-builder so it cannot drift from what the
    // fire-time builder emits.
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
    // CLMM uses BOTH pin slots: poolId (index 2) + ammConfig (index 1).
    expect(policy.forwardConfig.instructionConstraint.numPinnedAccounts).toBe(
      2
    );
    expect(policy.recipient).toEqual(env.wallets.hotWallet.publicKey);
    expect(policy.status).toEqual({ active: {} });
  });

  test("Execute swap topup — succeeds (coldWallet USDC → hotWallet WSOL)", async () => {
    await env.sdk.updateWallet(new anchor.Wallet(env.wallets.coldWallet));

    const hotWsolBefore = await env.connection.getTokenAccountBalance(
      env.atas.hotWalletWsol
    );
    expect(Number(hotWsolBefore.value.amount)).toBe(400_000_000);

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

    // ── Fire-time forward (mirror apps/scheduler/src/composable.ts:437-487)
    //
    // CLMM build() reads pool state + tick arrays + runs simulation (like
    // the Meteora DLMM builder), so it's RPC-heavier than CPMM.
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

    await sendAndConfirmTransaction(
      env.connection,
      new Transaction().add(ix),
      [env.wallets.coldWallet],
      { commitment: "processed" }
    );

    // ── Verify balances ──────────────────────────────────────────────
    const coldUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.coldWalletUsdc
    );
    expect(Number(coldUsdcAfter.value.amount)).toBe(
      1_000_000_000 - SWAP_INPUT_AMOUNT
    );

    const hotWsolAfter = await env.connection.getTokenAccountBalance(
      env.atas.hotWalletWsol
    );
    expect(Number(hotWsolAfter.value.amount)).toBeGreaterThan(400_000_000);

    const config = await program.account.programConfig.fetch(env.pdas.config);
    expect(config.protocolShareBps).toBeGreaterThan(0);
    const adminUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.adminUsdc
    );
    expect(Number(adminUsdcAfter.value.amount)).toBe(0);

    const feeRecipientUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.feeRecipientUsdc
    );
    expect(Number(feeRecipientUsdcAfter.value.amount)).toBe(0);

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

      await sendAndConfirmTransaction(
        env.connection,
        new Transaction().add(ix),
        [env.wallets.coldWallet],
        { commitment: "processed" }
      );

      expect(true).toBe(false); // should not reach here
    } catch (error: any) {
      // validate_policy_execution rejects the second chunk because the
      // PayAsYouGo period cap (== SWAP_INPUT_AMOUNT) is already exhausted.
      expect(error).toBeDefined();
      // Insufficient delegated amount — code 0x1775 / 6005 decimal.
      expect(error.message).toMatch(/0x1775|custom program error.*6005/);
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
