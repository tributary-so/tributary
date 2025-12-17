import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useTributarySDK } from "./useTributarySDK";
import {
  CreateMilestoneParams,
  CreateMilestoneResult,
  UseCreateMilestoneReturn,
} from "../types";
import { createMemoBuffer } from "@tributary-so/sdk";

export function useCreateMilestone(): UseCreateMilestoneReturn {
  const { connection } = useConnection();
  const wallet = useWallet();
  const sdk = useTributarySDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMilestone = async (
    params: CreateMilestoneParams
  ): Promise<CreateMilestoneResult> => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    if (!sdk) {
      throw new Error("SDK not available");
    }

    setLoading(true);
    setError(null);

    try {
      // Get instructions
      const instructions = await sdk.createMilestone(
        params.token,
        params.recipient,
        params.gateway,
        params.milestoneAmounts,
        params.milestoneTimestamps,
        params.releaseCondition,
        createMemoBuffer(params.memo || "", 64),
        params.approvalAmount,
        params.executeImmediately ?? true
      );
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: instructions,
      }).compileToV0Message();
      const transaction = new VersionedTransaction(messageV0);
      const signedTx = await wallet.signTransaction(transaction);
      const txId = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction({
        signature: txId,
        blockhash,
        lastValidBlockHeight,
      });

      return { txId, instructions };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createMilestone, loading, error };
}
