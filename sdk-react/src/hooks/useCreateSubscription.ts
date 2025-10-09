import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useTributarySDK } from "./useTributarySDK";
import {
  PaymentInterval,
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  UseCreateSubscriptionReturn,
} from "../types";
import { PolicyType, PaymentFrequency, createMemoBuffer } from "@tributary/sdk";

function createPolicyType(params: CreateSubscriptionParams): PolicyType {
  return {
    subscription: {
      amount: params.amount,
      intervalSeconds: getIntervalSeconds(params.interval),
      autoRenew: true,
      maxRenewals: params.maxRenewals || null,
      padding: Array(8).fill(new BN(0)),
    },
  };
}

function getIntervalSeconds(interval: PaymentInterval): BN {
  switch (interval) {
    case PaymentInterval.Daily:
      return new BN(24 * 60 * 60); // 1 day
    case PaymentInterval.Weekly:
      return new BN(7 * 24 * 60 * 60); // 1 week
    case PaymentInterval.Monthly:
      return new BN(30 * 24 * 60 * 60); // ~1 month
    case PaymentInterval.Quarterly:
      return new BN(90 * 24 * 60 * 60); // ~3 months
    case PaymentInterval.SemiAnnually:
      return new BN(180 * 24 * 60 * 60); // ~6 months
    case PaymentInterval.Annually:
      return new BN(365 * 24 * 60 * 60); // ~1 year
    default:
      throw new Error(`Unsupported interval: ${interval}`);
  }
}

function createPaymentFrequency(interval: PaymentInterval): PaymentFrequency {
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
      const policyType = createPolicyType(params);
      const frequency = createPaymentFrequency(params.interval);
      const memoBuffer = createMemoBuffer(params.memo || "", 64);
      const startTime = params.startTime
        ? new BN(Math.floor(params.startTime.getTime() / 1000))
        : null;

      // Get instructions
      const instructions = await sdk.createPaymentPolicyWithUser(
        params.token,
        params.recipient,
        params.gateway,
        policyType,
        frequency,
        memoBuffer,
        startTime,
        params.approvalAmount
      );

      // Build transaction
      const transaction = new Transaction();
      instructions.forEach((ix) => transaction.add(ix));
      transaction.feePayer = wallet.publicKey;

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign and send transaction
      const signedTx = await wallet.signTransaction(transaction);
      const txId = await connection.sendRawTransaction(signedTx.serialize());

      // Confirm transaction
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
