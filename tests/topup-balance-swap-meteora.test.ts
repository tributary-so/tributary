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
  createMeteoraDlmmForward,
  meteoraDlmmForwardConfig,
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
  METEORA_DLMM_PUBKEY,
  METEORA_DLMM_SOL_USDC_POOL,
  LIGHTHOUSE_PUBKEY,
} from "./constants";

// ── Test constants ────────────────────────────────────────────────────
// Topup chunk pulled from coldWallet (USDC, 6 decimals) → swapped to WSOL.
const SWAP_INPUT_AMOUNT = 50_000_000; // 50 USDC
// ponytail: pool is pinned on-chain; slippage + host-fee-fix are
// scheduler-side tuning knobs with no per-pair need yet (mirrors
// apps/scheduler/src/composable.ts:42-43).
const FORWARD_SLIPPAGE_BPS = 100;
const FORWARD_APPLY_HOST_FEE_IN_FIX = true;

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// DLMM state is lazy-forked from mainnet through surfpool, which makes pool
// loading + bin-array fetches slow. Give the suite ample room.
jest.setTimeout(300_000);

describe("Composable Topup-Swap Flow — Meteora DLMM (USDC → WSOL)", () => {
  let env: TopupSwapEnv;
  let program: anchor.Program<Tributary>;

  let composablePolicyPDA: PublicKey;
  let preValidationPDA: PublicKey;
  let postValidationPDA: PublicKey;
  let composablePolicyId: number;

  beforeAll(async () => {
    env = await setupTopupSwapEnv();
    program = env.program;

    // ── Meteora-specific warmup ─────────────────────────────────────
    // Force surfpool to lazy-fetch the DLMM program + pool account so the
    // forward CPI resolves. (Bin arrays are fetched lazily by the builder
    // via the fanned-out getMultipleAccountsInfo workaround in the env
    // helper.)
    const dlmmProgram = await env.connection.getAccountInfo(
      METEORA_DLMM_PUBKEY
    );
    expect(dlmmProgram).not.toBeNull();
    expect(dlmmProgram!.executable).toBe(true);

    const poolAccount = await env.connection.getAccountInfo(
      METEORA_DLMM_SOL_USDC_POOL
    );
    expect(poolAccount).not.toBeNull();
    expect(poolAccount!.owner.equals(METEORA_DLMM_PUBKEY)).toBe(true);
  });

  test("Create composable swap policy — DLMM forward USDC→WSOL + Lighthouse", async () => {
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
        maxAmountPerPeriod: new BN(SWAP_INPUT_AMOUNT), // 50 USDC
        maxChunkAmount: new BN(SWAP_INPUT_AMOUNT), // 50 USDC
        periodLengthSeconds: new BN(30 * 24 * 3600),
        currentPeriodStart: new BN(now),
        currentPeriodTotal: new BN(0),
        expiryDate: null,
        padding: new Array(79).fill(0),
      },
    };

    const memo = new Array(32).fill(0);
    Buffer.from("Topup WSOL swap").copy(Buffer.from(memo));

    // Forward ENABLED: Meteora DLMM swap (USDC → WSOL). The constraint is
    // built by the setup-time half of the forward-builder (ADR-0030) so the
    // pinned pool + swap selector cannot drift from what the fire-time
    // builder emits.
    const forwardConfig = meteoraDlmmForwardConfig({
      inputMint: USDC_MINT,
      outputMint: NATIVE_MINT,
      pool: METEORA_DLMM_SOL_USDC_POOL,
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
      METEORA_DLMM_PUBKEY
    );
    expect(policy.forwardConfig.inputMint).toEqual(USDC_MINT);
    expect(policy.forwardConfig.outputMint).toEqual(NATIVE_MINT);
    expect(policy.forwardConfig.instructionConstraint.numDataChecks).toBe(1);
    expect(policy.recipient).toEqual(env.wallets.hotWallet.publicKey);
    expect(policy.status).toEqual({ active: {} });
  });

  test("Execute swap topup — succeeds (coldWallet USDC → hotWallet WSOL)", async () => {
    await env.sdk.updateWallet(new anchor.Wallet(env.wallets.coldWallet));

    const hotWsolBefore = await env.connection.getTokenAccountBalance(
      env.atas.hotWalletWsol
    );
    expect(Number(hotWsolBefore.value.amount)).toBe(400_000_000);

    // Two distinct intermediates (input_mint != output_mint), both owned by
    // the ComposablePolicy PDA. The swap draws USDC from the input ATA and
    // sends WSOL to the output ATA; input-side fees are skimmed from
    // intermediate_input BEFORE the forward (ADR-0026), then the WSOL output
    // is swept to the recipient.
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
    // The ForwardBuilder builds the DLMM swap ix, extracts instructionData +
    // forwardAccounts with per-account isWritable. The scheduler pattern:
    //   resolve face → builder.build() → resolveValidationTargets → assemble
    const face = new BN(SWAP_INPUT_AMOUNT);
    const policy = (await program.account.composablePolicy.fetch(
      composablePolicyPDA
    )) as unknown as ComposablePolicy;

    const forwardPayload = await createMeteoraDlmmForward({
      pool: METEORA_DLMM_SOL_USDC_POOL,
      slippageBps: FORWARD_SLIPPAGE_BPS,
      applyHostFeeInFix: FORWARD_APPLY_HOST_FEE_IN_FIX,
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
    // coldWallet USDC: reduced by exactly the pull amount (no fee on input).
    const coldUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.coldWalletUsdc
    );
    expect(Number(coldUsdcAfter.value.amount)).toBe(
      1_000_000_000 - SWAP_INPUT_AMOUNT
    );

    // hotWallet WSOL: increased by the swept output (swap out − fees).
    const hotWsolAfter = await env.connection.getTokenAccountBalance(
      env.atas.hotWalletWsol
    );
    expect(Number(hotWsolAfter.value.amount)).toBeGreaterThan(400_000_000);

    // Protocol fee is a carve-out of the gateway fee (ADR-0017). With
    // gatewayFeeBps = 0, no total fee is generated → protocol receives
    // nothing despite protocolShareBps > 0. Fees are input-side (ADR-0026).
    const config = await program.account.programConfig.fetch(env.pdas.config);
    expect(config.protocolShareBps).toBeGreaterThan(0);
    const adminUsdcAfter = await env.connection.getTokenAccountBalance(
      env.atas.adminUsdc
    );
    expect(Number(adminUsdcAfter.value.amount)).toBe(0);

    // Gateway fee = 0 bps → feeRecipient USDC unchanged.
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

    // Rebuild forward payload (bin arrays may have shifted since first swap).
    const face = new BN(SWAP_INPUT_AMOUNT);
    const policy = (await program.account.composablePolicy.fetch(
      composablePolicyPDA
    )) as unknown as ComposablePolicy;

    const forwardPayload = await createMeteoraDlmmForward({
      pool: METEORA_DLMM_SOL_USDC_POOL,
      slippageBps: FORWARD_SLIPPAGE_BPS,
      applyHostFeeInFix: FORWARD_APPLY_HOST_FEE_IN_FIX,
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
      // This runs BEFORE the Lighthouse CPI, so the failure is deterministic
      // and independent of the swap output price.
      expect(error).toBeDefined();
      // Insufficient delegated amount — code 0x1775 / 6005 decimal. Match
      // either serialization form (RPC providers differ).
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
