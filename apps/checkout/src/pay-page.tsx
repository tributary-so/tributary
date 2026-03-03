"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckoutForm } from "@/components/checkout-form";
import { OrderSummary } from "@/components/order-summary";
import { CheckoutSessionManager, CheckoutParams } from "@tributary-so/payments";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Hero } from "./components/hero";
import { PayForm } from "./components/pay-form";

export function PayPage() {
  const [sessionData, setSessionData] = React.useState<CheckoutParams | null>(
    null
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => (window.location.href = document.referrer || "/")}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isSubscription = sessionData.mode === "subscription";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30"
    >
      <div className="flex flex-col lg:flex-row min-h-screen">
        <Hero />

        <div className="flex-1 lg:w-1/2 flex flex-col bg-gray-200/80 backdrop-blur-sm">
          <div className="flex-1 flex items-start justify-center p-6 lg:p-12 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="hidden lg:block mb-8">
                <OrderSummary sessionData={sessionData} />
              </div>

              {isSubscription ? (
                <CheckoutForm sessionData={sessionData} />
              ) : (
                <PayForm sessionData={sessionData} />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
