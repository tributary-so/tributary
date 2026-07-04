# Payments session encoding v2 — all PolicyType variants

## Decision

`@tributary-so/payments` checkout-session encoding extends from 2 modes
(`subscription`, `payment`) to **6**, covering every `PolicyType` variant
plus the standalone direct transfer:

| `m` discriminator | URL path            | Creates on-chain                      |
| ----------------- | ------------------- | ------------------------------------- |
| `subscription`    | `/subscribe/{blob}` | PaymentPolicy (Subscription)          |
| `payment`         | `/pay/{blob}`       | none — direct SPL transfer (ADR-0004) |
| `milestone`       | `/policy/{blob}`    | PaymentPolicy (Milestone)             |
| `payAsYouGo`      | `/policy/{blob}`    | PaymentPolicy (PayAsYouGo)            |
| `oneTime`         | `/policy/{blob}`    | PaymentPolicy (OneTime, ADR-0019)     |
| `upTo`            | `/policy/{blob}`    | PaymentPolicy (UpTo, ADR-0020)        |

`TributaryConfig` becomes a **discriminated union** keyed on `variant`
(mirrored as `m` in the base64url blob). The base64url wire format itself is
unchanged (JSON → base64url); only the field set grows. Per-variant fields
are encoded under short keys (`ma`/`mt`/`rc`/`tn` for milestone,
`mp`/`mc`/`pl` for payAsYouGo, `dd`/`ed` for oneTime, `xm`/`va`/`dl` for
upTo); `a` stays the canonical single-amount field.

Encode-time validation is **fail-fast**: `encodeUrl` runs the TS validators
(`ValidationUtils.validatePolicyConfig`) before emitting a blob, mirroring the
on-chain `validate_*_policy` rules exactly. Drift is caught by a
cross-package parity contract — canonical fixtures in
`packages/payments/src/__tests__/fixtures/policy-configs.ts` run through both
the TS validators (jest) and the Rust validators (`#[cfg(test)]` in
`programs/tributary/src/policies/*.rs`).

The legacy flat `TributaryConfig` interface (no `variant`) and the
`PaymentsClient.subscriptions` namespace are kept as **soft-deprecated
aliases** for one release: the legacy config is translated to the
`subscription` variant with a `console.warn`, and `client.subscriptions`
delegates to `client.policies` with a warning.

## Rejected alternatives

- **Per-variant URL paths with no shared `/policy/`** (`/milestone/`,
  `/payg/`, `/one-time/`, `/upto/`). Rejected: four new top-level routes for
  the hosted-checkout router to grow, vs. one unified `/policy/` path whose
  variant discriminator lives inside the blob. The blob already carries `m`,
  so the path adds no information — it only selects the renderer, and a
  single renderer that switches on `m` is simpler.

- **Deprecate the direct-transfer `mode: "payment"` entirely** now that the
  OneTime policy exists. Rejected: outstanding `/pay/{blob}` links in the
  wild would break, and the two serve different needs — `payment` is an
  immediate SPL transfer (no policy, no gateway, no fees), while OneTime is a
  scheduled/authorized single-shot pull through the full gateway lifecycle.
  They coexist; neither is deprecated.

- **Loose validation at encode time** (let the chain reject later). Rejected:
  a merchant generates a blob, hands the URL to a user, the user lands on
  hosted checkout and only then hits a confusing Anchor error. Fail-fast at
  encode time, enforced by the parity contract, is what makes the hosted-
  checkout deep-link use case viable.

- **A separate `variant` field alongside `m`**. Rejected: the discriminator
  is the variant — `m` IS the union tag. A second field duplicates it and
  invites divergence (which one is authoritative when they disagree?).

## Rationale

The hosted-checkout deep-link use case (milestone Axis 1) is the driver: a
merchant encodes the full policy spec into a shareable blob, the user opens
`checkout.tributary.so/{path}/{blob}`, and hosted checkout decodes + creates
the policy. That requires the encoding to carry every variant-specific field.

The discriminated union enables type-safe `switch (mode)` handling in both
the encoder and the eventual checkout renderer. Soft-deprecation gives every
consumer (the monorepo apps in `apps/checkout`, `apps/lando`, `apps/api`, …)
one release to migrate off the flat shape and the `.subscriptions` namespace
without a hard break.

The fail-fast validators + cross-package parity contract are the load-bearing
part: the whole point of the deep-link is that a valid blob is always
chain-acceptable. If TS accepts what Rust rejects (or vice versa) the UX
breaks silently. The fixtures file is the single source of truth that both
sides mirror.

## References

- ADR-0004 — the standalone `transfer` instruction / `payment` mode.
- ADR-0019 — the OneTime PaymentPolicy variant.
- ADR-0020 — the UpTo scheme / `upTo` variant (x402 `upto`).
- Milestone `tributary-f6yh` — design decisions (Axes 1–9).
