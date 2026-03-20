"use client";

import * as React from "react";
import { SubscriptionParams } from "@tributary-so/payments";
import { CheckCircle2, Wallet, Loader2, Lock, XCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { createSubscription } from "@/lib/tributary";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { getTokenSymbol } from "@tributary-so/sdk";
import { Connection } from "@solana/web3.js";
import config from "@/constants";

interface CheckoutFormProps {
  sessionData: SubscriptionParams;
}

export function CheckoutForm({ sessionData }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [tokenSymbol, setTokenSymbol] = React.useState<string | null>(null);
  const wallet = useWallet();
  const { connected, connecting, publicKey } = wallet;

  React.useEffect(() => {
    if (!sessionData.tokenMint) {
      return;
    }

    const connection = new Connection(config.rpcUrl);
    getTokenSymbol(connection, sessionData.tokenMint)
      .then((symbol) => {
        if (symbol) {
          setTokenSymbol(symbol);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch token metadata:", err);
      });
  }, [sessionData.tokenMint]);

  const handleSubmit = async (e: React.UIEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
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
        amount: sessionData.amount,
        frequency: frequencyMap[sessionData.paymentFrequency] || "monthly",
        memo: sessionData.trackingId,
        tokenMint: sessionData.tokenMint,
      });

      setSuccess(true);

      if (sessionData.successUrl) {
        window.location.href = sessionData.successUrl;
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create subscription"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (sessionData.cancelUrl) {
      window.location.href = sessionData.cancelUrl;
    } else {
      setShowCancelModal(true);
    }
  };

  if (!connected || connecting) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Connect your wallet
          </h2>
          <p className="text-sm text-muted-foreground">
            To complete this subscription, connect your Solana wallet
          </p>
        </div>

        <WalletMultiButton className="w-full h-12 px-6 font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" />
      </div>
    );
  }

  if (success && !sessionData.successUrl) {
    return (
      <div className="space-y-6">
        <div className="border border-border p-8 text-center">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-primary">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Congratulations!
          </h2>
          <p className="text-muted-foreground">
            The subscription has been set up successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">
            Complete subscription
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium border border-border uppercase tracking-[0.08em]">
            Recurring
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Review the details and confirm your subscription
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
            Frequency
          </span>
          <span className="font-medium text-foreground capitalize">
            {sessionData.paymentFrequency}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
            Auto-renew
          </span>
          <span
            className={`font-medium ${
              sessionData.autoRenew ? "text-primary" : "text-foreground"
            }`}
          >
            {sessionData.autoRenew ? "Yes" : "No"}
          </span>
        </div>

        {sessionData.maxRenewals !== null && (
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
              Max renewals
            </span>
            <span className="font-medium text-foreground">
              {sessionData.maxRenewals === 0
                ? "Unlimited"
                : sessionData.maxRenewals}
            </span>
          </div>
        )}

        {success && (
          <div className="border border-primary bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center border border-primary">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Subscription created
                </p>
                <p className="text-sm text-muted-foreground">
                  Your subscription is now active
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || success}
          className="w-full h-12 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground disabled:text-muted-foreground transition-colors flex items-center justify-between px-4 text-sm font-medium"
        >
          {isLoading ? (
            <>
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </span>
              <span className="w-5" />
            </>
          ) : success ? (
            <>
              <span className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Subscribed
              </span>
              <span className="w-5" />
            </>
          ) : (
            <>
              <span>
                Subscribe for {sessionData.amount.toFixed(2)}{" "}
                {tokenSymbol ||
                  `${sessionData.tokenMint.slice(
                    0,
                    6
                  )}...${sessionData.tokenMint.slice(-4)}`}
                /{sessionData.paymentFrequency}
              </span>
              <Lock className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="w-full h-10 bg-transparent hover:bg-accent disabled:bg-transparent text-muted-foreground hover:text-foreground disabled:text-muted-foreground/50 transition-colors text-sm font-medium border border-border"
        >
          Cancel
        </button>
      </div>

      {publicKey && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center border border-primary">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.08em]">
                Connected wallet
              </p>
              <p className="text-sm font-medium text-foreground truncate font-mono">
                {publicKey.toString().slice(0, 6)}...
                {publicKey.toString().slice(-4)}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center uppercase tracking-[0.08em]">
        Secured by Tributary protocol on Solana
      </p>

      {showCancelModal && (
        <div
          className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="border border-border p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-muted-foreground">
              <XCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Payment Cancelled
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              You can return to this checkout page anytime to complete your
              subscription.
            </p>
            <button
              onClick={() => setShowCancelModal(false)}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
