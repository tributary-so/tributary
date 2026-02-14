"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Connect your wallet
          </h2>
          <p className="text-sm text-muted-foreground">
            To complete this subscription, connect your Solana wallet
          </p>
        </div>

        <WalletMultiButton className="w-full h-12 px-6 rounded-lg font-medium text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" />
      </motion.div>
    );
  }

  if (success && !sessionData.successUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-emerald-900 mb-2">
            Congratulations!
          </h2>
          <p className="text-emerald-700">
            You're done! The subscription has been set up successfully.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">
          Complete subscription
        </h2>
        <p className="text-sm text-muted-foreground">
          Review the details and confirm your subscription
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground">Frequency</span>
              </div>
              <span className="font-medium text-foreground capitalize">
                {sessionData.paymentFrequency}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground">
                  Auto-renew
                </span>
              </div>
              <span
                className={`font-medium ${
                  sessionData.autoRenew ? "text-emerald-600" : "text-foreground"
                }`}
              >
                {sessionData.autoRenew ? "✅" : "❌"}
              </span>
            </div>

            {sessionData.maxRenewals !== null && (
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Max renewals
                  </span>
                </div>
                <span className="font-medium text-foreground">
                  {sessionData.maxRenewals === 0
                    ? "Unlimited"
                    : sessionData.maxRenewals}
                </span>
              </div>
            )}
          </div>
          <AnimatePresence mode="wait">
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-emerald-900">
                        Subscription created
                      </p>
                      <p className="text-sm text-emerald-700">
                        Your subscription is now active
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || success}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-between px-4 mb-3"
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
                <Lock className="w-4 h-4 mr-2" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full h-10 bg-transparent hover:bg-gray-100 disabled:bg-transparent text-gray-600 hover:text-gray-800 disabled:text-gray-400 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>

        {publicKey && (
          <div className="px-6 py-4 border-t border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  Connected wallet
                </p>
                <p className="text-sm font-medium text-foreground truncate">
                  {publicKey.toString().slice(0, 6)}...
                  {publicKey.toString().slice(-4)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Secured by Tributary protocol on Solana
      </p>

      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-card rounded-xl border border-border p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-orange-600" />
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
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
