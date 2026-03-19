import CodeBlock from "./CodeBlock";
import { Code2, BookOpen } from "lucide-react";

export default function GetStartedSection() {
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
    <section className="py-24 px-4 bg-background border-t border-border/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
            Start Building Today
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Integrate subscription payments into your app with just a few lines
            of code. Currently supports React, more frameworks coming soon.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <CodeBlock
            examples={codeExamples}
            title="SDK Integration Examples"
            showLineNumbers={true}
          />
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-8">
            Ready to dive deeper? Check out our comprehensive documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/tributary-so/tributary/blob/main/sdk-react/src/main.tsx"
              className="btn-primary text-lg flex items-center gap-2 justify-center"
            >
              <Code2 className="h-5 w-5" />
              Full React Example
            </a>
            <a
              href="https://docs.tributary.so"
              className="btn-primary text-lg flex items-center gap-2 justify-center"
            >
              <BookOpen className="h-5 w-5" />
              View Full Documentation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
