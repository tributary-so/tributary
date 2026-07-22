/**
 * Shared surfpool/wallet/gateway/user-payment setup for the topup-swap
 * integration tests (Meteora DLMM + Raydium CPMM).
 *
 * Both topup-balance-swap*.test.ts suites need the same ~250 lines of
 * surfpool warmup, keypair funding, ATA creation, config mocking, gateway
 * creation, and user-payment creation — none of it depends on the forward
 * program. Extracting it here keeps the two test files focused on the
 * forward-builder wiring (ADR-0030) and is the difference between a
 * 700-line duplicated suite and a 200-line DEX-specific one.
 *
 * Mirrors the setup phase of `apps/scheduler/src/composable.ts` — the
 * env returned here is what the scheduler has after its rescan + gateway
 * discovery, minus the policy-watch plumbing (which is per-test).
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Tributary } from "../../target/types/tributary";
import { Tributary as TributarySDK } from "../../packages/sdk/src";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getPaymentsDelegatePda,
} from "../../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "../surfpool-helpers";
import { ADMIN_KEYPAIR } from "./composable";
import { LIGHTHOUSE_PUBKEY } from "../constants";

export interface TopupSwapWallets {
  admin: Keypair;
  feeRecipient: Keypair;
  gatewayAuthority: Keypair;
  /** Recipient + below-threshold holder (receives WSOL via forward). */
  hotWallet: Keypair;
  /** Funding source (debited USDC via delegate). */
  coldWallet: Keypair;
}

export interface TopupSwapPdas {
  config: PublicKey;
  gateway: PublicKey;
  userPayment: PublicKey;
  paymentsDelegate: PublicKey;
}

export interface TopupSwapAtas {
  coldWalletUsdc: PublicKey;
  hotWalletWsol: PublicKey;
  feeRecipientUsdc: PublicKey;
  adminUsdc: PublicKey;
}

/**
 * Fully-resolved topup-swap env after {@link setupTopupSwapEnv}.
 *
 * The test file owns `composablePolicyPda` / `preValidationPda` /
 * `postValidationPda` (derived per-test from `userPayment`'s
 * `createdComposableCount`).
 */
export interface TopupSwapEnv {
  program: anchor.Program<Tributary>;
  sdk: TributarySDK;
  connection: anchor.web3.Connection;
  surfpool: SurfpoolHelper;
  wallets: TopupSwapWallets;
  pdas: TopupSwapPdas;
  atas: TopupSwapAtas;
}

/**
 * Bootstrap a topup-swap integration-test env against surfpool.
 *
 * Does (in order):
 *  1. Surfpool guard + `getMultipleAccountsInfo` fanout workaround
 *     (surfpool returns -32601 for it; @meteora-ag/dlmm uses it).
 *  2. SOL-fund every keypair.
 *  3. Warm Lighthouse (validation CPI target) from mainnet fork.
 *  4. Derive gateway / userPayment / paymentsDelegate PDAs.
 *  5. Create input-side USDC ATAs (coldWallet, feeRecipient, admin) +
 *     output-side WSOL ATA (hotWallet).
 *  6. Fund tokens: hotWallet 0.4 WSOL, coldWallet 1000 USDC with delegate
 *     on userPayment PDA, feeRecipient/admin USDC = 0 (exist for fee skim).
 *  7. Mock admin into ProgramConfig.
 *  8. Create gateway (0 bps fee, 0 scheduler share — simplifies math).
 *  9. Create coldWallet's UserPayment for USDC.
 *
 * Idempotent across re-runs against the same surfpool instance — ATA
 * creation swallows "already exists" and the config mock is a raw write.
 */
export async function setupTopupSwapEnv(): Promise<TopupSwapEnv> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  const surfpool = new SurfpoolHelper(connection);
  const isSurfpool = await surfpool.isSurfpool();
  if (!isSurfpool) {
    throw new Error(
      "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
    );
  }

  // ── surfpool RPC workaround ───────────────────────────────────────
  // surfpool returns "Method not found" (-32601) for getMultipleAccountsInfo
  // — which @meteora-ag/dlmm uses for DLMM.create + getBinArrayForSwap.
  // getAccountInfo works, so fan out. Test-only (see isSurfpool guard).
  const connShim = connection as unknown as {
    getMultipleAccountsInfo: (
      keys: PublicKey[],
      opts?: unknown
    ) => Promise<{ data: Buffer | null }[] | null[]>;
  };
  connShim.getMultipleAccountsInfo = (keys, opts) =>
    Promise.all(
      keys.map((k) => connection.getAccountInfo(k, opts as never))
    ) as Promise<{ data: Buffer | null }[] | null[]>;

  // ── Keypairs ──────────────────────────────────────────────────────
  const wallets: TopupSwapWallets = {
    admin: Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR)),
    feeRecipient: Keypair.generate(),
    gatewayAuthority: Keypair.generate(),
    hotWallet: Keypair.generate(),
    coldWallet: Keypair.generate(),
  };

  // ── Fund SOL (everyone needs rent + fee payer) ────────────────────
  await Promise.all([
    surfpool.setAccount({
      publicKey: wallets.hotWallet.publicKey,
      lamports: 10_000_000_000,
    }),
    surfpool.setAccount({
      publicKey: wallets.coldWallet.publicKey,
      lamports: 10_000_000_000,
    }),
    surfpool.setAccount({
      publicKey: wallets.feeRecipient.publicKey,
      lamports: 1_000_000_000,
    }),
    surfpool.setAccount({
      publicKey: wallets.admin.publicKey,
      lamports: 1_000_000_000,
    }),
    surfpool.setAccount({
      publicKey: wallets.gatewayAuthority.publicKey,
      lamports: 1_000_000_000,
    }),
    surfpool.setAccount({
      publicKey: wallet.publicKey,
      lamports: 1_000_000_000,
    }),
  ]);

  const sdk = new TributarySDK(connection, wallet.payer);

  // ── Warm Lighthouse from mainnet fork (validation CPI target) ─────
  const lighthouseProgram = await sdk.connection.getAccountInfo(
    LIGHTHOUSE_PUBKEY
  );
  if (lighthouseProgram === null) {
    throw new Error("Lighthouse program not found on fork");
  }

  // ── Derive PDAs ───────────────────────────────────────────────────
  const pdas: TopupSwapPdas = {
    config: getConfigPda(program.programId).address,
    gateway: getGatewayPda(
      wallets.gatewayAuthority.publicKey,
      program.programId
    ).address,
    userPayment: getUserPaymentPda(
      wallets.coldWallet.publicKey,
      USDC_MINT,
      program.programId
    ).address,
    paymentsDelegate: getPaymentsDelegatePda(program.programId).address,
  };

  // ── Derive ATAs ───────────────────────────────────────────────────
  const atas: TopupSwapAtas = {
    coldWalletUsdc: getAssociatedTokenAddressSync(
      USDC_MINT,
      wallets.coldWallet.publicKey
    ),
    hotWalletWsol: getAssociatedTokenAddressSync(
      NATIVE_MINT,
      wallets.hotWallet.publicKey
    ),
    feeRecipientUsdc: getAssociatedTokenAddressSync(
      USDC_MINT,
      wallets.feeRecipient.publicKey
    ),
    adminUsdc: getAssociatedTokenAddressSync(
      USDC_MINT,
      wallets.admin.publicKey
    ),
  };

  // ── Create ATAs (input USDC for coldWallet + fee accounts; output
  //    WSOL for recipient). Fee accounts are input-side post-ADR-0026.
  const ataTx = new Transaction();
  ataTx.add(
    createAssociatedTokenAccountInstruction(
      wallets.admin.publicKey,
      atas.coldWalletUsdc,
      wallets.coldWallet.publicKey,
      USDC_MINT
    )
  );
  ataTx.add(
    createAssociatedTokenAccountInstruction(
      wallets.admin.publicKey,
      atas.feeRecipientUsdc,
      wallets.feeRecipient.publicKey,
      USDC_MINT
    )
  );
  ataTx.add(
    createAssociatedTokenAccountInstruction(
      wallets.admin.publicKey,
      atas.adminUsdc,
      wallets.admin.publicKey,
      USDC_MINT
    )
  );
  ataTx.add(
    createAssociatedTokenAccountInstruction(
      wallets.admin.publicKey,
      atas.hotWalletWsol,
      wallets.hotWallet.publicKey,
      NATIVE_MINT
    )
  );
  try {
    await sendAndConfirmTransaction(connection, ataTx, [wallets.admin], {
      commitment: "processed",
    });
  } catch {
    // ATAs already exist
  }

  // ── Fund tokens ───────────────────────────────────────────────────
  // hotWallet: 0.4 WSOL (below the 1 WSOL Lighthouse threshold)
  await surfpool.setTokenAccount({
    owner: wallets.hotWallet.publicKey,
    mint: NATIVE_MINT,
    amount: 400_000_000,
  });
  // coldWallet: 1000 USDC funding source, delegate → UserPayment PDA
  await surfpool.setTokenAccount({
    owner: wallets.coldWallet.publicKey,
    mint: USDC_MINT,
    amount: 1_000_000_000,
    delegate: pdas.userPayment,
    delegatedAmount: 1_000_000_000,
  });
  // feeRecipient / admin USDC ATAs: empty (must exist for input-side
  // fee skim — ADR-0026).
  await surfpool.setTokenAccount({
    owner: wallets.feeRecipient.publicKey,
    mint: USDC_MINT,
    amount: 0,
  });
  await surfpool.setTokenAccount({
    owner: wallets.admin.publicKey,
    mint: USDC_MINT,
    amount: 0,
  });

  // ── Mock admin into global config ─────────────────────────────────
  const configAccount = await sdk.getProgramConfig(pdas.config);
  configAccount.admin = wallets.admin.publicKey;
  configAccount.feeRecipient = wallets.admin.publicKey;
  const serialized = await program.coder.accounts.encode(
    "programConfig",
    configAccount
  );
  await surfpool.setAccount({
    publicKey: pdas.config,
    data: serialized.toString("hex"),
  });

  // ── Create gateway (0 bps gateway fee, 0 scheduler share) ─────────
  await sdk.updateWallet(new anchor.Wallet(wallets.admin));
  const gatewayIx = await sdk.createPaymentGateway(
    wallets.gatewayAuthority.publicKey,
    0, // gatewayFeeBps — simplifies math
    0, // schedulerShareBps — no scheduler cut in this test
    wallets.feeRecipient.publicKey,
    "Gateway",
    "https://tributary.so"
  );
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(gatewayIx),
    [wallets.admin],
    { commitment: "processed" }
  );

  // ── Create coldWallet's UserPayment for USDC ──────────────────────
  await sdk.updateWallet(new anchor.Wallet(wallets.coldWallet));
  const createUserPaymentIx = await sdk.createUserPayment(USDC_MINT);
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(createUserPaymentIx),
    [wallets.coldWallet],
    { commitment: "processed" }
  );

  return { program, sdk, connection, surfpool, wallets, pdas, atas };
}
