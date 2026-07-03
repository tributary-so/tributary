"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Mail,
  ShieldCheck,
  Network,
  Database,
  Layers,
  ChevronRight,
  TwitterIcon,
} from "lucide-react";
import FabianSchuhProfile from "@/components/futardio/cv";
import { FaTelegram } from "react-icons/fa6";

// ─── Table of Contents ──────────────────────────────────────────────────────
const TOC_ITEMS = [
  { id: "s01", num: "01", label: "Headline" },
  { id: "s02", num: "02", label: "Future" },
  { id: "s03", num: "03", label: "Why Now" },
  { id: "s04", num: "04", label: "Product" },
  { id: "s05", num: "05", label: "Why You" },
  { id: "s06", num: "06", label: "The Business" },
  { id: "s07", num: "07", label: "Ask" },
  { id: "s08", num: "08", label: "Closing" },
];

function TableOfContents() {
  const [active, setActive] = useState("s01");

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-15% 0px -75% 0px" },
    );
    TOC_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-8 space-y-0.5">
      {TOC_ITEMS.map((item) => (
        <a
          key={item.id}
          onClick={() => scrollToSection(item.id)}
          className={`flex items-center gap-2 py-1 text-xs transition-colors cursor:pointer hover:text-foreground ${
            active === item.id
              ? "text-foreground"
              : "text-foreground/30 hover:text-foreground/60"
          }`}
        >
          <span
            className={`font-mono ${active === item.id ? "text-primary" : ""} `}
          >
            {item.num}
          </span>
          <span className="uppercase tracking-widest">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

// ─── Chainsquad primitives ──────────────────────────────────────────────────
// Priority system: foreground = claim · /60 = proof · /40 = detail
// Fragments over sentences. Tables over paragraphs. Whitespace is structure.

function SectionHeader({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-2">
      <span className="text-xs font-mono text-foreground/40">{num}</span>
      <span className="text-xs tracking-[0.2em] uppercase font-medium text-foreground/60">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// Sub-part distinguisher within a merged group. Smaller than SectionHeader,
// marks each Lead-block as its own part of the section.
function Lead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-4">
      <span className="h-3 w-1 bg-primary/70" />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/70">
        {children}
      </h3>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text leading-none">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mt-2">
        {label}
      </div>
    </div>
  );
}

function Lede({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-8">
      <div className="w-0.5 bg-primary self-stretch shrink-0" />
      <p className="text-xl font-normal leading-snug tracking-tight text-foreground">
        {children}
      </p>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-border/60">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-2.5 text-foreground/40 font-medium tracking-wide text-[11px] uppercase border-b border-border">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-2.5 border-b border-border/40 align-top ${className}`}
    >
      {children}
    </td>
  );
}

// ─── 01 · Headline ──────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-20 pb-4">
      <p className="text-xs tracking-[0.3em] uppercase text-foreground/40 mb-6">
        Angel · Pre-Seed · $215K
      </p>
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
        <span className="text-foreground">Tributary.</span>
        <br />
        <span className="gradient-text">
          The rule-based money-moving primitive.
        </span>
      </h1>
      <p className="text-xl text-foreground/80 mt-8 font-medium leading-relaxed">
        Stop pushing your bags.{" "}
        <span className="gradient-text">Let them flow.</span>
      </p>
      <p className="text-lg text-foreground/60 mt-4 leading-relaxed">
        Crypto spent fifteen years winning the balance. It never built the flow.
        Every rail before Tributary is push-based — you sign, you send, repeat.
        The signature is the tax. Tributary is pull-based by construction: set
        the riverbed once, and money moves itself within rules you define —
        payments, swaps, stakes, yield. Non-custodial.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-14 py-8 border-y border-border">
        <Stat value="$316B" label="Stablecoins. Zero autonomy." />
        <Stat value="4,000+" label="Pulls on mainnet" />
        <Stat value="6+" label="Integrators. $0 marketing" />
        <Stat value="9" label="Systems shipped solo" />
      </div>

      <div className="flex flex-wrap gap-3 mt-8">
        <a
          href="https://tributary.so"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-6 py-3 transition-colors"
        >
          tributary.so <ArrowUpRight className="h-4 w-4" />
        </a>
        <a
          href="mailto:fabian@tributary.so"
          className="inline-flex items-center gap-2 border border-border hover:border-primary/50 text-foreground text-sm px-6 py-3 transition-colors"
        >
          <Mail className="h-4 w-4" /> Get in Touch
        </a>
      </div>
    </section>
  );
}
// ─── 02 · Future (quiet — context, not pitch) ───────────────────────────────
function Future() {
  return (
    <section className="py-20">
      <SectionHeader num="02" label="The Future" />
      <Lede>Money should move itself.</Lede>
      <p className="text-foreground/50 mt-6 leading-relaxed">
        Set the riverbed once, execute forever. Compose payments, investments,
        treasury — no custody. AI agents spend within guardrails. Three shifts
        landed at once: stablecoins won ($316B), Solana shipped a delegation
        primitive, DeFi became composable.
      </p>
      <p className="text-foreground mt-4">
        We build the company that lets money be a verb, not a noun.
      </p>
    </section>
  );
}

// ─── 03 · Why Now (quiet) ───────────────────────────────────────────────────
function WhyNow() {
  return (
    <section className="py-20">
      <SectionHeader num="03" label="Why Now" />
      <Lede>
        Every on-chain move needs a signature. Every signature needs a human.
        That is the tax.
      </Lede>
      <p className="text-foreground/50 mt-6 leading-relaxed">
        The wallet is a wheelbarrow — DCA, payroll, treasury are manual pushes
        or custodial bots holding your keys. No composability: a payment
        can&apos;t trigger staking; an oracle can&apos;t trigger a swap. Users
        want no custodian. Push money doesn&apos;t scale.
      </p>
      <p className="text-foreground mt-4">
        Pull, don&apos;t push — the protocol is literally pull-based.
      </p>
    </section>
  );
}

// ─── 04 · Product (Pivot · How it works · Risks) ────────────────────────────
function Product() {
  const risks: [string, string, string][] = [
    ["Technology — does the primitive work?", "RESOLVED", "Mainnet-proven."],
    [
      "Demand — will anyone use it?",
      "RESOLVED",
      "Organic, zero-churn inbound.",
    ],
    [
      "Execution — can the founder ship?",
      "RESOLVED",
      "Full stack shipped solo.",
    ],
    [
      "Custody — trust-failure exposure",
      "STRUCTURALLY ABSENT",
      "Non-custodial. No keys held.",
    ],
    [
      "Market — is the category real?",
      "INDEPENDENTLY VALIDATED",
      "Solana Foundation shipped the same primitive.",
    ],
    [
      "Composable routing — does CPI scale?",
      "PARTIALLY RETIRED",
      "Prototype operational · this round funds audit + mainnet.",
    ],
    [
      "Revenue — will fees materialize?",
      "NEXT — THIS ROUND",
      "Fee model live in code · needs composable volume.",
    ],
  ];
  return (
    <section className="py-20">
      <SectionHeader num="04" label="Product" />
      <Lede>The primitive&apos;s grammar: WHEN → PULL → ROUTE</Lede>

      <Lead>The Pivot</Lead>
      <div className="space-y-4">
        <div className="border-l-2 border-border pl-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mb-1">
            Stage 0 — Recurring Payments
          </p>
          <p className="text-foreground/70 text-sm">
            We've shipped subscriptions, milestones, pay-as-you-go payments.
            Full stack built solo: contract, SDKs, indexer, checkout, dashboard.
          </p>
        </div>
        <div className="border-l-2 border-secondary pl-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-primary mb-1">
            The lesson
          </p>
          <p className="text-foreground/70 text-sm">
            Integrators started hacking around the protocol boundary — using
            milstones for loan re-payments. Not being composable was a
            limitation!
          </p>
        </div>
        <div className="border-l-2 border-border pl-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mb-1">
            Stage 1 — this raise
          </p>
          <p className="text-foreground/70 text-sm">
            The minimal config → same primitive with the knobs turned up →
            autonomous money. Operational prototype.
          </p>
        </div>
      </div>

      <Lead>How It Works</Lead>
      <TableWrap>
        <tbody>
          <tr>
            <Td className="font-mono text-primary font-semibold w-24">WHEN</Td>
            <Td className="text-foreground/40 w-60">When execution happens</Td>
            <Td className="text-foreground/60">
              Time · Price · Balance · Oracle · Custom logic
            </Td>
          </tr>
          <tr>
            <Td className="font-mono text-primary font-semibold">PULL</Td>
            <Td className="text-foreground/40">How much moves</Td>
            <Td className="text-foreground/60">
              Fixed · Variable · Capped · Usage-based
            </Td>
          </tr>
          <tr>
            <Td className="font-mono text-primary font-semibold">ROUTE</Td>
            <Td className="text-foreground/40">Where it goes</Td>
            <Td className="text-foreground/60">
              Transfer · Swap · Stake · LP · Any approved program
            </Td>
          </tr>
        </tbody>
      </TableWrap>
      <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mt-6 mb-3">
        Feature → quantified benefit
      </p>
      <TableWrap>
        <tbody>
          <tr>
            <Td className="text-foreground font-medium">
              One approval instead of signing 1,000x
            </Td>
            <Td className="text-foreground/50">
              Support load drops to near-zero post-onboarding.
            </Td>
          </tr>
          <tr>
            <Td className="text-foreground font-medium">
              Non-custodial by construction
            </Td>
            <Td className="text-foreground/50">
              Limited access to user funds. 0$ TVL by design!
            </Td>
          </tr>
          <tr>
            <Td className="text-foreground font-medium">
              Composable, not closed
            </Td>
            <Td className="text-foreground/50">
              Network value compounds with use-cases.
            </Td>
          </tr>
        </tbody>
      </TableWrap>

      <Lead>Risks Retired</Lead>
      <TableWrap>
        <thead>
          <tr>
            <Th>Risk</Th>
            <Th>Status</Th>
            <Th>Evidence</Th>
          </tr>
        </thead>
        <tbody>
          {risks.map(([risk, status, evidence]) => {
            const resolved =
              status === "RESOLVED" ||
              status === "STRUCTURALLY ABSENT" ||
              status === "INDEPENDENTLY VALIDATED";
            return (
              <tr key={risk}>
                <Td className="text-foreground font-medium">{risk}</Td>
                <Td
                  className={
                    resolved
                      ? "text-emerald-500 font-semibold text-xs whitespace-nowrap"
                      : "text-primary font-semibold text-xs whitespace-nowrap"
                  }
                >
                  {resolved ? "✅ " : "◀ "}
                  {status}
                </Td>
                <Td className="text-foreground/50">{evidence}</Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </section>
  );
}

// ─── 05 · Why You ───────────────────────────────────────────────────────────
function WhyYou() {
  return (
    <section className="py-20">
      <SectionHeader num="05" label="Why You" />
      <Lede>Web3 veteran</Lede>
      <FabianSchuhProfile isDAORaise={false} showExits={false} />
    </section>
  );
}

// ─── 06 · The Business (Proof · Market · Moat · Model · GTM) ────────────────
function TheBusiness() {
  const cases = [
    {
      who: "Individual",
      title: "Spare-change investing",
      pain: "Manual investing takes effort most people won't give.",
      fix: "Round up every purchase. Pull the difference into yield automatically. Invisible wealth-building — needs continuous micro-pulls push payments can't do.",
    },
    {
      who: "Individual",
      title: "Inheritance without a lawyer",
      pain: "Billions in crypto lost every year — keys die with their owners.",
      fix: "Authorize an heir to claim after a countdown. Stay active, push the deadline. Go dark, they inherit. Non-custodial until death.",
    },
    {
      who: "Business",
      title: "Checkout that converts",
      pain: "Solana Pay gives merchants a QR code. That's it.",
      fix: "Upsells, subscriptions, order bumps, thank-you offers. The Web2 conversion playbook, on-chain. Merchants stop reinventing checkout.",
    },
    {
      who: "Business",
      title: "Escrow without trust",
      pain: "Every freelancer has been ghosted after delivery.",
      fix: "Funds escrowed on-chain, released as milestones verify. The contract is the escrow agent — non-custodial, instant, sub-cent fees.",
    },
    {
      who: "Community",
      title: "Group economies",
      pain: "Splitwise and Venmo exist because splitting bills is painful.",
      fix: 'Friends delegate to a shared pool. Expenses auto-split. Nobody chases anyone. The "you owe me $23" conversation disappears.',
    },
    {
      who: "AI agent",
      title: "Agent budgets",
      pain: "Agents that manage capital take custody (unsafe) or can't act (useless).",
      fix: "Approve a spending envelope. Agents pull within guardrails you define. Non-custodial, bounded, auditable.",
    },
  ];
  const layers = [
    {
      icon: ShieldCheck,
      n: "L1",
      title: "Structural lock-in",
      body: "One delegate per token account. Chain-enforced. Competitors can't win back users without a revoke.",
    },
    {
      icon: Network,
      n: "L2",
      title: "Network effects",
      body: "More integrators → more volume → more validation → more use-cases → more integrators.",
    },
    {
      icon: Database,
      n: "L3",
      title: "Proprietary data",
      body: "Every route generates fee/slippage data no competitor sees. Input to Stage 2 constraint optimization.",
    },
    {
      icon: Layers,
      n: "L4",
      title: "Flexibility",
      body: "Hundreds of businesses can be built with composability in stage 1. Made a bad choice, pick another!",
    },
  ];
  return (
    <section className="py-20">
      <SectionHeader num="06" label="The Business" />
      <Lede>
        Organic traction. A market beyond payments. A structural moat.
      </Lede>

      <Lead>Proof</Lead>
      <p className="text-foreground mb-6">
        <span className="font-bold">4,000+</span> payments ·{" "}
        <span className="font-bold">$12K+</span> transferred ·{" "}
        <span className="font-bold">$0</span> marketing. Pre-revenue,
        post-deployment, organic usage
      </p>
      <TableWrap>
        <tbody>
          <tr>
            <Td className="text-foreground/70 w-2/5">
              Inbound integrators (6+)
            </Td>
            <Td className="text-foreground/50">
              allowly, contribute.so, yumi, polycode, orquestra, p-link,
              fundwise, cashflow.fi, unseal.link
            </Td>
          </tr>
          <tr>
            <Td className="text-foreground/70">Recent Wins</Td>
            <Td className="text-foreground/50">
              $8k Superteam Grant, <br />
              🥇 $10K Credits (Adevar Labs),
              <br />
              🥉 Zerion AI Integration
            </Td>
          </tr>
        </tbody>
      </TableWrap>
      <p className="text-sm text-foreground/60 leading-relaxed self-center">
        <span className="text-foreground/80 font-medium">Zero churn.</span>{" "}
        Adopters expand usage — the pre-revenue equivalent of negative churn.
      </p>

      <Lead>Market</Lead>
      <p className="text-foreground/60 mb-6">
        <span className="text-foreground font-bold">$15.2B</span> stablecoins on
        Solana · <span className="text-foreground font-bold">$4.6B</span> DeFi
        TVL · <span className="text-foreground font-bold">$1.7B</span> daily DEX
        volume.
      </p>
      <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mb-4">
        Concrete pain → how the primitive solves it
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        {cases.map((c) => (
          <div key={c.title} className="bg-background p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-primary/70 mb-1.5">
              {c.who}
            </p>
            <p className="text-sm font-bold text-foreground mb-3">{c.title}</p>
            <p className="text-xs text-foreground/40 leading-relaxed mb-2">
              {c.pain}
            </p>
            <p className="text-xs text-foreground/65 leading-relaxed flex gap-2">
              <span className="text-primary shrink-0">→</span>
              <span>{c.fix}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-foreground/40 mt-4">
        Goal: own the riverbed underneath every flow.
      </p>

      <Lead>Moat</Lead>
      <p className="text-foreground/50 mb-4">
        "First mover" is marketing. This is a moat.
      </p>
      <div className="grid md:grid-cols-2 gap-px bg-border">
        {layers.map((l) => (
          <div key={l.n} className="bg-background p-5">
            <div className="flex items-center gap-2 mb-2">
              <l.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-mono text-foreground/40">
                {l.n}
              </span>
              <span className="text-sm font-bold text-foreground">
                {l.title}
              </span>
            </div>
            <p className="text-sm text-foreground/50 leading-relaxed">
              {l.body}
            </p>
          </div>
        ))}
      </div>

      <Lead>Model</Lead>
      <p className="text-foreground/50 mb-4">
        1% of every transaction. ~100% margin. No balance-sheet risk.
      </p>
      <div className="grid md:grid-cols-3 gap-px bg-border mb-6">
        <div className="bg-background p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-primary mb-1">
            Protocol fee
          </p>
          <p className="text-2xl font-bold text-foreground mb-1">1%</p>
          <p className="text-xs text-foreground/50">
            Every transaction. Auto-deposited to treasury.
          </p>
        </div>
        <div className="bg-background p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-primary mb-1">
            Gateway fees
          </p>
          <p className="text-sm font-bold text-foreground mb-1 mt-1">
            Operator spread
          </p>
          <p className="text-xs text-foreground/50">
            Every billing reseller on Solana = revenue source.
          </p>
        </div>
        <div className="bg-background p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-primary mb-1">
            No custody
          </p>
          <p className="text-2xl font-bold text-foreground mb-1">0 TVL</p>
          <p className="text-xs text-foreground/50">
            Scales with volume, not TVL.
          </p>
        </div>
      </div>
      <TableWrap>
        <thead>
          <tr>
            <Th>Scenario</Th>
            <Th>Monthly volume</Th>
            <Th>Protocol revenue</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td className="text-foreground/60">1 SaaS × 100 users × $10</Td>
            <Td className="text-foreground/40 font-mono">$10K</Td>
            <Td className="text-primary font-bold font-mono">$100/mo</Td>
          </tr>
          <tr>
            <Td className="text-foreground/60">15 such businesses</Td>
            <Td className="text-foreground/40 font-mono">$150K</Td>
            <Td className="text-primary font-bold font-mono">$1.5K/mo</Td>
          </tr>
          <tr>
            <Td className="text-foreground/60">50 businesses + DCA flows</Td>
            <Td className="text-foreground/40 font-mono">~$1M+</Td>
            <Td className="text-primary font-bold font-mono">$10K+/mo</Td>
          </tr>
        </tbody>
      </TableWrap>

      <Lead>Go-To-Market</Lead>
      <div className="grid md:grid-cols-3 gap-px bg-border mb-6">
        <div className="bg-background p-5">
          <p className="text-xs font-mono text-primary mb-1">Phase 1 · Now</p>
          <p className="text-sm font-bold text-foreground mb-1">
            Composable layer
          </p>
          <p className="text-xs text-foreground/50">
            Ship WHEN→PULL→ROUTE. Audit. Validate revenue.
          </p>
        </div>
        <div className="bg-background p-5">
          <p className="text-xs font-mono text-primary mb-1">Phase 2</p>
          <p className="text-sm font-bold text-foreground mb-1">
            Money automation
          </p>
          <p className="text-xs text-foreground/50">
            DCA, auto-stake, idle-capital automation.
          </p>
        </div>
        <div className="bg-background p-5">
          <p className="text-xs font-mono text-primary mb-1">Phase 3</p>
          <p className="text-sm font-bold text-foreground mb-1">
            Treasury & policy
          </p>
          <p className="text-xs text-foreground/50">
            B2B. Product revenue. Seed-round proof.
          </p>
        </div>
      </div>
      <p className="text-sm text-foreground/60 mb-2">
        <span className="text-foreground/80 font-medium">
          "Hey agent: Keep $X liquid. Deploy everything above on Meteora!"
        </span>
      </p>
    </section>
  );
}

// ─── 07 · Ask ───────────────────────────────────────────────────────────────
function Ask() {
  const funds = [
    [
      "Security audit (after $10K Adevar grant)",
      "$45K",
      "Enterprise + B2B gate. Ottersec-scoped.",
    ],
    [
      "Founder runway (12–18 mo)",
      "$90K",
      "Fabian ships the contract. ~$5–7K/mo.",
    ],
    [
      "DevRel contractor (6 mo)",
      "$45K",
      "Self-serve onboarding for 15+ integrators.",
    ],
    [
      "Legal & entity (GmbH/holdco)",
      "$15K",
      "Investor-ready structure for seed.",
    ],
    ["Infrastructure (18 mo)", "$20K", "RPC, indexer, hosting."],
  ];
  return (
    <section className="py-20">
      <SectionHeader num="07" label="The Ask" />
      <Lede>Raising to turn the minimal config into the full primitive.</Lede>
      <p className="text-4xl md:text-5xl font-bold text-foreground mb-2">
        Raising <span className="gradient-text">$215K.</span>
      </p>
      <p className="text-foreground/60 mb-10">
        18-month runway to seed. Flexible on structure.
      </p>
      <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mb-3">
        Use of funds — line-by-line
      </p>
      <TableWrap>
        <thead>
          <tr>
            <Th>Line item</Th>
            <Th>Amount</Th>
            <Th>Why</Th>
          </tr>
        </thead>
        <tbody>
          {funds.map(([item, amount, why]) => (
            <tr key={item}>
              <Td className="text-foreground/70">{item}</Td>
              <Td className="text-primary font-bold font-mono whitespace-nowrap">
                {amount}
              </Td>
              <Td className="text-foreground/40">{why}</Td>
            </tr>
          ))}
          <tr className="bg-primary/5">
            <Td className="text-foreground font-bold">Total</Td>
            <Td className="text-primary font-bold font-mono">$215K</Td>
            <Td className="text-foreground/60">18-month runway to seed</Td>
          </tr>
        </tbody>
      </TableWrap>
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mb-3">
          Milestones
        </p>
        <ol className="space-y-1.5 text-sm text-foreground/60">
          <li className="flex gap-3">
            <span className="font-mono text-primary/60 w-4">1.</span>Audit
            complete. barrier-to-entry cleared
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-primary/60 w-4">2.</span>
            Composable layer live on mainnet
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-primary/60 w-4">3.</span>15+
            integrations onboarded
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-primary/60 w-4">4.</span>Revenue
            validated ($1.5K–$10K/mo floor)
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-primary/60 w-4">5.</span>Treasury
            pipeline opened — seed proof
          </li>
        </ol>
      </div>
    </section>
  );
}

// ─── 08 · Closing ───────────────────────────────────────────────────────────
function Closing() {
  return (
    <section className="py-20">
      <SectionHeader num="08" label="Closing" />
      <Lede>Stablecoins built the balance. Tributary built the riverbed.</Lede>
      <p className="text-lg text-foreground/60 mb-4">
        Set the riverbed once. Money moves itself within rules you set.
      </p>
      <p className="text-base text-foreground/50 mb-12">
        <span className="gradient-text font-semibold">
          Stop pushing your bags. Let them flow.
        </span>
      </p>
      <div className="border-t border-border pt-6">
        <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mb-1">
          Contact
        </p>
        <p className="text-foreground font-medium">Fabian Schuh, Dr.-Ing.</p>
        <div className="flex flex-wrap gap-3 mt-3">
          <a
            href="mailto:fabian@tributary.so"
            className="inline-flex items-center gap-2 border border-border hover:border-primary/50 text-foreground text-sm px-5 py-2.5 transition-colors"
          >
            <Mail className="h-4 w-4" /> fabian@tributary.so
          </a>
          <a
            href="https://x.com/xer0c"
            className="inline-flex items-center gap-2 border border-border hover:border-primary/50 text-foreground text-sm px-5 py-2.5 transition-colors"
          >
            <TwitterIcon className="h-4 w-4" /> @xer0c
          </a>
          <a
            href="https://t.me/xeroc"
            className="inline-flex items-center gap-2 border border-border hover:border-primary/50 text-foreground text-sm px-5 py-2.5 transition-colors"
          >
            <FaTelegram className="h-4 w-4" /> @xeroc
          </a>
          <a
            href="https://tributary.so"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-border hover:border-primary/50 text-foreground text-sm px-5 py-2.5 transition-colors"
          >
            tributary.so <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Appendix ───────────────────────────────────────────────────────────────
function Appendix() {
  const a2Systems = [
    ["1", "Mainnet contract (Anchor)", "Core protocol logic"],
    ["2", "TypeScript SDK", "Program interaction"],
    ["3", "React component library", "Embedded checkout UI"],
    ["4", "Stripe-compatible SDK", "Web2 dev ergonomics"],
    ["5", "HTTP 402 middleware", "Machine-to-machine pay"],
    ["6", "API server (REST + WS + Kafka)", "Off-chain orchestration"],
    ["7", "Event indexer", "On-chain state sync"],
    ["8", "Hosted checkout", "No-code merchant path"],
    ["9", "Merchant dashboard", "Ops + analytics"],
  ];
  const a4Features = [
    "Non-custodial",
    "Auto-execution",
    "On-chain fee extraction",
    "Merchant SDKs",
    "Composable automation",
    "Multi-protocol routing",
    "Gateway layer",
  ];
  const a4matrix: Record<string, boolean[]> = {
    Helio: [false, false, false, false, false, false, false],
    "SF Subs": [true, true, false, false, false, false, false],
    Stripe: [false, true, false, true, false, false, false],
    Jupiter: [true, true, false, false, false, false, false],
  };
  const ladder = [
    [
      "STAGE 0",
      "Pull tokens on a schedule.",
      "✅ PROVEN",
      "4K+ payments, 6+ integrators",
    ],
    ["STAGE 1", "Route capital into DeFi.", "◀ NEXT", "DCA, idle-capital AUM"],
    ["STAGE 2", "Enforce constraints.", "⏳ FUTURE", "Treasury customers, B2B"],
    [
      "STAGE 3",
      "Decide where capital goes.",
      "⏳ FUTURE",
      "Intent policies, growing AUM",
    ],
    [
      "STAGE 4",
      "Manage capital autonomously.",
      "💰 SERIES A+",
      "AUM at scale, recurring revenue",
    ],
  ];

  return (
    <details className="mt-12 mb-12 group">
      <summary className="cursor-pointer pt-6 pb-2 select-none list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <ChevronRight className="h-4 w-4 text-foreground/40 group-open:rotate-90 transition-transform" />
          <p className="text-xs tracking-[0.3em] uppercase text-foreground/50 font-medium">
            Appendix
          </p>
        </div>
        <p className="text-xs text-foreground/40 mt-1 ml-7">
          Dense data. Summoned when the investor asks the hard question. Click
          to expand.
        </p>
      </summary>
      <div className="pt-4">
        {/* A1 */}
        <section className="py-12">
          <p className="text-xs font-mono text-foreground/40 mb-1">§A1</p>
          <h3 className="text-lg font-bold text-foreground mb-5">
            Market Sizing
          </h3>
          <TableWrap>
            <thead>
              <tr>
                <Th>Segment</Th>
                <Th>Basis</Th>
                <Th>TAM</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td className="text-foreground/60">SaaS billing</Td>
                <Td className="text-foreground/40">
                  ~5K businesses × $1.2K/yr
                </Td>
                <Td className="text-primary font-mono font-bold">$6M</Td>
              </tr>
              <tr>
                <Td className="text-foreground/60">DCA / idle capital</Td>
                <Td className="text-foreground/40">~2M holders × $50 × 1%</Td>
                <Td className="text-primary font-mono font-bold">$1B</Td>
              </tr>
              <tr>
                <Td className="text-foreground/60">DAO + startup treasury</Td>
                <Td className="text-foreground/40">
                  ~500 entities × $50K × 0.5%
                </Td>
                <Td className="text-primary font-mono font-bold">$12.5M</Td>
              </tr>
            </tbody>
          </TableWrap>
          <p className="text-xs text-foreground/40 mt-3">
            SAM (24-mo): ~$15M/yr. SOM (Y3): $150K–$450K/yr. Floors the seed
            narrative.
          </p>
        </section>

        {/* A2 */}
        <section className="py-12">
          <p className="text-xs font-mono text-foreground/40 mb-1">§A2</p>
          <h3 className="text-lg font-bold text-foreground mb-5">
            9 Production Systems
          </h3>
          <TableWrap>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Component</Th>
                <Th>Purpose</Th>
              </tr>
            </thead>
            <tbody>
              {a2Systems.map(([n, c, p]) => (
                <tr key={n}>
                  <Td className="font-mono text-foreground/40 w-8">{n}</Td>
                  <Td className="text-foreground/70">{c}</Td>
                  <Td className="text-foreground/40">{p}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="text-xs text-foreground/40 mt-3">
            All ✅ live. Test coverage &gt;95%. Shipped solo, zero external
            capital.
          </p>
        </section>

        {/* A3 */}
        <section className="py-12">
          <p className="text-xs font-mono text-foreground/40 mb-1">§A3</p>
          <h3 className="text-lg font-bold text-foreground mb-5">
            Trust Ladder — Full Roadmap
          </h3>
          <div className="border border-border/60">
            {ladder.map(([stage, trust, status, pmf]) => (
              <div
                key={stage}
                className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 items-center"
              >
                <div className="col-span-12 md:col-span-2">
                  <span className="font-mono text-sm font-bold text-foreground/70">
                    {stage}
                  </span>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <p className="text-foreground/50 text-sm italic">"{trust}"</p>
                  <p className="text-xs text-foreground/40 mt-0.5">{pmf}</p>
                </div>
                <div className="col-span-12 md:col-span-4 md:text-right">
                  <span
                    className={`text-xs font-bold uppercase tracking-[0.12em] ${
                      status.includes("PROVEN")
                        ? "text-emerald-500"
                        : status.includes("NEXT")
                          ? "text-primary"
                          : status.includes("SERIES")
                            ? "text-amber-500"
                            : "text-foreground/40"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-foreground/40 mt-3">
            No stage skipped. The ladder is the moat.
          </p>
        </section>

        {/* A4 */}
        <section className="py-12">
          <p className="text-xs font-mono text-foreground/40 mb-1">§A4</p>
          <h3 className="text-lg font-bold text-foreground mb-5">
            Competitive Matrix
          </h3>
          <div className="overflow-x-auto border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2.5 text-foreground/40 text-[11px] uppercase tracking-wide font-medium border-b border-border">
                    Feature
                  </th>
                  {["Helio", "SF Subs", "Stripe", "Jupiter"].map((h) => (
                    <th
                      key={h}
                      className="text-center px-4 py-2.5 text-foreground/40 text-[11px] uppercase tracking-wide font-medium border-b border-border"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="text-center px-4 py-2.5 text-primary text-[11px] uppercase tracking-wide font-medium border-b border-primary">
                    Tributary
                  </th>
                </tr>
              </thead>
              <tbody>
                {a4Features.map((feat, i) => (
                  <tr key={feat} className="border-b border-border/40">
                    <td className="px-4 py-2.5 text-foreground/70">{feat}</td>
                    <td className="px-4 py-2.5 text-center text-foreground/30">
                      {a4matrix.Helio[i] ? "✓" : "✗"}
                    </td>
                    <td className="px-4 py-2.5 text-center text-foreground/30">
                      {a4matrix["SF Subs"][i] ? "✓" : "✗"}
                    </td>
                    <td className="px-4 py-2.5 text-center text-foreground/30">
                      {a4matrix.Stripe[i] ? "✓" : "✗"}
                    </td>
                    <td className="px-4 py-2.5 text-center text-foreground/30">
                      {a4matrix.Jupiter[i] ? "✓" : "✗"}
                    </td>
                    <td className="px-4 py-2.5 text-center text-primary font-bold bg-primary/5">
                      ✓
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-foreground/40 mt-3">
            SF Subscriptions is a delegation primitive. Tributary is the same
            primitive with the ROUTE knob opened up.
          </p>
        </section>

        {/* A5 */}
        <section className="py-12">
          <p className="text-xs font-mono text-foreground/40 mb-1">§A5</p>
          <h3 className="text-lg font-bold text-foreground mb-5">
            Unit Economics
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mb-2">
                Path to $10K MRR
              </p>
              <div className="border border-border/60">
                {[
                  ["M0", "$0", "payments-only fee volume thin"],
                  ["M6", "~$500", "composable live, first DCA"],
                  ["M12", "~$2K", "15+ integrators"],
                  ["M18", "~$10K", "treasury pipeline, seed-ready"],
                ].map(([m, r, n]) => (
                  <div
                    key={m}
                    className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/40 last:border-b-0 items-center"
                  >
                    <div className="col-span-3 font-mono text-xs text-foreground/40">
                      {m}
                    </div>
                    <div className="col-span-3 text-primary font-bold font-mono text-sm">
                      {r}
                    </div>
                    <div className="col-span-6 text-xs text-foreground/40">
                      {n}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 mb-2">
                Margin
              </p>
              <p className="text-sm text-foreground/60 leading-relaxed">
                Effectively{" "}
                <span className="text-foreground/80 font-medium">100%</span> on
                protocol fees. No COGS — gas paid by executors. Infrastructure
                is fixed OpEx.
              </p>
              <p className="text-xs text-foreground/40 mt-4">
                1% protocol fee + gateway spread. No balance-sheet costs.
              </p>
            </div>
          </div>
        </section>

        {/* A6 */}
        <section className="py-12">
          <p className="text-xs font-mono text-foreground/40 mb-1">§A6</p>
          <h3 className="text-lg font-bold text-foreground mb-5">
            Security & Verification
          </h3>
          <TableWrap>
            <tbody>
              <tr>
                <Td className="text-foreground/60 w-2/5">Verified builds</Td>
                <Td className="text-foreground/40">Ottersec verified</Td>
              </tr>
              <tr>
                <Td className="text-foreground/60">Test coverage</Td>
                <Td className="text-foreground/40">&gt;95%</Td>
              </tr>
              <tr>
                <Td className="text-foreground/60">Adevar grant</Td>
                <Td className="text-foreground/40">$10K secured (partial)</Td>
              </tr>
              <tr>
                <Td className="text-foreground/60">Full audit scope</Td>
                <Td className="text-foreground/40">
                  Funded by this round ($45K)
                </Td>
              </tr>
            </tbody>
          </TableWrap>
        </section>
      </div>
    </details>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────
export default function TributaryAngelPitch() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-8">
      <div className="lg:grid lg:grid-cols-[170px_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <TableOfContents />
        </aside>
        <main>
          <div id="s01" className="scroll-mt-8">
            <Hero />
          </div>
          <div id="s02" className="scroll-mt-8">
            <Future />
          </div>
          <div id="s03" className="scroll-mt-8">
            <WhyNow />
          </div>
          <div id="s04" className="scroll-mt-8">
            <Product />
          </div>
          <div id="s05" className="scroll-mt-8">
            <WhyYou />
          </div>
          <div id="s06" className="scroll-mt-8">
            <TheBusiness />
          </div>
          <div id="s07" className="scroll-mt-8">
            <Ask />
          </div>
          <div id="s08" className="scroll-mt-8">
            <Closing />
          </div>
          <Appendix />
        </main>
      </div>
    </div>
  );
}
