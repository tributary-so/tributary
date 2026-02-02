"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckoutForm } from "@/components/checkout-form";
import { OrderSummary } from "@/components/order-summary.tsx";
import { CheckoutSessionManager } from "@tributary-so/payments";

export default function CheckoutPage() {
  const [isOrderExpanded, setIsOrderExpanded] = React.useState(false);
  const [sessionData, setSessionData] =
    React.useState<SubscriptionParams | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  React.useEffect(() => {
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
    setIsInitialLoad(false);
  }, []);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen bg-slate-50 flex items-center justify-center px-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Error</h1>
            <p className="text-slate-600 leading-relaxed">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => (window.location.href = "/")}
              className="mt-6 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-200"
            >
              Return home
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="relative w-12 h-12"
        >
          <div className="absolute inset-0 border-4 border-primary/30 border-t-transparent rounded-full" />
        </motion.div>
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30"
    >
      <div className="flex flex-col lg:flex-row min-h-screen">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        >
          <motion.div
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600"
            style={{
              backgroundSize: "200% 200%",
            }}
          />
          <div className="absolute inset-0 opacity-10"></div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative z-10 w-full text-center"
          >
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight leading-tight mt-28">
              Secure & Simple
              <br />
              Payments
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="text-xl text-white/90 leading-relaxed w-full pl-8 pr-8"
            >
              Your subscription is protected with industry-leading cryptography
              and security measures on Solana blockchain.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex items-center justify-center gap-6 mt-12"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-white/80" />
                <span className="text-white/80 text-sm font-medium">
                  256-bit cryptography
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-white/80" />
                <span className="text-white/80 text-sm font-medium">
                  Instant settlement
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-white/80" />
                <span className="text-white/80 text-sm font-medium">
                  Low fees
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="flex-1 lg:w-1/2 flex flex-col bg-white/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:hidden bg-white border-b border-slate-200 shadow-sm"
          >
            <motion.button
              onClick={() => setIsOrderExpanded(!isOrderExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors duration-200"
              whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: isOrderExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                ></motion.div>
                <span className="font-semibold text-slate-900">
                  Order summary
                </span>
              </div>
              <span className="font-bold text-lg text-primary">
                ${sessionData.amount.toFixed(2)}/
                {sessionData.paymentFrequency.replace("ly", "")}
              </span>
            </motion.button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOrderExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-6 pb-4">
                <OrderSummary sessionData={sessionData} />
              </div>
            </div>
          </motion.div>

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

              <CheckoutForm sessionData={sessionData} />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
