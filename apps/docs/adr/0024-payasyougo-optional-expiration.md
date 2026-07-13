# Optional PayAsYouGo expiration — per-variant `expiry_date` (ADR-0024)

Adds an optional overall expiration to the `PayAsYouGo` variant only:

```rust
PayAsYouGo {
    max_amount_per_period: u64,
    max_chunk_amount: u64,
    period_length_seconds: u64,
    current_period_start: i64,
    current_period_total: u64,
    expiry_date: Option<i64>,   // NEW — None = never expires
    padding: [u8; 79],          // was 88
}
```

`None` = never expires (backward-compatible default — zeroed legacy
padding deserializes to `None` via the borsh discriminant 0).
`Some(ts)` with `ts > 0`: when `current_time > ts`, both
`execute_payment` and `execute_composable` fail with
`TributaryError::PolicyExpired`. The boundary `current_time == expiry`
is permitted (`<=`, mirroring OneTime). The gate is **orthogonal** to
the rolling period cap (`max_amount_per_period` /
`period_length_seconds`) — whichever bound trips first wins.

## Decision

### PayAsYouGo is the only variant that needed it

- **Subscription** already expresses "stop" via `max_renewals`
  (count-based) — "stop after 1 year" = 12 monthly renewals, already
  expressible.
- **Milestone** has absolute per-milestone timestamps; an overall
  expiry is just "after the last timestamp, lock the rest," already
  implied by the release semantics.
- **OneTime** / **UpTo** already expire (`expiry_date` / `deadline`).

PayAsYouGo is the only variant with **neither** a count cap **nor**
absolute target dates — the genuine gap. Composable topup policies
built on PayAsYouGo inherit this fix automatically since
`ComposablePolicy` reuses `PolicyType`.

### Per-variant field, not top-level

ADR-0002's fixed 128-byte layout means OneTime's in-variant
`expiry_date` bytes **cannot be removed**; a top-level field would
create a permanent duplicate + a "which expiry wins?" precedence
ambiguity on OneTime — not a consolidation. This matches the
established pattern (ADR-0002 / ADR-0019 / ADR-0020): lifecycle
semantics live **in** the variant.

### 9 bytes carved from padding; 128-byte invariant preserved

`Option<i64>` is 9 bytes (1 discriminant + 8 value). PayAsYouGo had 88
bytes of padding → 79 remain. The variant stays exactly 128 bytes, so
ADR-0002's account-size invariant holds. Existing accounts deserialize
unchanged: the first 9 bytes of the old zeroed padding read as
`Option::<i64>::None` (discriminant 0) plus 8 ignored zero bytes.

### Soft gate only — no new `PolicyStatus`

No "Expired" `PolicyStatus` transition. The gate reuses the existing
`TributaryError::PolicyExpired` (same error OneTime/UpTo raise). Owners
who want to reclaim the delegate approval after expiry may call
`delete_payment_policy`; the lifecycle model stays uniform.

### Validation: gate is the single source of truth

`validate_payg_policy` (create-time) is unchanged — the match in
`PolicyType::validate()` uses `..` and ignores the new field. There is
no `due_date` equivalent to order `expiry_date` against (unlike
OneTime), so there is nothing to validate at create time beyond the
existing chunk/period checks. The execute-time gate
(`shared::schedule::validate_policy_execution`, PayAsYouGo arm) is the
single source of truth — mirroring the OneTime precedent of not
over-validating sentinel `Option` values at create.

## Rejected alternatives

1. **Add `expiry_date` to Subscription and Milestone too.** Rejected —
   both already express "stop" (count-based / absolute-target
   respectively). Adding a date field would create a redundant,
   potentially-conflicting second stop condition per variant with no
   real new capability. Scope creep without a gap to fill.

2. **Top-level / cross-variant `expiry_date` field on `PaymentPolicy`.**
   Rejected — would (a) duplicate OneTime's in-variant bytes forever
   (the 128-byte layout is immutable post-release), and (b) introduce a
   "which expiry wins?" precedence ambiguity on OneTime. Not a
   consolidation.

3. **New "Expired" `PolicyStatus`.** Rejected — a soft gate
   (`TributaryError::PolicyExpired` at execute) is sufficient and keeps
   the lifecycle model uniform with OneTime/UpTo (which also gate via
   error, not status). A status transition would add a state-migration
   concern and a new close-path for no benefit.

4. **Reject `Some(ts <= 0)` at create.** Rejected — the gate already
   treats `*exp > 0` as the firing condition, so `Some(0)` is a harmless
   immediately-dead policy (same as OneTime's precedent of accepting
   `Some(1)`). Adding a create-time guard would diverge from the
   OneTime pattern for no security gain.
