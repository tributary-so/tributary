# Composable scheduler trigger model: per-policy state-poll

The composable-policy scheduler uses a **per-policy state-poll** trigger
model with two cadence classes running in one process: a **cron spine**
for timestamp-triggered policies (Subscription, time-based Milestone) and
a **30-second poll loop** for state-predicate-triggered policies
(PayAsYouGo topups gated by Lighthouse assertions like "hot wallet SOL
below threshold"). This is distinct from the existing PaymentPolicy
scheduler, which is cron-only — the composable trigger shape adds the
second loop, it does not replace the first.

**Cron spine retained.** Timestamp triggers are already optimal on cron:
the trigger _is_ a timestamp comparison, so replacing it with a 30s poll
would add latency for no gain. The cron spine is reused unchanged.

**State-poll loop for state predicates.** The canonical composable use
case is a PayAsYouGo topup whose trigger is a runtime state predicate
that can flip true at any wall-clock second. An hourly cron (the
status-quo alternative) would leave a hot wallet unfunded for up to an
hour; a 30s poll bounds the gap to one tick. The loop is gated by a
cheap off-chain prefilter — batch-read the validation-target accounts
and evaluate the Lighthouse predicate locally — so per-tick RPC cost is
O(1) batched reads, not O(N) simulations. A `simulateTransaction` gate
before send ensures prefilter drift never causes a bad fire, only a
slightly late or slightly wasteful one. The scheduler is stateless
beyond an in-memory cooldown map; all policy state is re-read from chain
every tick.

**Stateless, gateway-operated.** The scheduler holds gateway-signer
keypairs and fires with `gateway.signer = fee_payer`. Discovery is boot
scan + periodic rescan (every 5–15 min), no persistence. Forward context
— the specific pool address (which DLMM `lbPair`), the swap-level
slippage convention, and SDK quirks like a `hostFeeIn` rewrite — comes
from a static `FORWARD_CONTEXT` map keyed by `inputMint:outputMint`. The
on-chain `ComposablePolicy` carries only byte-range pins on the forward
instruction discriminator, not pool routing; a policy whose mint pair
has no forward-context entry is skipped silently with a log line.

**Rejected: event-subscribe (websocket).** Subscribing to account
changes for validation-target accounts and firing on change would give
sub-second latency but at high fragility (reconnect, dedup, cursor
management) and roughly 5× the complexity for a latency win the payments
use case does not need. (bean tributary-y4wq)
