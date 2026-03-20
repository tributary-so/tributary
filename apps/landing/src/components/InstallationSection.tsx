import React, { useState } from "react";
import { motion } from "framer-motion";

const InstallationSection: React.FC = () => {
  const [copyButtonText, setCopyButtonText] = useState("Copy");

  const handleCopy = () => {
    navigator.clipboard.writeText("pnpm install @tributary-so/sdk-react");
    setCopyButtonText("Copied!");
    setTimeout(() => {
      setCopyButtonText("Copy");
    }, 2000);
  };

  return (
    <section className="py-16 px-4 bg-linear-to-br from-neutral-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            Get Started in Minutes
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Install the Tributary SDK and start building subscription payments
            on Solana today.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative bg-neutral-900 text-neutral-100 rounded-2xl p-8 shadow-2xl max-w-2xl mx-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-neutral-400 font-medium">
              Terminal
            </span>
            <button
              onClick={handleCopy}
              className="bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-sm px-3 py-1 rounded transition-colors"
            >
              {copyButtonText}
            </button>
          </div>
          <div className="font-mono text-left">
            <span className="text-green-400">$ </span>
            <span className="text-white">
              pnpm install @tributary-so/sdk-react
            </span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-neutral-500 mt-6 text-sm"
        >
          Works with npm, yarn, and bun too
        </motion.p>
      </div>
    </section>
  );
};

export default InstallationSection;
