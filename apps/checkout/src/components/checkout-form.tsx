"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { SubscriptionParams } from "@tributary-so/payments";

interface CheckoutFormProps {
  sessionData: SubscriptionParams;
}

export function CheckoutForm({ sessionData }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

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
                strokeWidth="4"
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
