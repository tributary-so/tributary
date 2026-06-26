# ComposablePolicy as a separate account type, not a PolicyType variant

Composable pull payments are a **separate account type**
(`ComposablePolicy`, seeds `["composable_policy", user_payment, policy_id]`)
alongside `PaymentPolicy`, not a fourth variant of `PolicyType`. Both
account types reference `UserPayment`, reference `PaymentGateway`, and
embed the same `PolicyType` schedule enum.

The obvious alternative — adding a `Composable` variant to `PolicyType`
— does not fit. Every `PolicyType` variant is padded to 128 bytes, and
a composable variant needs forward config, validation config, execution
state, plus the common policy fields. That exceeds 128 bytes; the only
way to fit it is to either inflate `VARIANT_SIZE` (and therefore every
existing PaymentPolicy account on-chain — impossible, they have user funds), or
truncate composable fields (and lose extensibility).

Following the Solana Foundation subscriptions-program pattern (separate
account types per delegation kind), `ComposablePolicy` inlines the
fields it has in common with `PaymentPolicy` (`user_payment`, `gateway`,
`status`, `policy_type`, `recipient`, `memo`, `payment_count`,
`policy_id`, timestamps, `bump`, `rent_payer`) directly, alongside its
composable-only fields (`forward_config`, `validation_config`,
`total_input`, `total_output`). We deliberately did **not** factor these
into a shared `PolicyHeader` struct: `PaymentPolicy` predates this work
and its layout is frozen on mainnet, so the two account types inline
their common fields independently rather than sharing a header type.
There is no `PolicyHeader` type in the codebase — `ComposablePolicy`
and `PaymentPolicy` are both flat `#[account]` structs.

Composable v1 briefly introduced its own `ScheduleType` enum (Timed /
Milestone / Usage) that mirrored `PolicyType` byte-for-byte. It was
unified back into `PolicyType` before release (bean tributary-bqbw) —
one shared enum, one set of validation rules. `PaymentPolicy` was
untouched throughout: only the unreleased `ComposablePolicy` shape
changed, so there was zero migration risk.
