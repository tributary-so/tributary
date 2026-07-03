---
# tributary-f6yh
title: Payments package — full PaymentPolicy support + base64 session encoding for all variants
status: todo
type: milestone
priority: high
created_at: 2026-07-03T09:42:47Z
updated_at: 2026-07-03T09:42:47Z
---

# Payments package — full PaymentPolicy support + session encoding

Makes \`@tributary-so/payments\` aware of all 5 PaymentPolicy variants
(Subscription, Milestone, PayAsYouGo, OneTime, UpTo) PLUS the standalone
direct-transfer mode. Composable policies are EXPLICITLY OUT OF SCOPE.

This milestone owns the **input side**: what a merchant specifies to create
a policy, encoded into a shareable base64 session string. The JWT milestone
(tributary-pzp2) owns the **output side** (PolicyClaim, JWT issuance) and
is BLOCKED-BY this milestone — discriminated-union type philosophy lands
here first, then mirrors into JWT claims.

## Design decisions (grilled 2026-07-03 with Fabian)

### Axis 1 — Session string purpose: HOSTED CHECKOUT DEEP LINKS (a)

The base64 blob is a deep-link URL into hosted checkout
(\`checkout.tributary.so/{path}/{blob}\`). Merchants encode the blob
programmatically, hand the URL to their user, user lands on hosted checkout
which decodes and creates the policy. This means hosted checkout MUST grow
per-variant forms — tracked in a SEPARATE sibling milestone (see blocking
relationships). This milestone ships the encoding spec + types + validators
+ client API; the hosted-checkout milestone consumes them.

### Axis 2 — All 6 modes coexist

The discriminator (\`m\`) covers:
\`\`\`
\"subscription\" | \"milestone\" | \"payAsYouGo\" | \"oneTime\" | \"upTo\" | \"payment\"
\`\`\`
\`\"payment\"\` stays as the **direct SPL transfer** (ADR-0004, no policy).
The 5 policy modes each create a PaymentPolicy on-chain. Direct-transfer
mode is NOT deprecated — it coexists with OneTime policy (different use
cases: immediate payment vs scheduled/authorized single-shot).

### Axis 3 — URL path strategy (c): keep existing + add unified /policy/

- \`/subscribe/{blob}\` — STAYS (backward compat for outstanding subscription links)
- \`/pay/{blob}\` — STAYS (backward compat for outstanding direct-payment links)
- \`/policy/{blob}\` — NEW unified path for the 4 new policy variants
  (milestone/payAsYouGo/oneTime/upTo). Variant discriminator lives inside the blob.

Subscription MAY migrate to \`/policy/\` over time; \`/subscribe/\` remains a
forever-alias. Encoder decides which path to emit based on \`m\`.

### Axis 4 — Discriminator (a): extend \`EncodedSessionData.m\`

Single field, full union. URL path derivable from \`m\`. No separate
\`variant\` field. \`m: \"subscription\" | \"milestone\" | \"payAsYouGo\" |
\"oneTime\" | \"upTo\" | \"payment\"\`.

### Axis 5 — Break \`TributaryConfig\` with SOFT DEPRECATION

\`TributaryConfig\` becomes a discriminated union per variant (see
\`packages/payments/src/types/tributary.ts\`). \`PaymentsClient.checkout.sessions.create()\`
signature breaks. Soft-deprecation path: accept the OLD shape for one
release, emit a console warning, translate internally. New callers use the
discriminated union from day one.

\`\`\`ts
type TributaryConfig =
  | { variant: \"subscription\"; gateway; recipient; trackingId; autoRenew?; memo?; maxRenewals?; paymentFrequency? }
  | { variant: \"milestone\"; gateway; recipient; trackingId; milestoneAmounts; milestoneTimestamps; releaseCondition; totalMilestones; memo? }
  | { variant: \"payAsYouGo\"; gateway; recipient; trackingId; maxAmountPerPeriod; maxChunkAmount; periodLengthSeconds; memo? }
  | { variant: \"oneTime\"; gateway; recipient; trackingId; amount; dueDate?; expiryDate?; memo? }
  | { variant: \"upTo\"; gateway; recipient; trackingId; maxAmount; validAfter?; deadline; memo? }
  | { variant: \"payment\"; recipient; trackingId; amount; memo? }   // direct transfer, no gateway
\`\`\`

### Axis 6 — Fail-fast validation

Encoder REJECTS invalid blobs at encode time. Mirrors on-chain validators
(\`programs/tributary/src/policies/*.rs\`) in TS:

- subscription: amount > 0, valid frequency
- milestone: 1-4 milestones, amounts > 0, timestamps ascending, signer-bits
  mutually exclusive (RELEASE_GATEWAY/OWNER/RECIPIENT)
- payAsYouGo: caps > 0, maxChunkAmount ≤ maxAmountPerPeriod, period > 0
- oneTime: amount > 0, expiryDate > dueDate (when both set)
- upTo: maxAmount > 0, deadline > 0, deadline > validAfter (when validAfter > 0)

Cross-package test: shared fixtures run through BOTH the TS encoder and the
Rust validators, asserting agreement. Drift = test failure.

### Axis 7 — Rename \`client.subscriptions\` → \`client.policies\` (BREAKING)

\`PaymentsClient.subscriptions\` → \`PaymentsClient.policies\`. Old name
stays as a deprecated alias for one release. Dedicated grep task
(see children) walks the monorepo and fixes every occurrence.

### Axis 8 — Sequencing: THIS MILESTONE FIRST

This milestone blocks the JWT milestone (tributary-pzp2). The discriminated-
union type pattern lands here (input side), then the JWT milestone mirrors
it for PolicyClaim (output side). File ownership is clean:
- THIS milestone: \`session.ts\`, \`client.ts\`, \`types/tributary.ts\`, \`utils/validation.ts\`
- JWT milestone: \`verification.ts\`, \`token-issuer.ts\`, \`routes/tokens.ts\`

### Axis 9 — Hosted checkout rendering tracked separately

A sibling milestone (\"Hosted checkout — render forms for new policy
variants\") tracks the \`apps/checkout\` frontend work. Blocked-by this
milestone (needs the encoding spec + validators).

## Scope — what does NOT change

- **Program contract (Rust):** unchanged. All validators already exist.
- **Composable policies:** explicitly excluded.
- **JWT/token-issuance flow:** owned by tributary-pzp2.
- **\`verification.ts\` / \`TributaryVerifier\`:** owned by tributary-pzp2.
- **Base64 format itself:** still JSON → base64url, just more fields.

## Tree

\`\`\`
milestone: Payments package — full PaymentPolicy support + session encoding
├─ epic: implementation
│  ├─ feature: Discriminated TributaryConfig union + soft-deprecation shim
│  ├─ feature: Extend session.ts — encode/decode all 6 modes, /policy/ path
│  ├─ feature: Fail-fast validators mirroring on-chain rules (per variant)
│  ├─ feature: PaymentsClient.policies namespace (rename from .subscriptions)
│  └─ task: Grep monorepo for old API surface, fix all occurrences
├─ epic: testing
│  ├─ feature: Round-trip encode/decode tests for all 6 variants
│  └─ feature: Cross-package validation fixtures (TS encoder vs Rust validators)
└─ feature: documentation (payments README + ADR for encoding v2)
\`\`\`

## Handoff references (read first)

- \`packages/payments/src/core/session.ts\` — encode/decode logic to extend
- \`packages/payments/src/core/client.ts\` — PaymentsClient to rename
- \`packages/payments/src/types/tributary.ts\` — TributaryConfig to discriminated-union
- \`packages/payments/src/utils/validation.ts\` — validators to extend
- \`packages/payments/src/core/onetime.ts\` — existing one-time tracker (stays)
- \`programs/tributary/src/state/payment_policy.rs\` — on-chain PolicyType shapes
- \`programs/tributary/src/policies/{subscription,milestone,pay_as_you_go,one_time,up_to}.rs\` — validation rules to mirror
- \`apps/checkout/src/pay-page.tsx\` — consumer of the session encoding
- \`apps/checkout/src/app.tsx\` — routing (will need /policy/ route in sibling milestone)
