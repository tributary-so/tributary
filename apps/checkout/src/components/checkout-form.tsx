"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { SubscriptionParams } from "@tributary-so/payments";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { createSubscription } from "@/lib/tributary";
import { PublicKey } from "@solana/web3.js";

interface CheckoutFormProps {
  sessionData: SubscriptionParams;
}

export function CheckoutForm({ sessionData }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const wallet = useWallet();
  const { connected, connecting, publicKey } = wallet;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const recipient = new PublicKey(sessionData.recipient);
      const frequencyMap: Record<string, "weekly" | "biweekly" | "monthly"> = {
        weekly: "weekly",
        biweekly: "biweekly",
        monthly: "monthly",
      };

      await createSubscription({
        wallet,
        recipientWallet: recipient,
        amountUSD: sessionData.amount,
        frequency: frequencyMap[sessionData.paymentFrequency] || "monthly",
        memo: sessionData.trackingId,
      });

      setSuccess(true);
    } catch (err) {
      console.trace(err);
      setError(
        err instanceof Error ? err.message : "Failed to create subscription"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!connected || connecting) {
    return (
      <div className="text-center max-w-md mx-auto mt-4">
        <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Subscription details
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Payment frequency</span>
            <span className="font-medium text-foreground capitalize">
              {sessionData.paymentFrequency}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Auto-renew</span>
            <span className="font-medium text-foreground">
              {sessionData.autoRenew ? "Yes" : "No"}
            </span>
          </div>
          {sessionData.maxRenewals !== null && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Max renewals</span>
              <span className="font-medium text-foreground">
                {sessionData.maxRenewals === 0
                  ? "Unlimited"
                  : sessionData.maxRenewals}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Subscription created successfully!</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="button"
        onClick={handleSubmit}
        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth={4}
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">Subscribe now</span>
        )}
      </Button>

      {publicKey && (
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          Signed in as{" "}
          <span className="font-mono">{publicKey?.toString()}</span>
          <div className="text-center max-w-md mx-auto mt-4">
            <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors" />
          </div>
        </p>
      )}

      {/* Security notice */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span>Secured by Tributary protocol</span>
      </div>

      {/* Terms */}
      <p className="text-xs text-center text-muted-foreground leading-relaxed">
        By subscribing, you agree to the Tributary protocol terms. Your
        subscription will be processed on Solana blockchain.
      </p>
    </div>
  );
}
