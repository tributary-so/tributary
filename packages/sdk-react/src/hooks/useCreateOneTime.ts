import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { useTributarySDK } from "./useTributarySDK";
import {
  CreateOneTimeParams,
  CreateOneTimeResult,
  UseCreateOneTimeReturn,
} from "../types";
import { createMemoBuffer } from "@tributary-so/sdk";

export function useCreateOneTime(): UseCreateOneTimeReturn {
  const { connection } = useConnection();
  const wallet = useWallet();
  const sdk = useTributarySDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOneTime = async (
    params: CreateOneTimeParams
  ): Promise<CreateOneTimeResult> => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }
    if (!sdk) {
      throw new Error("SDK not available");
    }

    setLoading(true);
    setError(null);

    try {
      const instructions = await sdk.createOneTimePayment(
        params.token,
        params.recipient,
        params.gateway,
        params.amount,
        createMemoBuffer(params.memo || "", 64),
        params.dueDate ?? null,
        params.expiryDate ?? null,
        params.approvalAmount
      );
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions,
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

  return { createOneTime, loading, error };
}
