# Tributary — Domain Glossary

> The ubiquitous language for the Tributary protocol. Implementation-free.
> Resolved during the landing-page narrative grilling (2026-06-26); brand
> layer locked in `WORLDBRAND.md` (2026-07-03).

This glossary is the single source of truth for what every Tributary surface
(landing, app, docs, pitch) calls things. The brand layer (§"Brand voice")
governs prose; the technical terms (§"Language") govern code, IDL, and
protocol reference. ADRs are the authority on _why_; this file is the
authority on _what to call it_.

## The core term

**Tributary** — A single primitive: the rule-based money-moving primitive on
Solana. A user delegates spending authority once; money then moves itself
within rules the user defined (a trigger condition, a value to pull, a
destination to route to).

Tributary is **one thing**, not a portfolio of products. Everything below is
an aspect of the same primitive.

> **Soul:** _Money should move itself._ The belief beneath every surface.
> **Tagline:** _Stop pushing your bags. Let them flow._

## Brand voice (locked 2026-07-03)

One of each. Surfaces drift the instant a second synonym slips in.

| Layer          | Sentence                                 | Role                                                   |
| -------------- | ---------------------------------------- | ------------------------------------------------------ |
| **Soul**       | _Money should move itself._              | The belief. Survives transmission.                     |
| **Tagline**    | _Stop pushing your bags. Let them flow._ | The defiant headline. Names the villain.               |
| **Motif**      | _If This Then Money._                    | The grammar (WHEN → PULL+ROUTE). The recurring handle. |
| **Antagonist** | _Push money._ / _the signature tax._     | The villain. The wallet-as-wheelbarrow.                |

- **One noun for the product:** **the primitive.** Never "platform,"
  "solution," "ecosystem," "operating system." "Payments" and "composable"
  are configurations of the primitive, not separate products.
- **One verb for what users do:** **route.** Never "send," "pay," "transfer"
  in hero/brand copy — those are push verbs, the antagonist's vocabulary.
  (The verb survives untouched in technical/IDL contexts: `transfer` the
  instruction, `execute_payment`, etc. The rule is prose-only.)
- **One customer identity:** **the flow architect** — "I don't push bags, I
  route rivers." Persona-B (developer) is the _means_; the flow architect is
  the identity you hand them. (Variant under review: "keeper of the
  watershed" for gateway operators — see `WORLDBRAND.md` open questions.)
- **One ritual:** **the single delegation** — _"set the riverbed once."_ This
  is the baptism moment the brand markets, not the cron job / scheduler tick.
  See §Execution → **Delegate**.
- **Register split:** crypto-native for the hero (defiant, "bags"/"push");
  plain-money for downstream surfaces (checkout/app/docs — calm, "money moves
  itself within rules you set"). Same belief, two registers.

### The push/pull duality

The antagonist (push) and the architecture (pull) are the same word.
Tributary is, literally, a **pull-payment** primitive: delegate a puller once,
the puller draws on rules. This is not metaphor bolted on — it is the
protocol's name for itself. "Pull, don't push" is the technical handle;
"stop pushing your bags" is the defiant handle. Same idea, two registers.

## The river — image system (substrate, not pun)

The name "Tributary" maps structurally onto the primitive. The river governs
**image and motion**; it does **not** generate wordplay. No "make waves," no
"liquid assets," no "sea of opportunity."

| Hydrology                 | Tributary primitive                                                                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Water**                 | Money                                                                                                                                                                                                                                        |
| **Riverbed / banks**      | **The rules** (WHEN/PULL/ROUTE) — the channel money flows within. _Banks_ is the one double meaning worth owning: river banks = the rule channel; pointedly _not_ a custody bank. The single line: _"Our banks hold flows, not your funds."_ |
| Current                   | The recurring schedule                                                                                                                                                                                                                       |
| Source                    | The user's wallet — the PULL origin                                                                                                                                                                                                          |
| Mouth / confluence        | ROUTE — where the flow lands (wallet, pool, LP)                                                                                                                                                                                              |
| Sluice / lock gate        | Validation hook (Lighthouse) — opens or shuts the flow                                                                                                                                                                                       |
| Tributary joining a river | Forward hook (DLMM swap) — one stream becomes another                                                                                                                                                                                        |
| Watershed / basin         | The gateway — the drainage area a scheduler covers                                                                                                                                                                                           |
| Gravity                   | Permissionless execution — water finds a way, any signer opens the gate                                                                                                                                                                      |
| Aquifer                   | Non-custodial — your wallet, untouched until a rule fires                                                                                                                                                                                    |

**Motion language: flow, not click.** Buttons don't press; gates open.
Confirmations don't tick; currents arrive. The river is the grammar
(WHEN/PULL/ROUTE) made visible: water doesn't "drive itself," it **follows
the riverbed**.

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

One Setup → Conflict → Resolution, carried by the flow-architect protagonist.

- **Setup:** Stablecoins made money digital, instant, global — ~$300B on
  chain.
- **Conflict (the spine):** That money is **inert** — and every rail before
  Tributary is **push**-based: you hold a balance, you sign a transfer, the
  balance drops. Every move needs a hand on the keypad. **The signature is
  the tax; the wallet is a wheelbarrow.** "Money that can't act on its own is
  money that can't scale."
- **Resolution:** Tributary is the primitive that lets money **move itself**,
  within rules you set — one delegation, three knobs (WHEN/PULL/ROUTE),
  non-custodial. _Set the riverbed once._ "If This Then Money" is a literal
  description of the Resolution, not a slogan.

Supporting beats (not rival setups): non-custodial is a _property_ of the
resolution (the aquifer), not the headline; "missing infrastructure" is an
_implication_ felt mainly by builders, folded into the resolution rather than
leading.

## Canonical motif (the recurring handle)

The four locked atoms live in §"Brand voice" above. This section nails down
the _register_ of each handle so the page doesn't drift back into three
dialects.

- **"If This Then Money"** — the canonical motif. A literal grammar of the
  primitive: WHEN (If This) -> PULL+ROUTE (Then Money). Recurs in every beat.
  Scales from the live minimal config ("If Monday Then $10 to wallet") to the
  full config ("If oracle drifts 5% Then route to rebalance") — same sentence,
  knobs turned up. One primitive maturing, not two products.
- **"Money should move itself."** — the soul. State it on the hero, in the
  docs header, in the README banner. The sentence that survives transmission.
- **"Stop pushing your bags. Let them flow."** — the tagline. Names the
  villain (push) and the resolution (flow) in one line.
- **"self-driving money"** — the _gloss_ on the motif, used in sub-lines and
  one-line explainers. Evocative but subordinate. (The river is the preferred
  image system; "self-driving" describes the outcome, the riverbed describes
  the grammar.)
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

## Terms to retire / avoid

**Brand-layer retirements (prose only — do NOT rename code/IDL):**

- **"the payment protocol for Solana"** — describes only v1; undersells the
  primitive. Stop using as the headline frame.
- **"money operating system" / "OS for Solana"** — retired. The one noun is
  _the primitive_.
- **"composable platform" / "composable automation layer"** as standalone
  nouns — retired (two-products vocabulary). "Composable" survives only as an
  adjective describing the v2 era of the one primitive.
- **"Web2 experience on Web3 rails" / "Web2-like UX with Web3 security"** —
  retired framing. Tributary is pull-based rails, not a Web2-skin-on-Web3
  pitch. The familiarity is a property of the outcome, not the headline.
- **"set it and forget it"** — Netflix/gym-membership framing. Replaced by
  _"set the riverbed once"_ (the delegation ritual), which is the same idea
  in the brand's own dialect.
- **send / pay / transfer** as the verb for what users _do_ in brand copy —
  those are push verbs (the antagonist's vocabulary). The one verb is
  **route**. (Technical contexts are exempt: `transfer` the SPL instruction,
  `execute_payment`, "the protocol transfers tokens" in protocol reference —
  those describe mechanism, not user action.)

**Overloaded technical terms:**

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
Five variants: `Subscription`, `Milestone`, `PayAsYouGo`, `OneTime`, `UpTo`.
Identical bytes on both `PaymentPolicy` and `ComposablePolicy`.
Composable v1 briefly had its own `ScheduleType`; it was unified back
into `PolicyType` before release (see ADR 0007).
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

**OneTime**:
Fixed `amount`, fires exactly once then the policy transitions to
`Completed`. `due_date <= 0` means immediately executable; `expiry_date =
None` means the policy never expires. Flows through the full gateway
machinery (PDA, pausable, deletable, schedulable, composable hooks). Not
the standalone `transfer` instruction (ADR-0004). See ADR 0019.
_Avoid_: invoice payment, single-shot transfer.

**UpTo**:
Single-use, time-bound authorization to transfer up to `max_amount`. The
actual settled amount is caller-supplied at execute time, bounded by
`max_amount` (`0 <= actual <= max`). `valid_after <= 0` means immediate;
`deadline` is mandatory (`> 0`, `> valid_after`). Recipient-triggerable
(like PayAsYouGo). After one settlement the policy transitions to
`Completed`. The x402 `upto` scheme primitive — settle what was actually
used, once. See ADR 0020.
_Avoid_: authorization hold, debit pre-auth.

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
`execute_composable` on the **trusted path**. Stored in
`gateway.signer`; set by the gateway authority; may be a different (hot)
key. Execution is permissionless in the sense that any tx signed by
`gateway.signer` lands — there is no per-call ACL beyond it.

**Scheduler**:
The off-chain software that polls for triggers and submits execute
transactions (per ADR-0014). A scheduler instance operated by the
gateway authority signs with the **gateway signer** (the trusted path);
a scheduler instance operated by anyone else signs with its own key
(the **permissionless path**, per ADR-0016). "Scheduler" denotes the
software/role, not a specific operator.
_Avoid_: relayer (retired — see ADR-0016 update), keeper (implies the
rejected registry model of ADR-0016 Path A), runner, cranker.

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
_Brand term:_ this single approval is **"setting the riverbed once"** — the
one ritual the brand markets. The signature that turns a balance into a
flow.

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
A share of the gateway fee (not an independent bps-of-payment), sent to
`ProgramConfig.fee_recipient`. The rate (`protocol_share_bps`) is global
on `ProgramConfig`, protocol-admin-set. Per-gateway override via
`FEATURE_CUSTOM_PROTOCOL_FEE` — the override is admin-granted (not
gateway-controlled) and may be zero (subsidise a strategic partner).
See ADR-0018 (supersedes ADR-0006).

**Gateway fee**:
The ONE total fee number (`gateway_fee_bps`), gateway-authority-set,
expressed in bps of the payment (gross or net per NET_AMOUNT). Decomposed
at settle time into four carve-outs: protocol cut, scheduler cut,
referral pool, gateway residual. The gateway residual routes to
`gateway.fee_recipient`. Sum of all carve-out shares must be ≤ 10000 bps,
enforced at every gateway-config write site. See ADR-0018.

**Scheduler cut**:
A per-gateway share (`scheduler_share_bps`) of the gateway fee, paid to
the signer of the execute transaction — the incentive that makes
permissionless execution (ADR-0016) economically viable for third-party
schedulers. On the trusted path (`signer == gateway.signer`) the cut
merges into `gateway.fee_recipient` (the gateway self-rebates); on the
permissionless path it routes to the signer's token account supplied as
a `remaining_account` (verified `owner == signer && mint == source_mint`).

**Net amount mode**:
Gateway flag (`FEATURE_NET_AMOUNT`): determines who bears the fee by
choosing where the pull amount is measured. **Gross mode (off):** the
policy's face amount is pulled; fees are subtracted from it — recipient
receives less than face, sender debited by exactly face. **Net mode
(on):** fees are added on top of face; the sum is pulled — recipient
receives exactly face, sender debited by face + fees. Orthogonal to how
the total fee decomposes into shares. (See `shared/fees.rs`.) For
**composable** policies, net mode is **hardcoded on** (ADR-0026): the fee
is always added on top of face, and the gross pull is skimmed in
`input_mint` before the forward runs.

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
`NATIVE_MINT` (WSOL) for the NATIVE_OUTPUT pattern. In **act mode**
(ADR-0026), `output_mint` is the sentinel `Pubkey::default()` — the forward
consumes input but produces no fungible output token (e.g. a Velocity
subaccount deposit); no output ATA is created and no delivery sweep runs.

### Settlement shapes (composable, ADR-0026)

**Deliver, no transform** (same-mint topup):
Forward disabled, `output_mint == input_mint`. Single intermediate: the
gross pull is skimmed (fee → input_mint fee accounts), then the remainder
(face) is swept to the recipient. Classic subscription / pay-as-you-go
topup.

**Deliver, transform** (swap):
Forward enabled, `output_mint` set and `!= input_mint`. The forward (e.g.
Meteora DLMM) swaps the pulled input into the output token; the output is
swept to the recipient. Tributary asserts `output_amount > 0` (the output
EXISTS); the AMOUNT floor is the owner's `post_validation` job.

**Act** (Velocity / collateral deposit):
Forward enabled, `output_mint == Pubkey::default()` (sentinel). The
forward consumes input but settles into a non-token balance sheet (e.g. a
perp subaccount). Tributary asserts nothing about delivery — no `>0`
guard, no output ATA, no deliver sweep. Any under-consumed input residue is
returned to the user. The owner's `post_validation` is the only settlement
floor.

**Mint compatibility check**:
`validate_mint_compatible` — rejects mints carrying any of six dangerous
Token-2022 extensions at `UserPayment` create-time: TransferHook,
ConfidentialTransferMint, NonTransferable, PermanentDelegate,
TransferFeeConfig, MintCloseAuthority. Run once per (user, mint) pair.
