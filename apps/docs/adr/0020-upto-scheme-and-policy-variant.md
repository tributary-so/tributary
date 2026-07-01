# `upto` scheme — variable-amount single-settlement authorization (UpTo policy variant + x402 facilitator)

Adds a fifth `PolicyType` variant — `UpTo { max_amount, valid_after,
deadline }` — and the matching x402 scheme `x402://upto`. The variant is a
**single-use, time-bound authorization to transfer up to a maximum amount**,
where the **actual settled amount is determined at settle time** by the
resource server based on real usage (LLM tokens, bytes transferred, compute
units). The settled amount MUST be `<= max`, MAY be `0`, and the
authorization is consumed after one settlement.

This is the x402 analog of EVM's Permit2 "upto" witness pattern, realized on
Solana via Tributary's PDA-delegate pull-payment model.

## Decision

### Variant layout (128 bytes payload — ADR-0002 invariant preserved)

```rust
UpTo {
    max_amount: u64,     // 8   — ceiling on the settlement amount
    valid_after: i64,    // 8   — earliest settlement; <= 0 = immediate
    deadline: i64,       // 8   — hard expiry, MUST be > 0 and > valid_after
    padding: [u8; 104],  // 104
}
```

Discriminator `4` (after Subscription=0, Milestone=1, PayAsYouGo=2,
OneTime=3). The fixed 128-byte invariant (ADR-0002) means existing accounts
deserialize identically; the `u8` discriminator has room for 250 more
variants.

### `deadline` is mandatory, not optional

Unlike OneTime's optional `expiry_date: Option<i64>`, UpTo's `deadline` is a
required `i64` and MUST be `> 0`. The x402 spec mandates explicit time bounds
for an authorization primitive — "transfer up to X" without a hard deadline
is an open-ended risk. `valid_after <= 0` mirrors OneTime's `due_date <= 0`
"immediate" convention.

### `actual <= max` enforced on-chain, read from the policy

The execute-time gate in `shared::schedule::validate_policy_execution`
reads `max_amount` from the **on-chain policy** (immutable post-create) and
checks `actual <= max_amount`. The settle-time caller cannot inflate it.
This satisfies the spec's "facilitator re-verifies against
`permitted.amount`, not settle `requirements.amount`" rule automatically —
the ceiling is committed on-chain at create.

### `actual MAY be 0` (no usage → no charge)

The x402 spec allows `amount: 0` at settle. UpTo honors this: a `0` settle
is a valid single outcome (no transfer CPI for the zero case, but the
policy still transitions to `Completed`, consuming the authorization).
Distinct from PayAsYouGo, which explicitly rejects zero chunks (L-01
defense — a zero chunk would let the schedule advance without payment).

### `advance_policy` always returns `true`

UpTo fires exactly once. After settlement, the caller sets
`status = Completed`. Re-execution is blocked by the existing
`status == Active` constraint. Identical single-use guarantee to OneTime —
no new state field needed.

### Recipient-triggerable (like PayAsYouGo)

The recipient can settle: in the x402 flow the resource server (often the
recipient) measures usage and triggers settlement. UpTo joins PayAsYouGo
in the recipient-triggerable set in `execute_payment.rs`. Subscription /
Milestone / OneTime retain the gateway-signer-or-owner authorization
(two of them also allow `release_condition::RELEASE_RECIPIENT` for escrow
release, but the caller must still be gateway/owner).

### x402 facilitator two-phase flow

1. **Verify** — client creates an UpTo policy on-chain (max, validAfter,
   deadline, recipient, gateway) + approves the UserPayment delegate and
   presents the creation tx in the `Payment` header. The facilitator
   submits the tx, then `verifyUpToAuthorization()` confirms the on-chain
   policy matches the expected ceiling. Verify-time
   `X402PaymentRequirements.amount` = `max_amount`.
2. **Settle** — after resource consumption, the resource server computes
   `actual = min(usage_cost, max)` and calls `settleUpTo(policyPda, actual)`.
   On-chain re-checks `actual <= max` and the time window; the policy
   transitions `Active → Completed`.

The verify-phase JWT is short-lived: `exp = deadline` (not the `1y` default
used for subscriptions). The authorization expires when the window closes.

### Composable interplay

Because `PolicyType` is shared between `PaymentPolicy` and
`ComposablePolicy` (ADR-0007 unification), UpTo lands in **both** families
for free:

- **Validation hook (Lighthouse)**: settle up to X once, only if an
  on-chain assertion holds (e.g. recipient hot-wallet balance below
  threshold).
- **Forward hook (Meteora DLMM)**: settle in input token, swap to output
  token on delivery — once.

Inherits all composable semantics (ADR-0008 through ADR-0010) unchanged.

## Rejected alternatives

1. **Reuse `PayAsYouGo` with `max_chunk = max_per_period = max` and a
   single period**. Multi-settlement by design; "single-use" would need
   off-chain facilitator tracking. Violates the spec's on-chain single-use
   mandate.

2. **Reuse `OneTime` with a caller-supplied amount**. Muddies OneTime's
   fixed-amount contract; the two amount models (fixed vs
   caller-determined) are fundamentally different execute paths. Two clean
   variants > one overloaded variant.

3. **Off-chain-only via `transfer` + signature replay cache**. No on-chain
   replay protection; the spec explicitly requires it. Rejected.

4. **Signature-based authorization (true Permit2 analog)**. Would need a
   new program that verifies off-chain signatures and transfers on-demand.
   Far heavier than the PDA-policy model Tributary already has, for no
   benefit. The PDA-delegate model IS Tributary's replay protection.
