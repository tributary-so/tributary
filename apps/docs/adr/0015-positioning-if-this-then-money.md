# ADR-0014: Position Tributary as one primitive — "If This Then Money"

Date: 2026-06-26
Status: accepted

## Context

The landing page (`apps/landing`) presented Tributary as three things at once:
a v1 payments product, a v2 "composable automation layer," and a set of
protocol internals (PULL/WHEN/ROUTE). It spoke three overlapping vocabularies
("subscription/delegation/gateway", "self-driving money", "PaymentPolicy/
ComposablePolicy/CPI") and zig-zagged between eras every other section
(v2 hero → v1 mechanics → v2 primitive → v1 features → v1 developer story →
v2 DeFi routing). External observers reported the page as confusing —
"if-this-then-money, then payments, then DeFi integrations" with no coherent
spine.

A grilling session (see `CONTEXT.md`) resolved that the root cause was not
ordering or copy but an **unresolved domain identity**: the page had not
decided what Tributary _is_, so every section fought every other for the
noun.

## Decision

Position Tributary as **one primitive**, not a portfolio of products.

- **Identity:** Tributary is the rule-based money-moving primitive on Solana.
  A user delegates spending authority once; money then moves itself within
  rules the user defined. "Recurring payments" (v1) is not a separate product
  — it is the **minimal live configuration** of the one primitive
  (WHEN=schedule, PULL=any shape, ROUTE=wallet). "Composable" (v2) is not a
  separate product either — it is the same primitive with the WHEN and ROUTE
  knobs opened up. Open those two knobs and the same primitive composes.
- **Protagonist:** the landing page is written for the **DeFi-native
  builder/investor** — the persona for whom "primitive" is a meaningful word.
  The SaaS-biller and SDK-integrator personas are served downstream (checkout,
  app, docs), not by this page's headline voice.
- **Spine:** one Setup → Conflict → Resolution. Setup: stablecoins made money
  digital (~$300B on chain). Conflict: that money is **inert** — it only moves
  when a human signs, only to where they manually route it. Resolution:
  Tributary is the primitive that lets money **move itself**, within rules you
  set.
- **Motif:** **"If This Then Money"** is the canonical recurring handle. It is
  a literal grammar of the primitive (WHEN → PULL+ROUTE). "Self-driving money"
  is its gloss; "the primitive" is the technical noun underneath;
  **"composable automation layer" is retired** as a standalone noun (it is the
  two-products vocabulary).

## Structural consequences (for the rebuild)

- Payments becomes the **proof-beat inside the Resolution**, not a section
  family. The v1 payments-product sections (Developers, JWT checkout, "we're
  the rails" gateway pitch) leave the main page — they serve persona B
  (developers) via docs/app.
- The live/roadmap **two-tier split is dead**. The "LIVE TODAY / WHEN
  COMPOSABLE SHIPS" framing re-asserts two products and is replaced by an
  **ascending reveal**: minimal knob config live today, same primitive
  composes when WHEN + ROUTE open. Live/next status lives as micro-badges on
  the knobs, not as section architecture.

## Considered options

### Rejected: two products, lead with payments (persona A)

Maximises today's revenue (payments is where the 4,000-pull traction is), but
forces "If This Then Money" to be either a lie walked back two scrolls later
or removed entirely. The composable/DeFi half gets cut or buried. Rejected
because the identity was decided as one primitive, and a payments-first page
contradicts that identity at the headline.

### Rejected: lead with developers (persona B)

Possible, but developers do not adopt primitives in the abstract — they build
for persona A (merchants) or speculate like persona C (investors). B is a
means, not an end; a poor protagonist.

### Rejected: custody-friction or missing-infrastructure as the spine

Both are true supporting beats. "Non-custodial" is table stakes for persona C,
not a conflict — leading with it reads as defensive. "Missing infrastructure"
is an implementation grievance felt mainly by builders, not the broadly-felt
"inert money" pain. Both folded into the Resolution as properties rather than
leading as Setup.

### Rejected: "self-driving money" as the motif (over "If This Then Money")

Evocative and carries the autonomy/ROUTE axis well, but weaker as a recurring
handle — it describes the _outcome_ rather than the _grammar_. "If This Then
Money" is the grammar (WHEN → PULL+ROUTE) and scales from the live minimal
config to the full composable config in one sentence. "Self-driving money"
kept as the gloss, demoted from motif.

## Trade-offs accepted

- The landing page **stops being a direct payments-acquisition channel**. A
  SaaS founder landing here looking for "bill USDC monthly" gets routed to
  `checkout.tributary.so` / the app, not a guided pitch. Near-term payment
  signups attributable to this page are expected to slow; this is traded for
  protocol-narrative coherence and for attracting persona C (builders who
  create the products personas A and B then use).
- Live/roadmap honesty is carried in **copy and micro-badges** rather than
  section architecture, increasing the copy-edit burden to keep the two from
  drifting.

## References

- `CONTEXT.md` — the resolved domain glossary (primitive, three knobs, eras,
  motif, structural decisions).
- Grilling session, 2026-06-26.
