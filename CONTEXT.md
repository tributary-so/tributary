# Tributary — Domain Glossary

> The ubiquitous language for the Tributary protocol. Implementation-free.
> Resolved during the landing-page narrative grilling (2026-06-26).

## The core term

**Tributary** — A single primitive: the rule-based money-moving primitive on
Solana. A user delegates spending authority once; money then moves itself
within rules the user defined (a trigger condition, a value to pull, a
destination to route to).

Tributary is **one thing**, not a portfolio of products. Everything below is
an aspect of the same primitive.

## The three knobs (the primitive's axis model)

- **WHEN** — the trigger condition. The condition under which a pull is
  allowed to fire (schedule, oracle, balance, governance, custom logic).
- **PULL** — the value transfer. How much of what token is claimed from the
  delegated authority on a given pull (fixed, variable/usage-based,
  percentage, any token).
- **ROUTE** — the destination. Where the pulled value lands / what it flows
  through before settling (a wallet, a DEX swap, a lending deposit, staking,
  an LP, any allowlisted program).

A fully-specified movement of money = one WHEN × one PULL × one ROUTE.

## Eras of the same primitive

- **v1 (live)** — the PULL axis is live on mainnet. WHEN is schedule-only.
  ROUTE is wallet-only. This is what the market calls "recurring payments."
- **v2 (in development)** — WHEN and ROUTE open up to any condition / any
  allowlisted program. This is what internal docs call "composable."

**"Payments" is not a separate product.** It is the v1 instance of the
primitive — proof that PULL already executes (4,000+ pulls, six teams).
**"Composable" is not a separate product either.** It is the v2 instance —
the same primitive with two more knobs turned on.

## Recurring payments = the minimal configuration

"Regular recurring payments" is not an exception or a separate product —
it is the **simplest live configuration** of the one primitive:

- **WHEN** = on a schedule (the only live trigger axis)
- **PULL** = fixed / variable / percentage amount (fully live)
- **ROUTE** = wallet (the only live destination)

Open up WHEN (oracle/balance/governance/custom) and ROUTE (any allowlisted
program) and the _same_ primitive becomes the v2 "composable" layer. The
narrative consequence: payments is never "the other thing we do." It is the
proof-of-primitive — the minimal knob setting already running in production.

## Page protagonist

The landing page is written for the **DeFi-native builder / investor** — the
persona for whom "primitive" is a meaningful word. SaaS-biller and SDK-
integrator personas are served downstream (checkout, app, docs), not by this
page's headline voice.

## Narrative spine

One Setup → Conflict → Resolution, carried by protagonist C.

- **Setup:** Stablecoins made money digital, instant, global — ~$300B on
  chain.
- **Conflict (the spine):** That money is **inert**. It only moves when a
  human signs, and only to where that human manually routes it. No schedules,
  no conditions, no autonomy. "Money that can't act on its own is money that
  can't scale."
- **Resolution:** Tributary is the primitive that lets money **move itself**,
  within rules you set — one delegation, three knobs (WHEN/PULL/ROUTE),
  non-custodial. "If This Then Money" is a literal description of the
  Resolution, not a slogan.

Supporting beats (not rival setups): non-custodial is a _property_ of the
resolution, not the headline; "missing infrastructure" is an _implication_
felt mainly by builders, folded into the resolution rather than leading.

## Canonical motif (the recurring handle)

The page has **one motif**, used consistently from hero through knob-section
through CTA. It is the sticky handle that replaces the three-dialect mess.

- **"If This Then Money"** — the canonical motif. A literal grammar of the
  primitive: WHEN (If This) -> PULL+ROUTE (Then Money). Recurs in every beat.
  Scales from the live minimal config ("If Monday Then $10 to wallet") to the
  full config ("If oracle drifts 5% Then route to rebalance") -- same sentence,
  knobs turned up. One primitive maturing, not two products.
- **"self-driving money"** — the _gloss_ on the motif, used in sub-lines and
  one-line explainers. Evocative but subordinate.
- **"the primitive"** — the _technical noun_ underneath, used only where
  precision beats poetry (the knob section, dev-adjacent copy).
- **"composable automation layer"** — **retired** as a standalone noun (it is
  the two-products vocabulary). The adjective "composable" survives
  ("composable automation") but never as the _name of a product_.

## Structural decisions (for the rebuild)

- Payments is the **proof-beat inside Resolution**, not a section family. The
  v1 payments-product sections (Developers, JWT checkout, "we're the rails"
  gateway pitch) are persona-B plumbing and leave the main page.
- The live/roadmap **split is dead**. "LIVE TODAY / WHEN COMPOSABLE SHIPS"
  two-tier framing is replaced by an **ascending reveal**: minimal knob config
  live today, same primitive composes when WHEN + ROUTE open. Live/next status
  lives as micro-badges on the knobs, not as section architecture.

## Terms to retire / avoid (overloaded)

- **"the payment protocol for Solana"** — describes only v1; undersells the
  primitive. Stop using as the headline frame.
- **"composable" as a standalone noun** — invites the reading that there are
  two products. Only use as an adjective describing the v2 era of the one
  primitive.
- **"PaymentPolicy vs ComposablePolicy"** — internal/protocol vocabulary;
  fine for developer docs, wrong register for the landing page's headline
  story. They are two configurations of the same policy primitive.
