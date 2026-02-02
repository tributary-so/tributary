"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { SubscriptionParams } from "@tributary-so/payments";
import { Button } from "@/components/ui/button";
import { Lock, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { createSubscription } from "@/lib/tributary";
import { PublicKey } from "@solana/web3.js";

interface CheckoutFormProps {
  sessionData: SubscriptionParams;
}

export function CheckoutForm({ sessionData }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center max-w-md mx-auto"
      >
        <WalletMultiButton className="h-14 px-8 rounded-xl font-semibold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-200" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
      className="space-y-8"
    >
      {/* Security Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"
      >
        <Shield className="w-4 h-4" />
        <span>Web3 Transaction</span>
      </motion.div>

      {/* Payment Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-xl font-semibold text-slate-900 mb-6">
          Subscription details
        </h2>

        <div className="space-y-1">
          <div className="flex items-center justify-between py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3-6 6 6V8M12 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-sm text-slate-600 font-medium">
                Payment frequency
              </span>
            </div>
            <span className="font-semibold text-lg text-slate-900 capitalize">
              {sessionData.paymentFrequency}
            </span>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v16h16M4 8h16M12 12h8M12 16h8"
                  />
                </svg>
              </div>
              <span className="text-sm text-slate-600 font-medium">
                Auto-renew
              </span>
            </div>
            <span
              className={`font-semibold text-lg ${
                sessionData.autoRenew ? "text-emerald-600" : "text-slate-900"
              }`}
            >
              {sessionData.autoRenew ? "Yes" : "No"}
            </span>
          </div>

          {sessionData.maxRenewals !== null && (
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 12v8l4-4 4 4V12H4zm16 0v8l4-4 4 4V12H20z"
                    />
                  </svg>
                </div>
                <span className="text-sm text-slate-600 font-medium">
                  Max renewals
                </span>
              </div>
              <span className="font-semibold text-lg text-slate-900">
                {sessionData.maxRenewals === 0
                  ? "Unlimited"
                  : sessionData.maxRenewals}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          success ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
        }
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        {success && (
          <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
              <span className="font-semibold text-emerald-800 text-lg">
                Subscription created successfully!
              </span>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Error Message */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={error ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        {error && (
          <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-200">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
              <span className="font-semibold text-red-800 text-lg">
                {error}
              </span>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Button
          type="button"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={success}
          className="w-full h-14 text-base"
        >
          {success ? "Subscribed" : "Subscribe now"}
        </Button>
      </motion.div>

      {/* Wallet Info */}
      {publicKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200"
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <span className="text-sm text-slate-600">
            Connected:{" "}
            <span className="font-mono font-medium text-slate-900">{`${publicKey
              .toString()
              .slice(0, 4)}...${publicKey.toString().slice(-4)}`}</span>
          </span>
        </motion.div>
      )}

      {/* Security Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex flex-col items-center justify-center gap-3 text-center text-sm text-slate-500"
      >
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4" />
          <span className="font-medium">Secured by Tributary protocol</span>
        </div>
        <p className="max-w-md leading-relaxed">
          By subscribing, you agree to Tributary protocol terms. Your
          subscription will be processed on Solana blockchain with
          industry-leading encryption.
        </p>
      </motion.div>
    </motion.div>
  );
}
