import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createApproveInstruction,
  createRevokeInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
  getUserPaymentPda,
  getComposablePolicyPda,
} from "@tributary-so/sdk";
import type { TopupFormState } from "@/lib/form";
import {
  getUsdcMint,
  WSOL_MINT,
  METEORA_DLMM_PUBKEY,
  FORWARD_FLAG_NATIVE_OUTPUT,
} from "@/lib/pools";
import { usdcToRaw, solToLamports } from "@/lib/units";
import { buildSwapQuote } from "@/lib/meteora";
import { useCluster } from "@/components/cluster/cluster-data-access";

export interface CreateResult {
  signature: string;
  policyPda: string;
}

type Status = "idle" | "preparing" | "sending" | "success" | "error";

/**
 * Builds + sends the batched composable-policy setup transaction:
 *   1. (optional) createUserPayment(USDC) — when missing
 *   2. (optional) create ATA — when the cold wallet has no USDC account
 *   3. revoke + approve — delegate UserPayment PDA up to the period cap
 *   4. createComposablePolicy — PayAsYouGo + Meteora forward + Lighthouse guard
 *
 * The gateway is selected upstream (GatewaySelect) and must already exist.
 * The discriminator for ForwardConfig.data_checks is read from a dry-run
 * Meteora quote on the chosen pool. No execution happens here — only setup.
 */
export function useCreateTopupPolicy() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { cluster } = useCluster();
  const usdcMint = getUsdcMint(cluster.network);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  const reset = () => {
    setStatus("idle");
    setError(null);
    setResult(null);
  };

  const submit = useCallback(
    async (form: TopupFormState): Promise<CreateResult> => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected.");
      }
      const coldWallet = wallet.publicKey;

      setStatus("preparing");
      setError(null);
      setResult(null);

      try {
        // Bridge the wallet-adapter state into the SDK's IWallet shape.
        const sdk = new Tributary(connection, {
          publicKey: coldWallet,
          signTransaction: wallet.signTransaction as never,
          signAllTransactions: wallet.signAllTransactions as never,
        });

        const hotWallet = new PublicKey(form.hotWallet);
        const chunkRaw = usdcToRaw(form.chunkUsdc);
        const capRaw = usdcToRaw(form.capUsdc);
        const thresholdLamports = solToLamports(form.thresholdSol);

        // ── Gateway (selected upstream; must already exist) ───────────
        if (!form.gateway) throw new Error("Select a payment gateway.");
        const gateway = new PublicKey(form.gateway);
        const ixs: TransactionInstruction[] = [];

        // ── Resolve UserPayment ────────────────────────────────────────
        const userPaymentPda = getUserPaymentPda(
          coldWallet,
          usdcMint,
          sdk.programId
        ).address;
        const userPaymentAccount =
          await sdk.program.account.userPayment.fetchNullable(userPaymentPda);
        if (!userPaymentAccount) {
          ixs.push(await sdk.createUserPayment(usdcMint));
        }

        // ── Resolve cold-wallet USDC ATA ───────────────────────────────
        const coldUsdcAta = getAssociatedTokenAddressSync(usdcMint, coldWallet);
        const ataInfo = await connection.getAccountInfo(coldUsdcAta);
        if (!ataInfo) {
          ixs.push(
            createAssociatedTokenAccountInstruction(
              coldWallet,
              coldUsdcAta,
              coldWallet,
              usdcMint,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        // ── Delegate: revoke any prior, approve UserPayment PDA ────────
        ixs.push(
          createRevokeInstruction(coldUsdcAta, coldWallet, [], TOKEN_PROGRAM_ID)
        );
        ixs.push(
          createApproveInstruction(
            coldUsdcAta,
            userPaymentPda, // delegate = UserPayment PDA
            coldWallet,
            BigInt(capRaw.toString()),
            [],
            TOKEN_PROGRAM_ID
          )
        );

        // ── Meteora swap discriminator (pins ForwardConfig.data_checks) ─
        const poolAddress = new PublicKey(form.poolAddress);
        const quote = await buildSwapQuote(
          connection,
          poolAddress,
          usdcMint,
          WSOL_MINT,
          new BN(chunkRaw.toString()),
          form.slippageBps
        );
        const discriminator = quote.discriminator;

        // ── PayAsYouGo policy type ─────────────────────────────────────
        const now = Math.floor(Date.now() / 1000);
        const policyType = {
          payAsYouGo: {
            maxAmountPerPeriod: new BN(capRaw.toString()),
            maxChunkAmount: new BN(chunkRaw.toString()),
            periodLengthSeconds: new BN(form.periodSeconds),
            currentPeriodStart: new BN(now),
            currentPeriodTotal: new BN(0),
            padding: new Array(88).fill(0),
          },
        };

        const memo = new Array(64).fill(0);
        Buffer.from("Topup SOL").copy(Buffer.from(memo));

        // ── ForwardConfig (Meteora DLMM USDC→WSOL, optional NATIVE_OUTPUT)
        const forwardConfig = {
          targetProgram: METEORA_DLMM_PUBKEY,
          inputMint: usdcMint,
          outputMint: WSOL_MINT, // NATIVE_OUTPUT requires WSOL
          minOutputAmount: null,
          forwardFlags: form.unwrap ? FORWARD_FLAG_NATIVE_OUTPUT : 0,
          numDataChecks: 1,
          dataChecks: [
            { offset: 0, length: 8, expected: discriminator },
            { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
            { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
            { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          ],
        };

        // ── Lighthouse guard: hot-wallet native SOL below threshold ────
        const guard = lighthouse
          .accountInfo(hotWallet)
          .lamports(Number(thresholdLamports), "<")
          .build();

        // ── ComposablePolicy PDA (for the success card) ───────────────
        const createdComposableCount =
          (userPaymentAccount as { createdComposableCount?: number } | null)
            ?.createdComposableCount ?? 0;
        const policyId = createdComposableCount + 1;
        const composablePolicyPda = getComposablePolicyPda(
          userPaymentPda,
          policyId,
          sdk.programId
        ).address;

        // ── Build createComposablePolicy instruction ──────────────────
        const createIx = await sdk.getCreateComposablePolicyInstruction(
          usdcMint,
          hotWallet, // recipient
          gateway,
          policyType,
          "Topup SOL",
          forwardConfig,
          LIGHTHOUSE_PROGRAM_ID,
          [],
          guard.data
        );
        ixs.push(createIx);

        // ── Send ───────────────────────────────────────────────────────
        setStatus("sending");
        const tx = new Transaction().add(...ixs);
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = coldWallet;

        const signed = await wallet.signTransaction(tx);
        const signature = await connection.sendRawTransaction(
          signed.serialize(),
          {
            skipPreflight: false,
            maxRetries: 3,
          }
        );
        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );

        const res: CreateResult = {
          signature,
          policyPda: composablePolicyPda.toBase58(),
        };
        setResult(res);
        setStatus("success");
        return res;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus("error");
        throw e;
      }
    },
    [connection, wallet, usdcMint]
  );

  return { status, error, result, submit, reset };
}
