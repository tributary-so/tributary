import { useState } from "react";
import TerminalCard from "./TerminalCard";

// ponytail: one component, two flows, internal toggle. Reuses HowToProcessor's
// step-node visual language (numbered badge + icon node + connecting rule).

type Phase = {
  num: string;
  title: string;
  desc: string;
  path: string;
};

type Flow = {
  id: "payment" | "composable";
  label: string;
  policy: string;
  badge: string;
  caption: string;
  phases: Phase[];
  code: string;
};

const FLOWS: Flow[] = [
  {
    id: "payment",
    label: "Minimal config",
    policy: "PaymentPolicy",
    badge: "● LIVE",
    caption:
      "The live primitive. A gateway signer pulls delegated tokens and settles in a single CPI — recipient paid, protocol + gateway fees split, no funds held.",
    phases: [
      {
        num: "1",
        title: "PULL",
        desc: "Gateway signer triggers. Delegated amount pulled from the user's token account within approved limits.",
        path: "M13 10V3L4 14h7v7l9-11h-7z",
      },
      {
        num: "2",
        title: "SETTLE",
        desc: "Single CPI transfer: amount → recipient. Protocol fee (100 bps) + gateway fee split on-chain. No custody, no escrow.",
        path: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
      },
    ],
    code: `// PaymentPolicy execution — single CPI, on-chain fee split
const tx = await tributary.executePayment({
  policy: policyPda,
  gatewaySigner: gateway.keypair,
});

// → transfer(userAta, recipientAta, amount)
// → transfer(userAta, protocolFeeAta, amount * 100 / 10000)
// → transfer(userAta, gatewayFeeAta, gatewayBps)
// One signature. Permissionless. Non-custodial.`,
  },
  {
    id: "composable",
    label: "Full config",
    policy: "ComposablePolicy",
    badge: "NEXT",
    caption:
      "Same PULL primitive, different ROUTE. Validation runs before any token moves. The forward CPI is allowlisted and instruction-discriminator-locked; intermediate ATAs are force-emptied so nothing ever parks in the contract.",
    phases: [
      {
        num: "1",
        title: "PULL",
        desc: "Same delegated pull — the live primitive, unchanged. Value leaves the user account only within approved boundaries.",
        path: "M13 10V3L4 14h7v7l9-11h-7z",
      },
      {
        num: "2",
        title: "VALIDATE",
        desc: "Optional Lighthouse assertion runs FIRST. If the condition (price, balance, oracle) isn't met, nothing moves. No token leaves the account.",
        path: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286z",
      },
      {
        num: "3",
        title: "FORWARD + SETTLE",
        desc: "CPI into an allowlisted program with a locked instruction discriminator. Output is swept to recipient + fees; intermediate ATAs force-emptied.",
        path: "M13 7l5 5m0 0l-5 5m5-5H6",
      },
    ],
    code: `// ComposablePolicy — validate, then route
const assertion = lighthouse
  .tokenAccount(userAta)
  .amount(gte, 1_000_000)        // condition checked BEFORE any transfer
  .build();                       // fails closed: no token moves

const tx = await tributary.executeComposable({
  policy: composablePolicyPda,
  validation: assertion,          // runs first, gates everything below
  forward: {
    program: allowlistedProgramId,
    discriminator: LOCKED_BYTES,  // instruction-discriminator-locked
  },
});

// 1. validate (Lighthouse)   — abort if unmet
// 2. forward  (allowlisted)  — CPI into the routed program
// 3. settle   (sweep)        — recipient + protocol + gateway
// intermediate ATAs force-emptied; contract never holds a balance`,
  },
];

export default function HowComposableWorks() {
  const [active, setActive] = useState<"payment" | "composable">("payment");
  const flow = FLOWS.find((f) => f.id === active)!;
  const isLive = active === "payment";

  return (
    <div className="space-y-8">
      {/* Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="inline-flex border border-border">
          {FLOWS.map((f) => {
            const isActive = f.id === active;
            return (
              <button
                key={f.id}
                onClick={() => setActive(f.id)}
                className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span
                  className={`ml-2 text-[10px] font-mono ${
                    isActive
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {f.policy}
                </span>
                <span
                  className={`ml-2 text-[10px] font-mono ${
                    isActive
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {f.badge}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground italic">
          Same primitive, two configs.
        </p>
      </div>

      {/* Caption */}
      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
        {flow.caption}
      </p>

      {/* Flow diagram */}
      <div className="relative">
        <div
          className={`hidden md:block absolute top-8 ${
            flow.phases.length === 2
              ? "left-[25%] right-[25%]"
              : "left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)]"
          } h-px bg-gradient-to-r from-primary/10 via-primary/40 to-accent/40 pointer-events-none`}
        />
        <div
          className={`grid grid-cols-1 ${
            flow.phases.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
          } gap-6`}
        >
          {flow.phases.map((p) => (
            <div
              key={p.num}
              className="flex flex-col items-center text-center group"
            >
              <div
                className={`relative w-16 h-16 bg-card border ${
                  isLive
                    ? "border-accent/25 group-hover:border-accent/60 group-hover:bg-secondary"
                    : "border-primary/25 group-hover:border-primary/60 group-hover:bg-secondary"
                } flex items-center justify-center mb-5 z-10 transition-all duration-300`}
              >
                <svg
                  className={`w-7 h-7 ${
                    isLive ? "text-accent" : "text-primary"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={p.path}
                  />
                </svg>
                <span
                  className={`absolute -top-2 -right-2 w-5 h-5 ${
                    isLive ? "bg-accent text-white" : "bg-primary text-white"
                  } text-xs font-bold flex items-center justify-center`}
                >
                  {p.num}
                </span>
              </div>
              <h4 className="font-bold text-foreground mb-2 text-sm">
                {p.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Code */}
      <TerminalCard
        filename={isLive ? "execute_payment.ts" : "execute_composable.ts"}
        language="typescript"
        code={flow.code}
      />
    </div>
  );
}
