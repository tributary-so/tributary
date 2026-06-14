"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Mail,
  TrendingUp,
  Building2,
  Landmark,
  CheckCircle2,
  Circle,
  CircleDot,
  ArrowRight,
  Lock,
  Target,
  Layers,
} from "lucide-react";
import FabianSchuhProfile from "@/components/futardio/cv";

function Divider() {
  return (
    <div
      className="font-mono text-sm text-muted-foreground/30 select-none"
      aria-hidden="true"
    >
      //
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
      {children}
    </p>
  );
}

// ─── Slide: Hero ─────────────────────────────────────────────────────────────
function SlideHero() {
  return (
    <section className="py-20">
      <div className="flex flex-col gap-6 max-w-4xl text-center lg:text-left lg:items-start">
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.3em]">
          Angel Round · Pre-Seed
        </p>
        <h1 className="text-3xl font-bold leading-snug tracking-tight md:text-4xl lg:text-5xl">
          <span className="text-foreground">
            Tributary is the non-custodial operating system
          </span>
          <br />
          <span className="gradient-text">for capital on Solana.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
          Every financial automation — DCA, idle-cash deployment, stop-losses,
          treasury management, autonomous allocation — is a different face of
          one primitive:
        </p>

        <div className="border border-border/50 bg-muted/10 px-6 py-4 max-w-2xl mx-auto lg:mx-0">
          <p
            className="text-center text-lg font-bold gradient-text"
            style={{ fontFamily: "var(--font-secondary, monospace)" }}
          >
            WHEN (condition) → PULL (amount) → ROUTE (to any on-chain program)
          </p>
        </div>

        <p className="text-sm text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
          We don't ask investors to bet on the end state. We resolve every risk{" "}
          <span className="text-foreground font-medium">stage by stage</span> —
          each one a complete product with its own PMF. Stage 0 is proven. This
          raise funds Stage 1. The venture category arrives when nothing about
          it is unproven.
        </p>

        <div className="flex flex-wrap gap-3 mt-2 justify-center lg:justify-start">
          <a
            href="https://tributary.so"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-5 py-2.5 transition-colors"
          >
            tributary.so
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <a
            href="mailto:fabian@tributary.so"
            className="inline-flex items-center gap-2 border border-border bg-background hover:bg-muted text-foreground text-sm px-5 py-2.5 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Get in Touch
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Slide: The Thesis ───────────────────────────────────────────────────────
function SlideThesis() {
  const risks = [
    {
      label: "Technology",
      q: "Does composable on-chain routing actually work?",
      stage: "Stage 1",
    },
    {
      label: "Execution",
      q: "Can this solo founder ship each layer?",
      stage: "Stage 1",
    },
    {
      label: "Trust",
      q: "Will users let non-custodial software manage real capital?",
      stage: "Stage 0–2",
    },
    {
      label: "Decision",
      q: "Can software make allocation decisions users accept?",
      stage: "Stage 3",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-10 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Thesis</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">
            Don't underwrite four risks at once.
          </span>
          <br />
          <span className="gradient-text">Resolve them sequentially.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Pitching "autonomous capital allocation" cold bundles technology,
          execution, trust, and decision risk into a single ask. We don't. Each
          stage ships a complete product with its own PMF — and de-risks the
          next one before we build it. By the venture round, the only open
          question is growth velocity.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
        {risks.map((r, i) => (
          <motion.div
            key={r.label}
            className="border border-border/50 bg-muted/10 p-5 space-y-2"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <div className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider">
              {r.stage}
            </div>
            <div className="text-sm font-bold text-foreground">
              {r.label} risk
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {r.q}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Slide: The Trust Ladder ─────────────────────────────────────────────────
function SlideLadder() {
  const rungs = [
    {
      stage: "STAGE 0",
      trust: "Pull tokens to a recipient on a schedule.",
      rung: "Non-custodial delegation itself.",
      status: "PROVEN",
      icon: CheckCircle2,
      color: "text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      badge: "bg-emerald-500/15 text-emerald-400",
    },
    {
      stage: "STAGE 1",
      trust: "Route your capital into DeFi on a schedule.",
      rung: "Automated execution across protocols.",
      status: "NEXT",
      icon: ArrowRight,
      color: "text-primary",
      border: "border-primary/40",
      bg: "bg-primary/5",
      badge: "bg-primary/15 text-primary",
    },
    {
      stage: "STAGE 2",
      trust: "Enforce constraints on your capital.",
      rung: "The system obeys limits you define.",
      status: "FUTURE",
      icon: CircleDot,
      color: "text-amber-400",
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      badge: "bg-amber-500/10 text-amber-400",
    },
    {
      stage: "STAGE 3",
      trust: "Decide where your capital goes.",
      rung: "Decision delegation within guardrails.",
      status: "FUTURE",
      icon: CircleDot,
      color: "text-purple-400",
      border: "border-purple-500/20",
      bg: "bg-purple-500/5",
      badge: "bg-purple-500/10 text-purple-400",
    },
    {
      stage: "STAGE 4",
      trust: "Manage your capital autonomously.",
      rung: "Full autonomous allocation — the venture category.",
      status: "VENTURE",
      icon: Target,
      color: "text-rose-400",
      border: "border-rose-500/30",
      bg: "bg-rose-500/5",
      badge: "bg-rose-500/15 text-rose-400",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-10 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Trust Ladder</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Five rungs. </span>
          <span className="gradient-text">No shortcuts.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Each stage asks users for a bigger commitment — unlocked by trust
          earned at the stage below. Competitors who jump straight to
          "autonomous finance" hit a trust wall. We climb it. The ladder is the
          moat.
        </p>
      </div>

      <div className="space-y-2 max-w-5xl mx-auto">
        {rungs.map((r, i) => (
          <motion.div
            key={r.stage}
            className={`flex flex-col sm:flex-row sm:items-center gap-3 border ${r.border} ${r.bg} px-5 py-4`}
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 sm:w-40 shrink-0">
              <r.icon className={`h-5 w-5 ${r.color} shrink-0`} />
              <span
                className="text-sm font-bold tracking-wider"
                style={{ fontFamily: "var(--font-secondary, monospace)" }}
              >
                {r.stage}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground italic">
                "Let us {r.trust}"
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.rung}</p>
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 ${r.badge} shrink-0 self-start sm:self-center`}
            >
              {r.status}
            </span>
          </motion.div>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground italic max-w-3xl mx-auto text-center lg:text-left lg:mx-0">
        You cannot ask users to outsource decisions (Stage 3) before they trust
        the system to obey constraints (Stage 2). The ladder is non-negotiable.
      </p>
    </section>
  );
}

// ─── Slide: Stage 0 — Proven ──────────────────────────────────────────────────
function SlideStage0() {
  const metrics = [
    { value: "4,000+", label: "Payments triggered" },
    { value: "$12K+", label: "Transferred" },
    { value: "6+", label: "Active integrations" },
    { value: "$0", label: "Marketing spend" },
  ];
  const proofs = [
    "Non-custodial pull-payment primitive works in production",
    "Users delegate pull authority to a protocol PDA",
    "Integrators build on the SDK without being asked",
    "Solo founder shipped a full protocol stack",
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <div className="flex items-center gap-3 justify-center lg:justify-start">
          <SectionLabel>Stage 0 — Recurring Payments Protocol</SectionLabel>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 bg-emerald-500/15 text-emerald-400">
            ✅ Proven
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">The trust foundation </span>
          <span className="gradient-text">already exists.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Three direct-transfer payment models — Subscription, Milestone,
          Pay-as-you-go. Non-custodial pull payments on Solana mainnet. Before
          anyone lets Tributary route capital into DeFi, they need to see it
          reliably move money between wallets at scale. We have that proof.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-4">
            Organic Traction · Zero Marketing
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                className="border border-border/50 bg-muted/10 px-4 py-4"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                viewport={{ once: true }}
              >
                <div className="text-2xl font-bold gradient-text">
                  {m.value}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  {m.label}
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Plus a{" "}
            <span className="text-foreground font-medium">
              $10K Adevar audit grant
            </span>{" "}
            secured. Inbound integrations: Allowly, Contribute.so, Yumi Finance,
            Polycode, Orquestra, p-link.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-4">
            What Stage 0 Proves
          </p>
          <ul className="space-y-2.5">
            {proofs.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2.5 text-sm text-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Slide: The Stages Ahead ──────────────────────────────────────────────────
function SlideStages() {
  const stages = [
    {
      n: "1",
      name: "Money Automation",
      sub: "DCA + Auto-Deploy",
      status: "NEXT",
      statusColor: "text-primary",
      pain: '"I keep forgetting to DCA." · "My USDC is sitting idle."',
      proves:
        "Technology risk resolved — composable routing works across real DeFi. Execution risk resolved — founder ships the hard layer.",
      infra: "ComposablePolicy, ForwardConfig, ALLOWED_FORWARD_PROGRAMS",
      isNext: true,
    },
    {
      n: "2",
      name: "Policy Engine",
      sub: "Constraint-Based Capital Allocation",
      status: "FUTURE",
      statusColor: "text-amber-400",
      pain: '"Keep $2K liquid." · "Never more than 20% to one LP." · "Stop-loss at -10%."',
      proves:
        "Trust rung climbed — system enforces constraints, not just schedules. First real product revenue (treasury fees, policy subscriptions).",
      infra: "ValidationConfig, Lighthouse assertions, oracle triggers",
      isNext: false,
    },
    {
      n: "3",
      name: "Intent Agent",
      sub: "Goals, Not Rules",
      status: "FUTURE",
      statusColor: "text-purple-400",
      pain: '"Grow my SOL holdings." · "Best risk-adjusted yield available." · "Save for my tax bill."',
      proves:
        "Decision risk resolved — software makes allocation decisions users accept, within Stage 2 guardrails.",
      infra: "Off-chain reasoning → policy creation → on-chain execution",
      isNext: false,
    },
    {
      n: "4",
      name: "Autonomous Capital",
      sub: "The Venture Category",
      status: "VENTURE",
      statusColor: "text-rose-400",
      pain: "Users specify objectives. System allocates, compounds, exits, re-enters — non-custodial, on Solana.",
      proves:
        "Large TAM, defensible moat (delegation lock-in + AUM), network effects, recurring revenue. This is where the platform becomes venture-scale.",
      infra: "Everything, operating continuously",
      isNext: false,
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-10 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Path</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Each stage is a product. </span>
          <span className="gradient-text">Each is a de-risking asset.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Nothing is throwaway. Nothing is a detour. The DCA user of Stage 1
          becomes the treasury customer of Stage 2 becomes the intent-policy
          user of Stage 3. Same user, deeper relationship, same infrastructure
          underneath.
        </p>
      </div>

      <div className="space-y-3 max-w-5xl mx-auto">
        {stages.map((s, i) => (
          <motion.div
            key={s.n}
            className={`border ${
              s.isNext
                ? "border-primary/40 bg-primary/5"
                : "border-border/50 bg-muted/10"
            } p-5`}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
              <div className="flex items-center gap-3 lg:w-56 shrink-0">
                <span
                  className="text-3xl font-bold text-muted-foreground/30"
                  style={{ fontFamily: "var(--font-secondary, monospace)" }}
                >
                  0{s.n}
                </span>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {s.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.sub}</div>
                </div>
              </div>

              <div className="flex-1 grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Painkiller
                  </div>
                  <p className="text-xs text-foreground italic leading-relaxed">
                    {s.pain}
                  </p>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    What it proves
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {s.proves}
                  </p>
                </div>
              </div>

              <div className="lg:w-20 shrink-0 flex lg:flex-col items-start gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-muted/30 ${s.statusColor}`}
                >
                  {s.status}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Slide: Cumulative De-Risking ────────────────────────────────────────────
function SlideDeRisking() {
  const rows = [
    {
      risk: "Does non-custodial delegation work?",
      resolved: "Stage 0",
      evidence: "4,000+ payments, 6 integrations, live mainnet",
      status: "resolved",
    },
    {
      risk: "Will users trust the primitive?",
      resolved: "Stage 0",
      evidence: "Organic adoption, zero marketing",
      status: "resolved",
    },
    {
      risk: "Does composable on-chain routing work?",
      resolved: "Stage 1",
      evidence: "Production DCA + auto-deploy across DeFi",
      status: "progress",
    },
    {
      risk: "Can the founder ship the hard layer?",
      resolved: "Stage 1",
      evidence: "v2 composable layer shipped and audited",
      status: "progress",
    },
    {
      risk: "Will users route into DeFi?",
      resolved: "Stage 1",
      evidence: "AUM flowing through composable path",
      status: "progress",
    },
    {
      risk: "Does constraint enforcement work live?",
      resolved: "Stage 2",
      evidence: "Policies firing through volatility",
      status: "future",
    },
    {
      risk: "Will users outsource constraint mgmt?",
      resolved: "Stage 2",
      evidence: "Treasury customers, retained policy users",
      status: "future",
    },
    {
      risk: "Can software make allocation decisions?",
      resolved: "Stage 3",
      evidence: "Intent policies with growing AUM",
      status: "future",
    },
  ];

  const statusMap: Record<
    string,
    { label: string; color: string; icon: typeof CheckCircle2 }
  > = {
    resolved: {
      label: "✅ Resolved",
      color: "text-emerald-400",
      icon: CheckCircle2,
    },
    progress: {
      label: "◀ In progress",
      color: "text-primary",
      icon: ArrowRight,
    },
    future: {
      label: "⏳ Future",
      color: "text-muted-foreground",
      icon: Circle,
    },
  };

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Cumulative De-Risking</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">By the venture round, </span>
          <span className="gradient-text">
            every risk is answered with data.
          </span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Each stage resolves a specific risk that the venture round would
          otherwise carry. The only question left at Stage 4 is market size and
          growth velocity. Everything else is proven.
        </p>
      </div>

      <div className="overflow-x-auto border border-border/50 bg-muted/10 max-w-5xl mx-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                Risk
              </th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium w-24">
                Resolved by
              </th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                Evidence
              </th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium w-32">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const s = statusMap[r.status];
              return (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-4 py-3 text-foreground font-medium">
                    {r.risk}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-mono text-muted-foreground"
                      style={{ fontFamily: "var(--font-secondary, monospace)" }}
                    >
                      {r.resolved}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.evidence}
                  </td>
                  <td className={`px-4 py-3 ${s.color} text-xs font-semibold`}>
                    {s.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Slide: The Wedge ─────────────────────────────────────────────────────────
function SlideWedge() {
  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Wedge</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">
            "Keep $X liquid. Everything above
          </span>
          <br />
          <span className="gradient-text">gets deployed automatically."</span>
        </h2>
      </div>

      <div className="border border-primary/30 bg-primary/5 px-6 py-5 max-w-3xl mx-auto mb-6">
        <p className="text-sm text-foreground leading-relaxed">
          This is the strongest wedge because the pain is universal — nearly
          every crypto user has idle SOL, USDC, or rewards. The ROI is
          measurable. The value proposition is immediate: set it once, benefit
          forever. It spans retail and B2B. And it's a trust escalation gateway.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
        {[
          {
            icon: TrendingUp,
            title: "Universal pain",
            desc: "Every crypto user has idle capital",
          },
          {
            icon: Target,
            title: "Measurable ROI",
            desc: "Users see yield appearing",
          },
          {
            icon: Lock,
            title: "Immediate value",
            desc: "Set once, benefit forever",
          },
          {
            icon: Layers,
            title: "Escalation gateway",
            desc: "Yield → policies → intents",
          },
        ].map((w, i) => (
          <motion.div
            key={w.title}
            className="border border-border/50 bg-muted/10 p-4 space-y-2"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <w.icon className="h-5 w-5 text-primary" />
            <div className="text-sm font-bold text-foreground">{w.title}</div>
            <div className="text-xs text-muted-foreground leading-snug">
              {w.desc}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground italic max-w-3xl mx-auto text-center lg:text-left lg:mx-0">
        DCA gets them in the door. Auto-deploy gets their capital flowing. That
        capital flow is the moat — every dollar routed through Tributary's
        composable layer generates fee data, proves the tech, deepens trust.
      </p>
    </section>
  );
}

// ─── Slide: Stage 2 Markets ───────────────────────────────────────────────────
function SlideMarkets() {
  const markets = [
    {
      icon: TrendingUp,
      who: "Retail crypto holders",
      sub: "Personal wealth automation",
      why: "Idle capital + risk management",
      analog: "Wealthfront / Betterment",
    },
    {
      icon: Building2,
      who: "Crypto-native startups",
      sub: "Startup treasury",
      why: "Founders don't want to manage DeFi",
      analog: "Brex / Stripe Treasury",
    },
    {
      icon: Landmark,
      who: "DAOs",
      sub: "DAO treasury",
      why: "Stables/SOL sitting idle",
      analog: "No good on-chain solution exists",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Stage 2 — Where Revenue Becomes Real</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Three sub-markets. </span>
          <span className="gradient-text">Each independently large.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Stage 2 is where Tributary stops being "a protocol with features" and
          becomes a capital management layer. The leap from transaction
          automation (a feature) to constraint-based capital management (a
          platform). This is where a seed round becomes fundable on its own
          merits.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {markets.map((m, i) => (
          <motion.div
            key={m.sub}
            className="border border-border/50 bg-muted/10 p-5 space-y-3"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <m.icon className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {m.sub}
              </div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {m.who}
              </div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {m.why}
            </div>
            <div className="text-xs gradient-text font-medium pt-2 border-t border-border/30">
              Analog: {m.analog}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Slide: Funding Sequencing ───────────────────────────────────────────────
function SlideFunding() {
  const rounds = [
    {
      stage: "PRE-SEED",
      amount: "<$250K",
      purpose: "Ship v2 composable layer + security audit",
      gates: "Audit complete · composable layer in production",
      narrative: "This raise",
      current: true,
    },
    {
      stage: "SEED",
      amount: "$1–3M",
      purpose: "Build Stage 2 (policy engine, treasury)",
      gates: "Active DCA policies · idle-capital AUM",
      narrative: '"Capital management layer on Solana"',
      current: false,
    },
    {
      stage: "SERIES A",
      amount: "$5–15M",
      purpose: "Build Stage 3 (agent) + scale Stage 2",
      gates: "Treasury customers · retained policy revenue",
      narrative: '"Agentic asset management for on-chain capital"',
      current: false,
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Funding Sequencing</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Each raise is gated </span>
          <span className="gradient-text">by PMF proof below it.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          The pre-seed is the right move right now — but not as the endgame.
          It's the first rung of the ladder. The endgame is Series A at Stage 4
          with three proven PMFs behind it.
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-0 border border-border/50">
          {rounds.map((r, i) => (
            <motion.div
              key={r.stage}
              className={`p-5 border-r border-border/30 last:border-r-0 ${
                r.current ? "bg-primary/5 border-primary/30" : ""
              }`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs font-bold tracking-wider text-muted-foreground"
                  style={{ fontFamily: "var(--font-secondary, monospace)" }}
                >
                  {r.stage}
                </span>
                {r.current && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 bg-primary/15 text-primary">
                    You are here
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold gradient-text mb-3">
                {r.amount}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Purpose
                  </div>
                  <div className="text-xs text-foreground leading-snug">
                    {r.purpose}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Gates
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    {r.gates}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Narrative
                  </div>
                  <div className="text-xs text-foreground italic leading-snug">
                    {r.narrative}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Slide: The Ask ───────────────────────────────────────────────────────────
function SlideAsk() {
  const allocation = [
    {
      pct: "~30%",
      label: "Security Audit",
      desc: "Enterprise-ready contract. Adevar grant covers partial.",
    },
    {
      pct: "~27%",
      label: "Composable Layer",
      desc: "Ship WHEN→PULL→ROUTE. Payment protocol → composable platform.",
    },
    {
      pct: "~27%",
      label: "Growth & Adoption",
      desc: "SDK improvements, integration guides, self-hosting.",
    },
    {
      pct: "~16%",
      label: "Operations",
      desc: "Infrastructure, legal, liquidity pool.",
    },
  ];

  const milestones = [
    {
      month: "M3",
      label: "Audit complete",
      signal: "Enterprise-ready contract",
    },
    {
      month: "M6",
      label: "Composable layer live",
      signal: "First non-payment products shipping",
    },
    {
      month: "M9",
      label: "15+ integrations",
      signal: "Recurring protocol revenue visible",
    },
    {
      month: "M12",
      label: "Seed on real metrics",
      signal: "Composable volume growing · ecosystem emerging",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Ask</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Raising </span>
          <span className="gradient-text">&lt;$250K pre-seed.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          The protocol is built. The market is validated. 4,000+ payments prove
          the primitive works. This raise completes the audit, ships the
          composable layer, and validates recurring protocol revenue —
          de-risking the seed round on real metrics, not promises.
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-8 max-w-5xl mx-auto">
        {allocation.map((a, i) => (
          <motion.div
            key={a.label}
            className="border border-border/50 bg-muted/10 p-4"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <div className="text-2xl font-bold gradient-text">{a.pct}</div>
            <div className="text-sm font-bold text-foreground mt-1">
              {a.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-snug">
              {a.desc}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">
          12-Month Arc
        </p>
        <div className="grid sm:grid-cols-4 gap-0 border border-border/50">
          {milestones.map((m, i) => (
            <motion.div
              key={m.month}
              className={`p-4 border-r border-border/30 last:border-r-0 ${
                i === milestones.length - 1
                  ? "border-primary/30 bg-primary/5"
                  : ""
              }`}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-xs font-mono text-muted-foreground/50">
                {m.month}
              </div>
              <div className="text-sm font-bold text-foreground mt-1">
                {m.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {m.signal}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Slide: Team ─────────────────────────────────────────────────────────────
function SlideTeam() {
  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3">
        <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
          Team
        </p>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Fabian Schuh </span>
          <span className="gradient-text">Dr.-Ing.</span>
        </h2>
      </div>
      <FabianSchuhProfile />
    </section>
  );
}

// ─── Slide: Vision + CTA ──────────────────────────────────────────────────────
function SlideCTA() {
  return (
    <section className="py-16">
      <div className="border border-border bg-muted/20 p-8 sm:p-12 text-center">
        <motion.p
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          The Venture Thesis
        </motion.p>
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-6 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
        >
          Tributary reaches venture scale
          <br />
          <span className="gradient-text">
            by climbing a trust ladder — not betting on a single product.
          </span>
        </motion.h2>
        <motion.p
          className="mb-10 text-muted-foreground max-w-2xl mx-auto text-[15px] leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          viewport={{ once: true }}
        >
          Stage 0 earned trust in delegation. Stage 1 earns trust in DeFi
          routing. Stage 2 earns trust in constraint enforcement and opens
          product revenue. Stage 3 earns trust in decision delegation. Stage 4 —
          autonomous capital management — is where the platform becomes
          venture-scale.
          <br />
          <br />
          <span className="text-foreground font-medium">
            By then every risk has been resolved with data. Investors fund
            scaling, not speculation.
          </span>
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <a
            href="mailto:fabian@tributary.so"
            className="inline-flex items-center gap-2 border border-border bg-background hover:bg-muted text-foreground text-sm px-6 py-3 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Get in Touch
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TributaryAngelPitch() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      <SlideHero />
      <Divider />
      <SlideThesis />
      <Divider />
      <SlideLadder />
      <Divider />
      <SlideStage0 />
      <Divider />
      <SlideStages />
      <Divider />
      <SlideDeRisking />
      <Divider />
      <SlideWedge />
      <Divider />
      <SlideMarkets />
      <Divider />
      <SlideFunding />
      <Divider />
      <SlideAsk />
      <Divider />
      <SlideTeam />
      <Divider />
      <SlideCTA />
    </main>
  );
}
