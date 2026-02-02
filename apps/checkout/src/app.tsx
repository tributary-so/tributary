"use client";

import { useState, useEffect } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { OrderSummary } from "@/components/order-summary";
import {
  CheckoutSessionManager,
  SubscriptionParams,
} from "@tributary-so/payments";

export default function CheckoutPage() {
  const [isOrderExpanded, setIsOrderExpanded] = useState(false);
  const [sessionData, setSessionData] = useState<SubscriptionParams | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const encodedData = window.location.pathname.split("/subscribe/")[1];
    if (encodedData) {
      try {
        const sessionManager = new CheckoutSessionManager();
        const decoded = sessionManager.decodeSubscriptionUrl(encodedData);
        setSessionData(decoded);
      } catch (err) {
        setError("Invalid session data");
      }
    } else {
      setError("No session data found");
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left side - Image (desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-sidebar">
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <img
              src="/checkout-illustration.jpg"
              alt="..."
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-sidebar/80 to-sidebar/40" />
            <div className="relative z-10 max-w-md text-center">
              <h1 className="text-4xl font-semibold text-sidebar-foreground mb-4 text-balance">
                Secure & Simple Payments
              </h1>
              <p className="text-sidebar-foreground/70 text-lg leading-relaxed">
                Your subscription is protected with industry-leading encryption
                and security measures.
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Checkout form */}
        <div className="flex-1 lg:w-1/2 flex flex-col">
          {/* Mobile order summary toggle */}
          <div className="lg:hidden bg-card border-b border-border">
            <button
              onClick={() => setIsOrderExpanded(!isOrderExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between text-card-foreground"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-5 h-5 transition-transform ${
                    isOrderExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <span className="font-medium">Order summary</span>
              </div>
              <span className="font-semibold text-lg">
                ${sessionData.amount.toFixed(2)}/
                {sessionData.paymentFrequency.replace("ly", "")}
              </span>
            </button>
            {isOrderExpanded && (
              <div className="px-6 pb-4">
                <OrderSummary sessionData={sessionData} />
              </div>
            )}
          </div>

          {/* Main checkout content */}
          <div className="flex-1 flex items-start justify-center p-6 lg:p-12 overflow-y-auto">
            <div className="w-full max-w-md">
              {/* Desktop order summary */}
              <div className="hidden lg:block mb-8">
                <OrderSummary sessionData={sessionData} />
              </div>

              {/* Checkout form */}
              <CheckoutForm sessionData={sessionData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
