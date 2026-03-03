"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OneTimeParams } from "@tributary-so/payments";
import { CheckCircle2, Wallet, Loader2, Lock, XCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { createOneTimePayment } from "@/lib/tributary";
import { PublicKey, Connection } from "@solana/web3.js";
import { toast } from "sonner";
import { getTokenSymbol } from "@tributary-so/sdk";
import config from "@/constants";

interface PayFormProps {
  sessionData: OneTimeParams;
}

export function PayForm({ sessionData }: PayFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [tokenSymbol, setTokenSymbol] = React.useState<string | null>(null);
  const [txSignature, setTxSignature] = React.useState<string | null>(null);
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
      const memo = sessionData.memo || sessionData.trackingId;

      const signature = await createOneTimePayment({
        wallet,
        recipientWallet: recipient,
        amount: sessionData.amount,
        memo,
        trackingId: sessionData.trackingId,
        tokenMint: sessionData.tokenMint,
      });

      setTxSignature(signature);
      setSuccess(true);

      if (sessionData.successUrl) {
        window.location.href = sessionData.successUrl;
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to process payment"
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
            To complete this payment, connect your Solana wallet
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
            Payment Complete!
          </h2>
          <p className="text-emerald-700 mb-4">
            Your payment has been processed successfully.
          </p>
          {txSignature && (
            <a
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 hover:text-emerald-800 underline"
            >
              View transaction on Solscan
            </a>
          )}
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
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">
            Complete payment
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
            One-time
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Review the details and confirm your single payment
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground">Amount</span>
              </div>
              <span className="font-medium text-foreground">
                {sessionData.amount.toFixed(2)}{" "}
                {tokenSymbol ||
                  `${sessionData.tokenMint.slice(
                    0,
                    6
                  )}...${sessionData.tokenMint.slice(-4)}`}
              </span>
            </div>

            {sessionData.trackingId && (
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
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Tracking ID
                  </span>
                </div>
                <span className="font-medium text-foreground text-xs truncate max-w-[150px]">
                  {sessionData.trackingId}
                </span>
              </div>
            )}

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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground">Recipient</span>
              </div>
              <span className="font-medium text-foreground text-xs">
                {sessionData.recipient.slice(0, 6)}...
                {sessionData.recipient.slice(-4)}
              </span>
            </div>
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
                        Payment sent
                      </p>
                      <p className="text-sm text-emerald-700">
                        Your transaction is confirmed
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
                  Paid
                </span>
                <span className="w-5" />
              </>
            ) : (
              <>
                <span>
                  Pay {sessionData.amount.toFixed(2)}{" "}
                  {tokenSymbol ||
                    `${sessionData.tokenMint.slice(
                      0,
                      6
                    )}...${sessionData.tokenMint.slice(-4)}`}
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
                payment.
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
