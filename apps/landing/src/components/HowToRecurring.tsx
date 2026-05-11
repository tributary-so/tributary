import { useState } from "react";
import TerminalCard from "./TerminalCard";

const features = [
  {
    id: "checkout",
    label: "Checkout Page",
    heading: "Redirect, pay, return with proof",
    desc: "Generate a checkout URL with PaymentsClient. Users land on the hosted checkout page, connect their wallet, approve the payment, and return to your site with a cryptographically signed JWT. No Solana code on your end.",
    bullets: [
      "Hosted checkout",
      "JWT proof",
      "No Solana code",
      "Redirect flow",
    ],
    language: "tsx" as const,
    steps: [
      {
        num: "1",
        title: "Redirect & Pay",
        desc: "User follows your checkout URL, connects wallet, approves subscription or one-time payment on the hosted page.",
        accent: "primary",
        path: "M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25",
      },
      {
        num: "2",
        title: "Return with JWT",
        desc: "User lands on your success URL with a signed JWT. Verify with any standard JWT library. Cryptographic proof the payment happened. No RPC calls needed.",
        accent: "accent",
        path: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
      },
    ],
    code: `import { useCheckoutSession } from "@tributary-so/sdk-react";

const { initiate } = useCheckoutSession();

initiate({
  mode: "subscription",
  amount: 10,
  paymentFrequency: "monthly",
});`,
  },
  {
    id: "jwt",
    label: "Verification Hook",
    heading: "Verify Payment without touching Solana.",
    desc: "Your user pays via checkout. Lands back on your site with a signed JWT. You verify it with any standard JWT library. Subscription status, payment history, amounts. All cryptographically signed, on-chain verifiable. Zero Solana code on your side.",
    bullets: [
      "No Solana SDK",
      "No RPC calls",
      "3 lines to verify",
      "ES256 signed",
    ],
    language: "ts" as const,
    code: `import { useTributaryToken } from "@tributary-so/sdk-react";

const { token, payload, loading } = useTributaryToken();

// payload.status === "paid"
// payload.subscriptions[0].amount === "10.00"`,
  },
  {
    id: "react-button",
    label: "React Button",
    heading: "Drop-in button, one click to subscribe",
    desc: "Render SubscriptionButton, MilestoneButton, or PayAsYouGoButton from @tributary-so/sdk-react. User clicks, wallet pops up, they approve the transaction. Policy created on-chain, processor handles the rest.",
    bullets: [
      "Pre-built components",
      "Wallet popup",
      "3 button types",
      "Zero config",
    ],
    language: "tsx" as const,
    steps: [
      {
        num: "1",
        title: "Click & Approve",
        desc: "User clicks the button, wallet modal appears, approves delegation and policy creation in a single transaction.",
        accent: "primary",
        path: "M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59",
      },
      {
        num: "2",
        title: "Automated Transfer",
        desc: "Same permissionless execution. Recurring transfers happen automatically. No additional integration needed.",
        accent: "accent",
        path: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 21v-5h-5",
      },
    ],
    code: `import { SubscriptionButton, PaymentInterval } from '@tributary-so/sdk-react'
import { PaymentFrequency } from '@tributary-so/sdk'

<SubscriptionButton
  amount={new BN(amount)}
  recipient=RECIPIENT_PUBKEY,
  maxRenewals=12
  interval={PaymentInterval.Monthly
  className="bg-subscription-600 hover:bg-subscription-700 text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>`,
  },
  {
    id: "custom-tx",
    label: "Customize",
    heading: "Build your own transaction flow",
    desc: "Compose approval and policy creation into a custom transaction using the TypeScript SDK. Full control over instruction order, parameters, and error handling. The processor handles recurring transfers from there.",
    bullets: [
      "TypeScript SDK",
      "Custom instructions",
      "Single or multi-TX",
      "Full control",
    ],
    language: "tsx" as const,
    steps: [
      {
        num: "1",
        title: "Compose & Sign",
        desc: "Build a transaction with approve_delegate + create_payment_policy instructions. User signs once. Funds stay in their wallet.",
        accent: "primary",
        path: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
      },
      {
        num: "2",
        title: "Automated Transfer",
        desc: "Processor triggers transfers when due. No custom payment rails. Solana handles the execution.",
        accent: "accent",
        path: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 21v-5h-5",
      },
    ],
  },
  {
    id: "self-host",
    label: "Self-Hostable",
    heading: "Your infrastructure. Your rules.",
    desc: "Every component is open source and self-hostable. Checkout page, API server, indexer, signing keys, facilitator. All of it. Start with our hosted path, migrate when it makes sense. The JWT verification code stays the same.",
    bullets: ["Checkout page", "API server", "Event indexer", "Signing keys"],
    language: "bash" as const,
    code: `$ git clone https://github.com/tributary-so/tributary
$ cd tributary/apps/checkout
$ pnpm run dev

# Self-host the entire stack:
#  - Checkout page
#  - API server
#  - Event indexer

# Or use the hosted path at checkout.tributary.so`,
  },
  {
    id: "open-source",
    label: "Open Source",
    heading: "Fork it. Audit it. Extend it.",
    desc: "Tributary is fully open source under MIT license. Every smart contract, every SDK, every component. Audit the on-chain programs, run your own instance, or build a custom payment product on top. The protocol is the product.",
    bullets: ["MIT licensed", "4 SDKs", "Mainnet deployed", "monorepo"],
    language: "bash" as const,
    code: `git clone github.com/tributary-so/tributary`,
  },
];

export default function HowToRecurring() {
  const [activeFeature, setActiveFeature] = useState(features[0]);
  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-12 items-start">
      <nav className="flex flex-col md:sticky md:top-24">
        {features.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFeature(f)}
            className={`text-left px-4 py-3.5 text-sm font-medium transition-all duration-200 flex items-center gap-2.5 ${
              activeFeature.id === f.id
                ? "text-foreground bg-card border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 flex-shrink-0 transition-colors ${
                activeFeature.id === f.id
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            />
            {f.label}
          </button>
        ))}
      </nav>
      <div className="space-y-7">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-3 leading-snug">
            {activeFeature.heading}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {activeFeature.desc}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFeature.bullets.map((b) => (
            <span
              key={b}
              className="flex items-center gap-1.5 text-sm text-foreground bg-muted/50 border border-border/50 px-3 py-1.5"
            >
              <span className="w-1.5 h-1.5 bg-primary flex-shrink-0" />
              {b}
            </span>
          ))}
        </div>

        {activeFeature.steps && (
          <div className="relative">
            <div className="hidden md:block absolute top-8 left-[calc(20%+2rem)] right-[calc(20%+2rem)] h-px bg-gradient-to-r from-primary/10 via-primary/40 to-accent/40 pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeFeature.steps.map(({ num, title, desc, accent, path }) => (
                <div
                  key={num}
                  className="flex flex-col items-center text-center group"
                >
                  <div
                    className={`relative w-16 h-16 bg-card border ${
                      accent === "accent"
                        ? "border-accent/25 group-hover:border-accent/60 group-hover:bg-accent/10"
                        : "border-primary/25 group-hover:border-primary/60 group-hover:bg-primary/10"
                    } flex items-center justify-center mb-5 z-10 transition-all duration-300`}
                  >
                    <svg
                      className={`w-7 h-7 ${
                        accent === "accent" ? "text-accent" : "text-primary"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={path}
                      />
                    </svg>
                    <span
                      className={`absolute -top-2 -right-2 w-5 h-5 ${
                        accent === "accent"
                          ? "bg-accent text-white"
                          : "bg-primary text-white"
                      } text-xs font-bold flex items-center justify-center`}
                    >
                      {num}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground mb-2 text-sm">
                    {title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeFeature.code && (
          <TerminalCard
            filename={
              activeFeature.id === "jwt"
                ? "verify.ts"
                : activeFeature.id === "self-host"
                ? "terminal"
                : activeFeature.id === "checkout"
                ? "App.tsx"
                : "terminal"
            }
            code={activeFeature.code}
            language="typescript"
          />
        )}
      </div>
    </div>
  );
}
