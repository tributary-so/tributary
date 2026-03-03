"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Package, Clock } from "lucide-react";
import { CheckoutParams } from "@tributary-so/payments";
import { getTokenSymbol } from "@tributary-so/sdk";
import { Connection } from "@solana/web3.js";
import config from "@/constants";

interface OrderSummaryProps {
  sessionData: CheckoutParams;
}

export function OrderSummary({ sessionData }: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);

  useEffect(() => {
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

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const isSubscription = sessionData.mode === "subscription";
  const lineItemCount =
    isSubscription && sessionData.lineItems ? sessionData.lineItems.length : 1;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">Order summary</h3>
            <p className="text-sm text-muted-foreground">
              {lineItemCount} item{lineItemCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-semibold text-lg text-foreground">
              {sessionData.amount.toFixed(2)}{" "}
              {tokenSymbol ||
                `${sessionData.tokenMint.slice(
                  0,
                  6
                )}...${sessionData.tokenMint.slice(-4)}`}
            </div>
            {isSubscription ? (
              <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />
                <span>/{sessionData.paymentFrequency.replace("ly", "")}</span>
              </div>
            ) : (
              <div className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                One-time payment
              </div>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 pb-6 space-y-6">
          {isSubscription &&
            sessionData.lineItems &&
            sessionData.lineItems.length > 0 && (
              <div className="space-y-3 pt-2">
                {sessionData.lineItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {item.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Qty {item.quantity} ×{" "}
                        {(item.unitPrice / 100).toFixed(2)}{" "}
                        {tokenSymbol ||
                          `${sessionData.tokenMint.slice(
                            0,
                            6
                          )}...${sessionData.tokenMint.slice(-4)}`}
                      </p>
                    </div>
                    <span className="font-medium text-foreground">
                      {((item.quantity * item.unitPrice) / 100).toFixed(2)}{" "}
                      {tokenSymbol ||
                        `${sessionData.tokenMint.slice(
                          0,
                          6
                        )}...${sessionData.tokenMint.slice(-4)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                {isSubscription ? "Subtotal" : "Payment amount"}
              </span>
              <span className="font-medium text-foreground">
                {sessionData.amount.toFixed(2)}{" "}
                {tokenSymbol ||
                  `${sessionData.tokenMint.slice(
                    0,
                    6
                  )}...${sessionData.tokenMint.slice(-4)}`}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Recipient</span>
              <span className="font-medium text-foreground font-mono text-sm">
                {formatAddress(sessionData.recipient)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            {!isSubscription && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900">
                      One-time payment
                    </p>
                    <p className="text-amber-700">
                      This is a single payment. You will not be charged again.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                {isSubscription ? "Total due" : "Amount due"}
              </span>
              <div className="text-right">
                <span className="font-semibold text-xl text-foreground">
                  {sessionData.amount.toFixed(2)}{" "}
                  {tokenSymbol ||
                    `${sessionData.tokenMint.slice(
                      0,
                      6
                    )}...${sessionData.tokenMint.slice(-4)}`}
                </span>
                {isSubscription && (
                  <div className="text-xs text-muted-foreground">
                    /{sessionData.paymentFrequency}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
