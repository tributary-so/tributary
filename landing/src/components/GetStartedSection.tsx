import React from "react";
import { motion } from "framer-motion";
import CodeBlock from "./CodeBlock";

const GetStartedSection: React.FC = () => {
  const codeExamples = [
    {
      language: "tsx",
      title: "React",
      code: `import { SubscriptionButton, PaymentInterval } from '@tributary-so/sdk-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
<div>

// The button
 <SubscriptionButton
  amount={new BN(10_000_000)} // 10 USDC
  token={new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')}
  recipient={PAYMENT_RECIPIENT_PUBLIC_KEY}
  gateway={PAYMENT_GATEWAY_PUBLIC_KEY}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Premium subscription - Widget Demo"
  label="Subscribe for $10/month"
  executeImmediately={true}
  className="bg-primary hover:bg-secondary text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>

// 🎉 That's it! Payments now flow automatically`,
    },
    {
      language: "svelte",
      title: "Svelte",
      code: `// Work in progress - Svelte support coming soon!`,
      disabled: true,
      tooltip: "Work in progress",
    },
    {
      language: "vue",
      title: "Vue",
      code: `// Work in progress - Vue support coming soon!`,
      disabled: true,
      tooltip: "Work in progress",
    },
  ];

  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
            Start Building Today
          </h2>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto leading-relaxed">
            Integrate subscription payments into your app with just a few lines
            of code. Currently supports React with Svelte and Vue coming soon.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <CodeBlock
            examples={codeExamples}
            title="SDK Integration Examples"
            showLineNumbers={true}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-neutral-600 mb-8">
            Ready to dive deeper? Check out our comprehensive documentation.
          </p>
          <motion.a
            href="https://docs.tributary.so"
            className="btn-primary text-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Full Documentation
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default GetStartedSection;
