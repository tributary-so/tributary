import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useTributarySDK } from "./useTributarySDK";
import {
  PaymentInterval,
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  UseCreateSubscriptionReturn,
} from "../types";
import { PaymentFrequency, createMemoBuffer } from "@tributary-so/sdk";

function createPaymentFrequency(
  interval: PaymentInterval,
  seconds?: number
): PaymentFrequency {
  switch (interval) {
    case PaymentInterval.Daily:
      return { daily: {} };
    case PaymentInterval.Weekly:
      return { weekly: {} };
    case PaymentInterval.Monthly:
      return { monthly: {} };
    case PaymentInterval.Quarterly:
      return { quarterly: {} };
    case PaymentInterval.SemiAnnually:
      return { semiAnnually: {} };
    case PaymentInterval.Annually:
      return { annually: {} };
    case PaymentInterval.Custom:
      return { custom: { 0: new BN(seconds!) } };
    default:
      throw new Error(`Unsupported interval: ${interval}`);
  }
}

export function useCreateSubscription(): UseCreateSubscriptionReturn {
  const { connection } = useConnection();
  const wallet = useWallet();
  const sdk = useTributarySDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubscription = async (
    params: CreateSubscriptionParams
  ): Promise<CreateSubscriptionResult> => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    if (!sdk) {
      throw new Error("SDK not available");
    }

    setLoading(true);
    setError(null);

    try {
      // Convert simplified params to SDK format
      const frequency = createPaymentFrequency(
        params.interval,
        params.custom_interval
      );
      const memoBuffer = createMemoBuffer(params.memo || "", 64);
      const startTime = params.startTime
        ? new BN(Math.floor(params.startTime.getTime() / 1000))
        : null;

      // Get instructions
      const instructions = await sdk.createSubscriptionInstruction(
        params.token,
        params.recipient,
        params.gateway,
        params.amount,
        false,
        null,
        frequency,
        memoBuffer,
        startTime,
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

  return { createSubscription, loading, error };
}
