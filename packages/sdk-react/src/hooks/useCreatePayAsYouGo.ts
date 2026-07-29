import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { useTributarySDK } from "./useTributarySDK";
import {
  CreatePayAsYouGoParams,
  CreatePayAsYouGoResult,
  UseCreatePayAsYouGoReturn,
} from "../types";
import { createMemoBuffer } from "@tributary-so/sdk";

export function useCreatePayAsYouGo(): UseCreatePayAsYouGoReturn {
  const { connection } = useConnection();
  const wallet = useWallet();
  const sdk = useTributarySDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayAsYouGo = async (
    params: CreatePayAsYouGoParams
  ): Promise<CreatePayAsYouGoResult> => {
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
      const instructions = await sdk.createPayAsYouGo(
        params.token,
        params.recipient,
        params.gateway,
        params.maxAmountPerPeriod,
        params.maxChunkAmount,
        params.periodLengthSeconds,
        createMemoBuffer(params.memo || "", 64),
        params.approvalAmount
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

  return { createPayAsYouGo, loading, error };
}
