# OneTime policy variant — fixed amount, single execution, full gateway lifecycle

Adds a fourth `PolicyType` variant — `OneTime { amount, due_date,
expiry_date }` — for one-shot fixed-amount pull payments that flow through
the full gateway machinery (gateway signer, protocol/gateway/scheduler
fee split, referral rewards, composable hooks). The variant has a real
PDA, a lifecycle (`Active → Completed`), pausability, deletability, and
the `UserPayment` delegate model.

This is **not** the standalone `transfer` instruction (ADR-0004). That
instruction is a stateless one-shot wrapper: no policy account, no
lifecycle, no pre-approved delegation. OneTime fills the gap between
"fire a payment now" (`transfer`) and "set up a recurring pull"
(Subscription).

## Decision

### Variant layout (128 bytes payload — ADR-0002 invariant preserved)

```rust
OneTime {
    amount: u64,               // 8   — fixed amount, must be > 0
    due_date: i64,             // 8   — earliest execution; <= 0 = immediate
    expiry_date: Option<i64>,  // 9   (1 + 8) — None = never expires
    padding: [u8; 103],        // 103
}
```

Discriminator `3` (after Subscription=0, Milestone=1, PayAsYouGo=2).
The fixed 128-byte invariant (ADR-0002) means existing accounts
deserialize identically; the `u8` discriminator has room for 251 more
variants.

### `due_date <= 0` means "immediately executable"

The execute-time gate in `shared::schedule::validate_policy_execution`
treats any `due_date <= 0` as already due. This unifies both create
paths: `create_payment_policy` and `create_composable_policy` store the
variant as-is, no per-variant clamp. A future-dated OneTime policy is
schedulable (gateways monitor `due_date` like any subscription).

### `advance_policy` always returns `true`

OneTime fires exactly once. After execution, the caller
(`execute_payment` / `execute_composable`) sets `status = Completed`.
Re-execution is blocked by the existing `status == Active` constraint
shared with Subscription/Milestone. **Single-execution guarantee is
airtight** without any new state field.

### `expiry_date` is included up front, not deferred

Enum variant fields are immutable post-release; adding `expiry_date`
later would require a `OneTimeV2` variant. 9 bytes of padding
well-spent — "when does this invoice expire?" is the obvious lifecycle
question for a one-shot payment, and `Option<i64>` already has precedent
(`Subscription::max_renewals`). When `expiry_date` passes the owner can
`delete_payment_policy` to reclaim the delegate approval (no auto-close;
keeps the lifecycle model uniform).

### Authorization

Same as Subscription: `fee_payer` must be `gateway.signer` or
`user_payment.owner`. Recipient cannot trigger (only PayAsYouGo allows
recipient triggering).

### Composable interplay

Because `PolicyType` is shared between `PaymentPolicy` and
`ComposablePolicy` (ADR-0007 unification), OneTime lands in
**both** families for free:

- **Validation hook (Lighthouse)**: pay once only if on-chain assertion
  holds (e.g. recipient hot-wallet balance below threshold).
- **Forward hook (Meteora DLMM)**: pull input token, swap, deliver
  output token — one time.

Inherits all composable semantics (ADR-0008 through ADR-0010)
unchanged.

### Event

Reuses the existing `PaymentRecord` event. No new event variant —
`payment_count` will be `1` for the single execution.

## Rejected alternatives

1. **Reuse `Subscription` with `max_renewals = Some(1), auto_renew = false`**.
   Works functionally, but: (a) forces the user to specify a
   `payment_frequency` (meaningless for a single payment), (b) still
   advances `next_payment_due` via calendar-month math on execute
   (wasted compute + confusing state), (c) no `expiry_date` semantic,
   (d) SDK/memo/labeling all say "subscription". OneTime is a distinct
   primitive — faking it reuses 128 bytes but adds conceptual debt.

2. **Reuse `Milestone` with `total_milestones = 1`**. Same debt, plus
   drags in the `release_condition` bitmap and escrow accounting that
   are meaningless for a single pull payment.

3. **Just use `transfer` (ADR-0004)**. Rejected by the requirement: no
   PDA, no lifecycle, no pausability, no schedulability, no composable
   hooks. The whole point of OneTime is to give one-shot payments a
   first-class place in the policy model so they can be paused,
   scheduled, gated by Lighthouse assertions, and routed through DLMM
   — none of which `transfer` supports.
