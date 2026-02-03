import * as React from "react";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
    >
      <motion.div
        animate={{
          backgroundPosition: ["0% 50%", "100% 0%", "0% 50%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 bg-gradient-to-br from-[#9945FF] to-[#14F195]"
        style={{
          backgroundSize: "200% 200%",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-10 w-full text-center"
      >
        <h1 className="text-5xl font-bold text-gray-800 mb-4 tracking-tight leading-tight mt-28">
          Secure & Simple
          <br />
          Payments
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-xl text-gray-800/90 leading-relaxed w-full pl-8 pr-8"
        >
          Your subscription is protected with industry-leading cryptography and
          security measures on Solana blockchain.
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
            <span className="text-gray-800/80 text-sm font-medium">
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
            <span className="text-gray-800/80 text-sm font-medium">
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
            <span className="text-gray-800/80 text-sm font-medium">
              Low fees
            </span>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="absolute bottom-8 left-0 right-0 text-center"
        >
          <p className="text-[#333] text-sm font-medium flex items-center justify-center gap-2">
            <span>Powered by </span>
            <img
              src="/logo.svg"
              alt="Tributary"
              className="h-4 w-auto inline-block"
            />
            <span>Tributary. Secured by</span>
            <img
              src="/solana.svg"
              alt="Solana"
              className="h-3 w-auto inline-block"
            />
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
