import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  useCreateSubscription,
  PaymentInterval,
  CreateSubscriptionResult,
} from "../";
import { Loader2 } from "lucide-react";

interface SubscriptionButtonProps {
  amount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  interval: PaymentInterval;
  maxRenewals?: number;
  memo?: string;
  startTime?: Date;
  approvalAmount?: BN;
  label?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (result: CreateSubscriptionResult) => void;
  onError?: (error: Error) => void;
}

export function SubscriptionButton({
  amount,
  token,
  recipient,
  gateway,
  interval,
  maxRenewals,
  memo,
  startTime,
  approvalAmount,
  label = "Subscribe",
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: SubscriptionButtonProps) {
  const { createSubscription, loading } = useCreateSubscription();

  const handleClick = async () => {
    try {
      const result = await createSubscription({
        amount,
        token,
        recipient,
        gateway,
        interval,
        maxRenewals,
        memo,
        startTime,
        approvalAmount,
      });
      onSuccess?.(result);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error("Unknown error"));
    }
  };

  const isDisabled = disabled || loading;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {loading ? "Creating Subscription..." : label}
    </button>
  );
}
