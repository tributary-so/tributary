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
            of code. Currently supports React, more frameworks coming soon.
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
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://github.com/tributary-so/tributary/blob/main/sdk-react/src/main.tsx"
              className="btn-primary text-lg flex items-center gap-2 justify-center"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Full React Example
            </a>
            <a
              href="https://docs.tributary.so"
              className="btn-primary text-lg flex items-center gap-2 justify-center"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              View Full Documentation
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GetStartedSection;
