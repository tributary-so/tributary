"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SubscriptionParams } from "@tributary-so/payments";

interface OrderSummaryProps {
  sessionData: SubscriptionParams;
}

export function OrderSummary({ sessionData }: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
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
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-card-foreground">
              Subscription Details
            </h3>
            <p className="text-sm text-muted-foreground">
              {sessionData.autoRenew ? "Recurring" : "One-time"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg text-card-foreground">
            ${sessionData.amount.toFixed(2)}/
            {sessionData.paymentFrequency.replace("ly", "")}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Collapsible content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-5 space-y-4">
          {/* Subscription details */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-start justify-between py-2">
              <div className="flex-1">
                <p className="font-medium text-card-foreground">
                  Payment amount
                </p>
                <p className="text-sm text-muted-foreground">
                  {sessionData.paymentFrequency.charAt(0).toUpperCase() +
                    sessionData.paymentFrequency.slice(1)}{" "}
                  subscription
                </p>
              </div>
              <span className="font-medium text-card-foreground">
                ${sessionData.amount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-start justify-between py-2">
              <div className="flex-1">
                <p className="font-medium text-card-foreground">Recipient</p>
                <p className="text-sm text-muted-foreground break-all">
                  {formatAddress(sessionData.recipient)}
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between py-2">
              <div className="flex-1">
                <p className="font-medium text-card-foreground">Token mint</p>
                <p className="text-sm text-muted-foreground break-all">
                  {formatAddress(sessionData.tokenMint)}
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between py-2">
              <div className="flex-1">
                <p className="font-medium text-card-foreground">
                  Payment gateway
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  {formatAddress(sessionData.gateway)}
                </p>
              </div>
            </div>

            {sessionData.maxRenewals !== null && (
              <div className="flex items-start justify-between py-2">
                <div className="flex-1">
                  <p className="font-medium text-card-foreground">
                    Max renewals
                  </p>
                </div>
                <span className="font-medium text-card-foreground">
                  {sessionData.maxRenewals === 0
                    ? "Unlimited"
                    : sessionData.maxRenewals}
                </span>
              </div>
            )}

            {sessionData.startTime !== undefined &&
              sessionData.startTime !== null && (
                <div className="flex items-start justify-between py-2">
                  <div className="flex-1">
                    <p className="font-medium text-card-foreground">
                      Start time
                    </p>
                  </div>
                  <span className="font-medium text-card-foreground">
                    {new Date(
                      sessionData.startTime * 1000
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}

            <div className="flex items-start justify-between py-2">
              <div className="flex-1">
                <p className="font-medium text-card-foreground">Tracking ID</p>
              </div>
              <span className="font-medium text-card-foreground text-sm">
                {sessionData.trackingId || "N/A"}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between pt-2">
              <span className="font-semibold text-card-foreground">
                Total due today
              </span>
              <span className="font-semibold text-lg text-card-foreground">
                ${sessionData.amount.toFixed(2)}/
                {sessionData.paymentFrequency.replace("ly", "")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
