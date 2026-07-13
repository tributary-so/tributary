# Policy modules

Create-time validators for each `PolicyType` variant.

## What lives here

- **`subscription.rs`** — `validate_subscription_policy()`
- **`milestone.rs`** — `validate_milestone_policy()`
- **`pay_as_you_go.rs`** — `validate_payg_policy()`

These run only at policy creation (invoked from
`state::payment_policy::PolicyType::validate`). They check static
invariants: non-zero amounts, sane bounds, valid bitmaps, etc.

## Where execute-time logic lives

**Not here.** Execute-time validation and schedule advancement live in
[`crate::shared::schedule`](../shared/schedule.rs):

- `validate_policy_execution()` — timing gates, milestone
  `release_condition` signer bits, PayAsYouGo chunk/period bounds. Returns
  the authoritative payment amount.
- `advance_policy()` — advances `next_payment_due` / `current_milestone` /
  `current_period_total` after a successful execution. Returns whether the
  policy is now exhausted (→ `PolicyStatus::Completed`).

Both `execute_payment` (PaymentPolicy) and `execute_composable`
(ComposablePolicy) route through these two functions — one `match` over
`PolicyType`, shared by both policy families.

## Why no trait / strategy pattern

A `PolicyStrategy` trait + boxed factory previously lived here. It was
removed (see bean `tributary-wawe`): the trait had exactly three impls for
three enum variants, every method re-matched the same enum, and the
"generalize across policy account types" payoff never materialized — the
composable path already used the stateless `shared::schedule` helpers. The
trait was pure dispatch ceremony with a heap allocation on every payment.
The single shared `match` is simpler, allocation-free, and means
policy-semantics changes land in exactly one file.
