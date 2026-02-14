"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Package } from "lucide-react";
import { SubscriptionParams } from "@tributary-so/payments";
import { getTokenSymbol } from "@tributary-so/sdk";
import { Connection } from "@solana/web3.js";
import config from "@/constants";

interface OrderSummaryProps {
  sessionData: SubscriptionParams;
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
              {sessionData.lineItems?.length || 1} item
              {sessionData.lineItems?.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg text-foreground">
            {sessionData.amount.toFixed(2)}{" "}
            {tokenSymbol ||
              `${sessionData.tokenMint.slice(
                0,
                6
              )}...${sessionData.tokenMint.slice(-4)}`}
            <span className="text-sm font-normal text-muted-foreground">
              /{sessionData.paymentFrequency.replace("ly", "")}
            </span>
          </span>
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
          {sessionData.lineItems && sessionData.lineItems.length > 0 && (
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
                      Qty {item.quantity} × {(item.unitPrice / 100).toFixed(2)}{" "}
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
              <span className="text-sm text-muted-foreground">Subtotal</span>
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
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total due</span>
              <span className="font-semibold text-xl text-foreground">
                {sessionData.amount.toFixed(2)}{" "}
                {tokenSymbol ||
                  `${sessionData.tokenMint.slice(
                    0,
                    6
                  )}...${sessionData.tokenMint.slice(-4)}`}
                <span className="text-sm font-normal text-muted-foreground">
                  /{sessionData.paymentFrequency}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
