# PolicyType: three variants in a 128-byte fixed layout

`PaymentPolicy` carries its schedule as a `PolicyType` enum with three
variants — `Subscription`, `Milestone`, `PayAsYouGo` — each padded to a
fixed 128 bytes. `PaymentPolicy` and (later) `ComposablePolicy` embed the
same enum.

Solana accounts are fixed-size and cannot grow, so the schedule has to
fit a worst-case budget up-front. We picked 128 bytes per variant
because it comfortably covers the largest variant (Milestone: 4 amounts

- 4 timestamps + counters + escrow) with headroom, while keeping the
  account small enough that rent is negligible. Variants are
  byte-identical across `PaymentPolicy` and `ComposablePolicy` after the
  v2 ScheduleType unification (ADR 0007) — one enum, one set of field
  names, one set of validation rules.

The cost is wasted space: the Subscription variant uses ~31 of its 128
bytes. The alternative (variable-size accounts, or a separate account
per variant) would have complicated rent, iteration, and deserialization
for no real gain on a payments primitive where every account is read on
every execution.
