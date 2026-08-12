# Tributary

> **Money should move itself.**

Tributary is one rule-based money-moving primitive on Solana. A user delegates
spending authority once; money then moves itself within rules the user set — a
trigger condition, a value to pull, a destination to route to. Non-custodial,
permissionless, composable. Live on mainnet.

It is **one thing**, not a portfolio of products. Every surface below is an
aspect of the same primitive, carried by the motif:

> **If This Then Money.**
>
> _Stop pushing your bags. Let them flow._

**Program ID:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

---

## The antagonist — push money

Crypto spent fifteen years winning the **balance** — money that exists
on-chain. It never built the **flow**. So every bag still needs a hand on it:
sign, push, sign, push. The real economy runs on pull — direct debits,
recurring billing, payroll splits, automated savings, stop-losses — and none
of it works on-chain when every move needs a fresh signature.

The signature is the tax. The wallet is a wheelbarrow. **Push is the villain.**

Tributary is, architecturally, a **pull-payment** primitive: delegate a puller
once, the puller draws on rules. The antagonist (push) and the architecture
(pull) are the same word — "pull, don't push" is the technical handle; "stop
pushing your bags" is the defiant handle. Same idea, two registers.

---

## The primitive — one thing, three knobs

A fully-specified movement of money is one **WHEN × PULL × ROUTE**.

| Knob      | Meaning            | Open-ended question it answers          |
| --------- | ------------------ | --------------------------------------- |
| **WHEN**  | The trigger        | _Under what condition may a pull fire?_ |
| **PULL**  | The value transfer | _How much of what token is claimed?_    |
| **ROUTE** | The destination    | _Where does the pulled value land?_     |

Turn the knobs and the same primitive composes into anything from "If Monday
Then \$10 to wallet" to "If oracle drifts 5% Then route to rebalance." One
primitive maturing — not two products.

---

## Two configurations, one primitive

The protocol exposes two policy namespaces that share one schedule engine,
one `UserPayment` delegation account, one gateway/fee model, and one fee math.

- **PaymentPolicy** — the minimal configuration. **WHEN** = schedule, **PULL**
  = fixed/variable/usage-based, **ROUTE** = wallet. The program pulls tokens
  from the user's account straight to the recipient in a single step. This is
  what the market calls "recurring payments" — the proof-of-primitive, already
  running in production.
- **ComposablePolicy** — the same primitive with **WHEN** and **ROUTE**
  turned on. The program pulls into a transient intermediate account, may run
  a read-only validation gate, may run a forward transform (swap / deposit),
  then settles to the recipient. Internal docs call this "composable"; it is
  the same primitive with two more knobs lit up.

"Payments" is not a separate product — it is the v1 instance. "Composable" is
not a separate product either — it is the v2 instance. Both are the primitive
at different knob settings.

---

## Status — all three axes are live

Tributary matures along the knobs, not along a feature checklist. Each era
turns on another axis of the same primitive.

- **PULL axis — live on mainnet.** Three schedule models (Subscription,
  Milestone, Pay-as-you-go) fully implemented and proven. 4,000+ pulls across
  six teams, zero marketing spend.
- **WHEN + ROUTE axes — live on mainnet.** The composable layer has shipped.
  A pull may now be gated by any allowlisted on-chain condition (Lighthouse
  assertions today) and routed through any allowlisted program (Meteora DLMM
  swaps today, more tomorrow). Permissionless execution via
  parameter-constrained schedulers.
- **Next — deeper ROUTE & WHEN.** Additional allowlisted forward and
  validation programs, revenue splitting (pull once, route to N recipients),
  chained validation, cross-protocol integration (encrypted trigger prices,
  multi-hop routes).

Two further schedule variants — **OneTime** (single fixed execution) and
**UpTo** (single-use, time-bound variable-amount authorization) — extend the
PULL axis for one-shot and HTTP-402 settlement flows.

---

## The schedule models (PULL axis)

Both policy configurations reuse the same `PolicyType` enum. Each variant is a
different answer to "how does the amount and timing of a pull get decided?"

- **Subscription** — fixed amount on a fixed cycle, optionally auto-renewing
  up to a cap. _When to use:_ SaaS licenses, memberships, recurring donations,
  retainers, protocol fees.
- **Milestone** — up to four `(amount, timestamp)` pairs held in escrow,
  released by a release-condition bitmap (due-date, gateway/owner/recipient
  sign-off). _When to use:_ freelance and consulting contracts, grant
  tranches, content series, phased deliverables.
- **Pay-as-you-go** — usage-based: each pull claims up to a chunk cap, bounded
  by a per-period cap that resets automatically. The only variant that
  accepts a caller-supplied amount at execute time. _When to use:_ AI agents,
  LLM/API billing, compute/storage/bandwidth, anything metered.
- **OneTime** — fixed amount, fires exactly once, then completes. Full gateway
  lifecycle (pausable, deletable, schedulable, composable hooks). Not the
  standalone `transfer` instruction — a real policy.
- **UpTo** — single-use, time-bound authorization to pull _up to_ a max; the
  actual settled amount is caller-supplied at execute time. The x402 `upto`
  primitive — settle what was actually used, once.

---

## The composable hooks (WHEN + ROUTE axes)

A composable policy may run two **optional** hooks between the pull and
settlement. Both are opt-in via sentinels; both target programs are
hard-allowlisted on-chain.

- **Validation** — a read-only assertion that can veto the pull before any
  token moves. The sluice gate: it opens or shuts the flow. Today:
  **Lighthouse** on-chain assertions (balance thresholds, oracle ranges,
  account-state checks). Failure is a clean revert — no partial execution,
  no funds moved.
- **Forward** — a token transform that runs against the pulled input before
  settlement. A tributary joining a river: one stream becomes another. Today:
  **Meteora DLMM** swaps (pull USDC, deliver WSOL). Byte-range checks pin the
  forward instruction so a gateway cannot swap in an arbitrary call.

Three settlement shapes fall out of how the knobs are set:

- **Deliver, no transform** — same-mint topup (forward disabled). The classic
  subscription / pay-as-you-go flow.
- **Deliver, transform** — the forward swaps input into a delivery token,
  swept to the recipient (pull USDC, deliver SOL).
- **Act** — the forward consumes input and delivers value _outside_ Tributary's
  intermediates (e.g. increasing collateral in a lending program). No output
  token, no delivery sweep; the owner's post-validation is the only floor.

> The HOW lives in [`README.md`](./README.md) ( structs, PDAs, execution
> flow, fee math, SDK code ) and [`apps/docs/adr/`](./apps/docs/adr/) ( the
> _why_ behind every locked decision ). This document stays on the WHAT and
> the WHY.

---

## Use cases

The three knobs compose into a wide field of verticals. Third parties build
these on top of the primitive; Tributary earns the protocol fee on every flow.
A fuller exploration lives in the project vault (`27.Tributary/27.08
Use-cases`); the high-signal set:

### Infrastructure & B2B

- **Pay-per-use SaaS** (PayAsYouGo) — metered billing for API calls, trades,
  queries; replaces flat subscriptions.
- **Onchain payroll network** (all models) — auto-route salaries, taxes,
  savings, benefits; network effects between employers and employees.
- **Autonomous treasury management** (all models) — Mercury/Ramp/Brex for
  crypto orgs: auto-classify, route, secure, and audit treasury flows.
- **x402 / HTTP 402** (PayAsYouGo, Subscription) — payment-required middleware
  for API access, JWT-gated, with token/compute/usage metering built in.
- **Open-source usage funding** (PayAsYouGo) — per-install / per-query funding
  for OSS maintainers.
- **Revenue routing rails** (all models) — creator/protocol revenue auto-splits
  to contributors, treasury, and causes.

### AI & automation

- **Autonomous AI agents** (PayAsYouGo, Subscription) — agents spend within
  delegated budgets; pay for compute, APIs, microtasks. "Stripe for agents."
- **AI companions** (PayAsYouGo, Subscription) — ongoing metered spending for
  agent-hosted services.
- **Internet organisms** (all models) — autonomous economic agents that
  sustain themselves via pulls.
- **Human attention leasing** (PayAsYouGo) — programmatic payment for
  attention and engagement.

### Consumer finance

- **The internet salary** (PayAsYouGo + Subscription) — a living-wage stream
  from many internet sources, continuously re-allocated across savings,
  investments, insurance, and spending.
- **Income waterfall** (all models) — incoming income auto-splits to
  tax/savings/investments/spending by priority rules.
- **Spare-change investing** (PayAsYouGo) — round-up transactions,
  auto-invest the difference (Acorns on-chain).
- **Gamified auto-DCA** (PayAsYouGo, Subscription) — schedule-based
  dollar-cost averaging with game mechanics.
- **Family banking** (Subscription, PayAsYouGo) — allowances, spending caps,
  merchant whitelists, graduated autonomy for children.
- **Personal constitutions** (all models) — self-imposed financial rules
  enforced on-chain.

### DeFi & trading

- **Conditional rebalancing** (composable) — "if hot-wallet balance below
  threshold, pull USDC and route WSOL to treasury." Same primitive, WHEN +
  ROUTE on.
- **Auto-LP / auto-compound** (composable) — "add \$500/month to the USDC-SOL
  pool"; "when USDC balance > \$1K, swap excess to SOL."
- **Private stop-loss / on-chain limit orders** (composable + validation) —
  oracle-gated, MEV-blind, no keeper, no CEX.
- **Self-defending tokens & wallet guardian** (composable) — positions that
  auto-execute defensive or optimizing actions on conditions.
- **DCA investing** (composable) — "swap \$100 USDC → SOL every Monday."

### Commerce & payments

- **Checkout pages** (Subscription, PayAsYouGo) — hosted checkout for
  merchants.
- **Stream-to-own commerce** (Milestone, Subscription) — pay-over-time until
  ownership transfers.
- **Milestone escrow marketplace** (Milestone) — freelance/project escrow with
  milestone releases.
- **Frictionless arcade / gacha / vending** (PayAsYouGo) — per-play,
  continuous-metered commerce.
- **Action codes** — one-time wallet-less payment codes.

### Social & community

- **Autonomous charitable giving** (all models) — donate a % of gains, or \$X
  at portfolio targets.
- **Economic clans / cultos** (all models) — group economies with shared
  rules and treasuries.
- **Social commitment contracts** (all models) — on-chain pledges with
  stake-like enforcement.
- **Dead man's switch / digital afterlife** (composable) — heirs inherit if a
  wallet goes quiet; never give up keys.

---

## Why now

~\$300B of stablecoins lives on-chain — digital, instant, global — and almost
all of it is **inert**. The balance was won; the flow was never built. Every
web2 money behavior that depends on pull (which is most of them) either doesn't
exist on-chain or is rebuilt badly, per-app, with custody.

The Solana Foundation validated the thesis by shipping its own subscription
delegation primitive (with Helius, Dynamic, Mesh). That is one road. Tributary
is the logistics network on top — the same delegation model generalized into a
composable three-knob primitive. Recurring payments is the smallest thing it
does; the same primitive with the knobs turned is autonomous capital.

---

## Business model

Tributary earns as a **share of the gateway fee**, not as an independent
line item. There is exactly one fee per flow — `gateway_fee_bps`, set by
the gateway authority — and it is decomposed into carve-outs at settle
time (ADR-0018):

- **Gateway fee** — the single economic knob. Set by each gateway
  operator; the gateway is the merchant/acquirer layer, Tributary is the
  rail.
- **Protocol cut** — a fixed **share of the gateway fee** (default 20%
  via the global `protocol_share_bps`), not a standalone bps-of-payment.
  No absolute floor: the protocol earns in proportion to whatever a
  gateway charges. A per-gateway admin-granted override
  (`FEATURE_CUSTOM_PROTOCOL_FEE`) may lower it to zero to subsidize a
  strategic partner.
- **Scheduler cut** — a per-gateway share of the gateway fee, paid
  on-chain to whoever executes the pull. This is the incentive that makes
  permissionless execution real (ADR-0016): a third-party scheduler has an
  economic reason to crank a payment.
- **Referral program** — gateways opt into a 3-tier referral reward pool
  carved from the gateway fee (split across direct / level-2 / level-3),
  scoped per gateway.
- **No custody, no TVL, no balance-sheet exposure.** Funds never leave user
  wallets; only SPL delegation is used. \$0 counterparty risk by design.

---

## Competitive landscape

### Direct — recurring payments on-chain

| Solution        | Custody               | Schedule models                     | Composable (WHEN+ROUTE) | Solana-native | Status        |
| --------------- | --------------------- | ----------------------------------- | ----------------------- | ------------- | ------------- |
| **Tributary**   | Non-custodial         | 5 (Sub/Milestone/PAYG/OneTime/UpTo) | Yes (Lighthouse + DLMM) | Yes           | v1 + v2 live  |
| Helio           | Custodial             | 1 (subscription)                    | No                      | Yes           | Custody risk  |
| Superfluid      | Non-custodial         | 1 (streaming)                       | No                      | No (EVM)      | Wrong chain   |
| Sablier         | Non-custodial         | 1 (streaming)                       | No                      | No (EVM)      | Wrong chain   |
| Access Protocol | Non-custodial (stake) | content gating                      | No                      | Yes           | Lock-up model |
| Manual          | Manual                | limited                             | No                      | No            | Status quo    |

Streaming ≠ billing: Superfluid/Sablier move money continuously, which is the
wrong shape for subscriptions, milestones, and usage metering.

### Adjacent — could build this, probably won't

| Player                      | Why they could                                                 | Why they likely won't                                                                                   |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Stripe (via Bridge)         | Owns the web2 subscription playbook; bought Bridge for stables | Fiat-first DNA. Non-custodial, permissionless, Solana-native contradicts their custody-dependent model. |
| Circle (USDC)               | Largest stablecoin issuer on Solana                            | Issuer, not protocol company. Incentives align with USDC _usage_, not owning the payment layer.         |
| Jupiter                     | Dominant Solana DEX; runs scheduled DCA                        | DCAs are investment flows, not billing. Different UX, different legal shape, different product.         |
| Squads                      | \$10B+ TVL multisig; Grid stablecoin treasury                  | Access-control layer, not payments. Likely integrator, not builder.                                     |
| Coinbase Commerce / MoonPay | Merchant relationships, fiat bridges                           | Custodial by nature — "we handle the crypto complexity" is the opposite of a non-custodial protocol.    |
| Helius / Triton / RPCs      | Deep Solana infra                                              | Sell pickaxes, not mines. Payment protocol is a different business.                                     |

### Complementary — smart-wallet infrastructure

| Solution | Solves                                | Relation to Tributary                                          |
| -------- | ------------------------------------- | -------------------------------------------------------------- |
| Squads   | _who_ can authorize (M-of-N multisig) | Squads vault + Tributary scheduling = DAO recurring payments   |
| LazorKit | consumer auth (passkey, gasless)      | LazorKit passkey + Tributary = gasless consumer subscriptions  |
| Swig     | roles, cross-chain identity           | Swig roles + Tributary pay-as-you-go = scoped AI-agent billing |

These solve _who can authorize_; Tributary solves _what gets paid, when, and
where it routes_. They compose, not compete.

---

## Why Tributary wins

1. **Protocol, not product.** One smart contract, unlimited businesses on
   top. A product's ceiling is how many merchants it can onboard one by one;
   a protocol's ceiling is network effects — every new integration makes the
   protocol more valuable for every other integration.
2. **One primitive, three knobs.** WHEN / PULL / ROUTE compose into any
   rule-based payment. No other primitive on Solana composes all three
   non-custodially — the missing two knobs (validation + forward) are what
   separate recurring billing from autonomous capital.
3. **Non-custodial by design, not by marketing.** Funds stay in user wallets;
   only SPL delegation is used. \$0 TVL, \$0 balance-sheet risk. In crypto,
   custody risk is existential.
4. **Token-delegation lock-in.** Solana allows one delegate per user per
   token account. Once a user approves Tributary, every automated payment
   flows through it. First-mover advantage is technical, not just marketing.
5. **x402 and the AI-agent economy.** HTTP-402 middleware plus pay-as-you-go
   metering = the billing layer for AI agents and API services. Composable
   pulls extend it: agents can auto-swap, auto-compound, auto-rebalance.
6. **Production-proven.** v1 and v2 both live on mainnet. 4,000+ pulls, six
   active integrations, Ottersec-verified contract, full SDK suite.

**The honest risk:** a well-funded team could clone the contracts. The moat
isn't the code — it's the integrations, the developer trust, and being the
default choice when someone reaches for "recurring payments on Solana."

---

## Traction & status

- **Both axes live on mainnet.** PULL since v1; WHEN + ROUTE since the
  composable layer shipped.
- **4,000+ payments triggered**, all organic, zero marketing spend.
- **Six active production integrations** — Allowly, Contribute.so, Yumi
  Finance, polycode, Orquestra, p-link — with ~50 more in active conversation
  across AI, DeFi, commerce, and consumer finance.
- **Ottersec-verified** contract; verifiable builds; full CI/CD.
- **SDK suite shipped** — TypeScript SDK, React SDK, x402 HTTP-402 middleware,
  payments client, oclif CLI, Express API, scheduler, checkout, dashboard.
- **Hackathons** — Colosseum Frontier + Cypherpunk tracks.

---

## Roadmap

Tributary matures along the knobs, not a feature checklist.

- **Done — PULL axis live.** Three schedule models in production (v1).
- **Done — WHEN + ROUTE axes live.** Composable pull payments with Lighthouse
  validation and Meteora DLMM forward, permissionless execution (v2).
- **Next — deeper ROUTE.** Additional allowlisted forward programs beyond
  Meteora DLMM; revenue splitting (pull once, route to N recipients);
  multi-hop routes.
- **Next — deeper WHEN.** Additional allowlisted validation programs beyond
  Lighthouse; chained validation CPIs; encrypted trigger prices (Arcium).
- **Ongoing — security.** Full third-party audit as the gate to enterprise
  adoption; the Adevar grant covers partial funding.

> Architecture Decision Records (ADRs 0001–0029) in
> [`apps/docs/adr/`](./apps/docs/adr/) capture the _why_ behind every locked-in
> decision. 0001–0006 are v1 PaymentPolicy era; 0007–0029 are the composable
> era. **Code is the authority on current state; ADRs are the authority on
> rationale.** If the two disagree, the ADR is wrong — fix it.

---

## Where to go next

- [`README.md`](./README.md) — the **HOW**: build, test, deploy, SDK code, the
  full account/instruction surface.
- [`CONTEXT.md`](./CONTEXT.md) — the **language**: the ubiquitous terms and
  the brand voice every surface shares.
- [`apps/docs/adr/`](./apps/docs/adr/) — the **WHY** behind every locked
  architectural decision.
- **Website** — [tributary.so](https://tributary.so)
- **Documentation** — [docs.tributary.so](https://docs.tributary.so)
- **GitHub** — [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **SDK** — `pnpm add @tributary-so/sdk`
- **Action Codes** — [actioncode.app](https://actioncode.app) for wallet-less
  payments

---

## Contact

- **Email** — <team@tributary.so>
- **Security** — <security@tributary.so> (see [`SECURITY.md`](./SECURITY.md))
- **Twitter** — [@tributaryso](https://twitter.com/tributaryso)
- **Audit findings** — [`reports/`](./reports/)
