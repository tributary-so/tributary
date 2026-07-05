"use client";

import * as React from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { OrderSummary } from "@/components/order-summary";
import { CheckoutSessionManager, CheckoutParams } from "@tributary-so/payments";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { PayForm } from "./components/pay-form";
import { MilestoneForm } from "./components/milestone-form";
import { PayAsYouGoForm } from "./components/payasyougo-form";
import { OneTimePolicyForm } from "./components/onetime-policy-form";
import { UpToForm } from "./components/upto-form";
import { Link } from "react-router-dom";

/** Dispatch a decoded session to the right checkout form by `mode`. */
function renderCheckoutForm(sessionData: CheckoutParams) {
  switch (sessionData.mode) {
    case "subscription":
      return <CheckoutForm sessionData={sessionData} />;
    case "payment":
      return <PayForm sessionData={sessionData} />;
    case "milestone":
      return <MilestoneForm sessionData={sessionData} />;
    case "payAsYouGo":
      return <PayAsYouGoForm sessionData={sessionData} />;
    case "oneTime":
      return <OneTimePolicyForm sessionData={sessionData} />;
    case "upTo":
      return <UpToForm sessionData={sessionData} />;
  }
}

export function PayPage() {
  const [sessionData, setSessionData] = React.useState<CheckoutParams | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const hashPart = window.location.hash;
    let encodedData: string | null = null;

    if (hashPart.includes("#/pay/")) {
      encodedData = hashPart.split("#/pay/")[1];
    } else if (hashPart.includes("#/subscribe/")) {
      encodedData = hashPart.split("#/subscribe/")[1];
    } else if (hashPart.includes("#/policy/")) {
      encodedData = hashPart.split("#/policy/")[1];
    }

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
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground text-sm uppercase tracking-[0.12em]">
          Loading...
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <div className="w-full max-w-md">
          <div className="border border-border p-8 text-center">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-destructive">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSubscription = sessionData.mode === "subscription";
  const heading = isSubscription
    ? "Complete Subscription"
    : sessionData.mode === "payment"
      ? "Complete Payment"
      : "Complete Authorization";
  const subheading = isSubscription
    ? "Review your subscription details and connect your wallet to authorize recurring payments."
    : sessionData.mode === "payment"
      ? "Review your payment details and connect your wallet to complete the transaction."
      : "Review the policy details and connect your wallet to authorize on-chain execution.";

  return (
    <section className="py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-snug tracking-tighter md:text-4xl">
              {heading}
            </h1>
            <p className="text-xl text-muted-foreground">{subheading}</p>
          </div>

          <div className="border border-border/50 p-6 space-y-4">
            <h2 className="font-bold text-foreground uppercase tracking-[0.12em] text-sm">
              Order Summary
            </h2>
            <OrderSummary sessionData={sessionData} />
          </div>
        </div>

        <div>
          <div className="border border-border/50 p-6">
            {renderCheckoutForm(sessionData)}
          </div>
        </div>
      </div>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none py-8"
        aria-hidden="true"
      >
        //
      </div>

      <div className="border border-border bg-muted/20 p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Powered by Tributary</span>
          <span className="text-muted-foreground/30">|</span>
          <span>Secured by Solana</span>
        </div>
      </div>
    </section>
  );
}
