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

## Concept

A non-custodial recurring-payments protocol on Solana. A user delegates a
token allowance to a program-controlled account; a permissionless gateway
signer pulls against that allowance on a schedule and routes the funds to a
recipient, with protocol and gateway fees taken in-flight.

Two account families carry the protocol:

- **PaymentPolicy** — direct pull: program pulls tokens from the user's ATA
  straight to the recipient (one CPI, fee-split inline).
- **ComposablePolicy** — programmable pull: program pulls into a transient
  intermediate ATA, optionally runs a read-only validation CPI, optionally
  runs a forward CPI (swap), then settles to the recipient.

Both reuse the same `PolicyType` schedule enum, the same `UserPayment`
scope, the same `PaymentGateway` fee/signer config, and the same fee math.

## Language

### Core accounts

**UserPayment**:
Per-`(owner, token_mint)` account that scopes a user's activity for one
mint. Carries the per-mint policy counters, the active-policy counters, and
— critically — its PDA is the token delegate on the user's source ATA.
_Avoid_: wallet, account, balance.

**PaymentGateway**:
Per-authority service account that configures the gateway fee, the gateway
signer, the fee recipient, the referral programme, and the per-gateway
feature flags. Execution is permissionless but gated by `gateway.signer`.
_Avoid_: merchant, payee config.

**PaymentPolicy**:
A direct pull-payment contract: schedule + recipient + gateway. Execution
transfers tokens `user_token → recipient_token` in a single CPI with fees
routed inline. Identified by `policy_id` drawn from
`user_payment.created_policies_count`.
_Avoid_: subscription (that is one _variant_), plan, mandate.

**ComposablePolicy**:
A programmable pull-payment contract: schedule + recipient + gateway +
optional validation hook + optional forward hook. Identified by `policy_id`
drawn from `user_payment.created_composable_count` (independent ID space
from PaymentPolicy).
_Avoid_: swap-policy, trigger policy.

**PolicyHeader** (v2):
The shared prefix on `ComposablePolicy` carrying the fields it has in
common with `PaymentPolicy` (discriminator, version, bump, user_payment,
gateway, status, rent_payer). `PaymentPolicy` does **not** embed this
struct — it predates it and its layout is frozen.

**ProgramConfig**:
Singleton (`["config"]`) holding the protocol admin, the protocol fee
recipient, the protocol fee in bps, and the emergency-pause flag.

**ValidationPda**:
Optional separate account (`["composable_validation", composable_policy]`)
holding the assertion byte-blob (≤1024 bytes) a ComposablePolicy's
validation hook replays via CPI. Lives outside `ComposablePolicy` because
the policy account itself cannot grow.

**ReferralAccount**:
A 6-character referral code registered against a gateway. Referral chains
are at most 3 levels deep, gateway-scoped, and the ref-code is part of the
PDA seed.

### Schedule

**PolicyType**:
The shared 128-byte fixed-layout enum describing how a policy advances.
Three variants: `Subscription`, `Milestone`, `PayAsYouGo`. Identical bytes
on both `PaymentPolicy` and `ComposablePolicy`. Composable v1 briefly had
its own `ScheduleType`; it was unified back into `PolicyType` before
release (see ADR 0007).
_Avoid_: schedule, plan type.

**Subscription**:
Fixed `amount` pulled every `payment_frequency` until `max_renewals` is
reached, or indefinitely if `auto_renew`. Execution is gated by
`next_payment_due`.
_Avoid_: recurring, plan.

**Milestone**:
Up to four `(amount, timestamp)` pairs held in escrow. Released per the
`release_condition` bitmap: bit 0 = due-date check, bits 1–3 = which
signer may release (mutually exclusive: gateway / owner / recipient).
_Avoid_: escrow payment, vesting.

**PayAsYouGo**:
Usage-based: each execution claims up to `max_chunk_amount`, capped at
`max_amount_per_period` per `period_length_seconds`. Period resets
automatically. This is the **only** variant that accepts a caller-supplied
amount at execute time (`forward_amount` on the composable path, the
`amount` arg on the direct path).
_Avoid_: metered, usage plan.

**PolicyStatus**:
The lifecycle state shared by both policy families: `Active`, `Paused`,
`Completed`. (Payment v1 had its own `PaymentStatus`; unified into
`PolicyStatus`.)

### Roles

**Owner**:
The user whose ATA is being pulled from. Counterpart of `recipient`.
_Avoid_: payer, customer.

**Recipient**:
The wallet a policy pays to. May be any pubkey; for ComposablePolicy the
`output_mint` may differ from the input mint (the forward hook swaps).
_Avoid_: payee, merchant.

**Gateway authority**:
The wallet that controls a `PaymentGateway`. Can rotate the gateway
signer, change fee settings, change the fee recipient, and toggle feature
flags. Single-sig (no timelock/multisig — see ADR 0006, known limitation).

**Gateway signer**:
The key actually authorised to call `execute_payment` /
`execute_composable`. Set by the gateway authority; may be a different
(hot) key. Execution is permissionless in the sense that any tx signed by
`gateway.signer` lands — there is no per-call ACL beyond it.

**Fee payer**:
The wallet that pays tx + rent costs. Configurable per-gateway ("fee
sponsoring"). Distinct from `owner`, `recipient`, and gateway signer.

**Protocol admin**:
The wallet that controls `ProgramConfig` — protocol fee bps, fee
recipient, emergency pause. Distinct from the Solana BPF upgrade
authority (operational, off-chain — see SECURITY.md).

### Execution

**Delegate**:
The token-program delegate approved on the user's source ATA. In current
code this is the **`UserPayment` PDA**. A legacy global `PaymentsDelegate`
PDA (`["payments"]`) is still accepted by `execute_composable` for
backwards compatibility; new flows must use the `UserPayment` PDA.

**Delegated amount**:
The remaining token allowance the delegate may pull. `execute_*` fails
with `InsufficientDelegatedAmount` if the pull would exceed it.

**Pull**:
The transfer from the user's source ATA executed by the delegate. Direct
path: `user_token → recipient_token`. Composable path:
`user_token → intermediate_input_ata`.

**Intermediate ATA** (composable only):
A transient ATA owned by the **ComposablePolicy PDA** (not the
UserPayment PDA — see ADR 0008). Exists only for the duration of one
`execute_composable` call; created fresh at the start, closed at the end.

**Validation hook** (composable only):
A read-only CPI into Lighthouse that can veto an execution if an
on-chain assertion fails (e.g. "hot wallet balance below threshold").
Disabled by setting `validation_program = SystemProgram`.

**Forward hook** (composable only):
A token-transform CPI into a hard-allowlisted program (currently Meteora
DLMM) that converts the pulled input token into the delivery token before
settlement (e.g. pull USDC, deliver WSOL). Disabled by setting
`target_program = Pubkey::default()`.

**Settlement**:
The final leg of `execute_composable`: fees and principal are routed from
the intermediate ATA(s) to the protocol fee account, gateway fee account,
and recipient. When the NATIVE_OUTPUT flag is set, the output intermediate
is closed to native SOL via `closeAccount` rather than transferred as
WSOL.

**Trigger**:
The boolean predicate "this policy would execute successfully right now."
Composed of schedule-readiness AND validation-predicate-readiness AND
delegation-sufficiency AND funded-balance. Distinct from validation (the
Lighthouse hook specifically) and from schedule (the timing predicate). A
policy with a valid schedule but a failing validation has no trigger. The
composable scheduler evaluates triggers off-chain every poll cycle; only
policies whose trigger is true proceed to simulation and fire.
_Avoid_: eligibility, readiness, due (that is schedule-specific).

**Forward context**:
The off-chain per-`inputMint:outputMint` metadata an executor needs to
build a forward instruction: the specific pool address (e.g. which DLMM
`lbPair`), the swap-level slippage convention, and any SDK quirks (e.g.
`hostFeeIn` rewrite). Not stored on-chain — the `ComposablePolicy` carries
only byte-range pins on the instruction discriminator. Lives in the
executor's static config map, keyed by mint pair. A policy whose mint pair
has no forward context is skipped silently by the scheduler.
_Avoid_: pool config, swap config.

### Fees

**Protocol fee**:
A bps slice of every payment sent to `ProgramConfig.fee_recipient`.
Default 100 bps; overridable per-gateway via the
`FEATURE_CUSTOM_PROTOCOL_FEE` flag.

**Gateway fee**:
A bps slice set by the gateway authority, sent to
`gateway.fee_recipient`. Combined protocol + gateway fee must be
<10000 bps (enforced at every write site).

**Net amount mode**:
Gateway flag (`FEATURE_NET_AMOUNT`): when set, the gateway fee is
computed on the post-protocol-fee amount (gateway takes a slice of what
the protocol left); when unset, both fees are computed on the gross.

**Referral pool**:
When `FEATURE_REFERRAL` is set, `referral_allocation_bps` of the gateway
fee is diverted into a pool; `referral_tiers_bps` then splits that pool
across up to three chain levels. The tiers are a split of the pool, not a
split of the gateway fee directly.

### Mints

**Source mint**:
The token pulled from the user. Equals `user_payment.token_mint`.

**Output mint** (composable only):
The token delivered to the recipient. Equals the source mint when forward
is disabled; otherwise whatever the forward hook produces. May be
`NATIVE_MINT` (WSOL) for the NATIVE_OUTPUT pattern.

**Mint compatibility check**:
`validate_mint_compatible` — rejects mints carrying any of six dangerous
Token-2022 extensions at `UserPayment` create-time: TransferHook,
ConfidentialTransferMint, NonTransferable, PermanentDelegate,
TransferFeeConfig, MintCloseAuthority. Run once per (user, mint) pair.
