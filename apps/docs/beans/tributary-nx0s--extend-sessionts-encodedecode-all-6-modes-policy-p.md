---
# tributary-nx0s
title: Extend session.ts — encode/decode all 6 modes + /policy/ path
status: todo
type: feature
priority: high
created_at: 2026-07-03T09:43:47Z
updated_at: 2026-07-03T09:45:04Z
parent: tributary-pg7r
blocked_by:
    - tributary-zre4
    - tributary-uny8
---

# Extend session.ts — encode/decode all 6 modes

## What exists today

\`packages/payments/src/core/session.ts\`:
- \`EncodedSessionData\` (line 57): \`m: \"subscription\" | \"payment\"\`, plus
  subscription-only fields (\`g\`, \`ar\`, \`mr\`, \`pf\`, \`st\`, \`li\`) and
  one-time-only (\`memo\`).
- \`encodeUrl(params)\` (line 150): branches on \`params.mode\` to populate
  variant-specific fields. Emits \`/subscribe/{blob}\` or \`/pay/{blob}\`.
- \`decodeUrl(encodedData)\` (line 182): reverse.
- \`validateDecodedData(data)\` (line 226): switches on \`data.m\`.

Only 2 modes handled. Milestone/PayAsYouGo/OneTime/UpTo fall through to the
\`else\` branch (line 303) → \`Invalid mode\` error.

## What changes

### 1. Extend \`EncodedSessionData.m\` to the full union

\`\`\`ts
m: \"subscription\" | \"milestone\" | \"payAsYouGo\" | \"oneTime\" | \"upTo\" | \"payment\";
\`\`\`

### 2. Add variant-specific encoded fields

Per variant (mirroring \`TributaryConfig\`):
- **milestone**: \`ma\` (JSON: milestoneAmounts[]), \`mt\` (JSON: milestoneTimestamps[]),
  \`rc\` (releaseCondition number → string), \`tn\` (totalMilestones)
- **payAsYouGo**: \`mp\` (maxAmountPerPeriod), \`mc\` (maxChunkAmount),
  \`pl\` (periodLengthSeconds)
- **oneTime**: \`dd\` (dueDate or \"null\"), \`ed\` (expiryDate or \"null\")
- **upTo**: \`xm\` (maxAmount), \`va\` (validAfter or \"null\"), \`dl\` (deadline)

Keep \`a\` as the canonical amount field for subscription/oneTime/payment
(single-amount variants). Multi-amount variants (milestone) use \`ma\`.

### 3. Extend \`CheckoutParams\` discriminated union

\`\`\`ts
export type CheckoutParams =
  | SubscriptionParams
  | MilestoneParams
  | PayAsYouGoParams
  | OneTimePolicyParams    // distinct from OneTimeParams (transfer)
  | UpToParams
  | OneTimeParams;         // existing — direct transfer, mode: \"payment\"
\`\`\`

Add \`MilestoneParams\`, \`PayAsYouGoParams\`, \`OneTimePolicyParams\`,
\`UpToParams\` interfaces mirroring \`SubscriptionParams\` structure.

### 4. \`encodeUrl\` — branch on \`m\`, emit correct path

\`\`\`ts
const pathFor = (m: string) => {
  if (m === \"subscription\") return \"/subscribe/\";
  if (m === \"payment\") return \"/pay/\";
  return \"/policy/\";   // milestone, payAsYouGo, oneTime, upto
};
\`\`\`

Per \`m\`, populate variant-specific encoded fields.

### 5. \`decodeUrl\` + \`validateDecodedData\` — switch on \`m\`

Add cases for \`milestone\`, \`payAsYouGo\`, \`oneTime\`, \`upTo\`. Parse
variant-specific fields, validate via the fail-fast validators (separate
feature), return the right \`CheckoutParams\` arm.

### 6. \`apps/checkout\` routing — NOT in this feature

The \`/policy/{blob}\` route in \`apps/checkout/src/app.tsx\` is owned by the
hosted-checkout milestone (tributary-wwwh). This feature only ships the
encoding/decoding logic; the consumer (checkout app) adds the route when it
implements rendering.

### 7. \`encodeSubscriptionUrl\` / \`decodeSubscriptionUrl\` legacy aliases

Keep them as thin delegators to \`encodeUrl\`/\`decodeUrl\` (existing pattern).
Do NOT remove — third-party code may reference them.

## Out of scope

- \`TributaryConfig\` type change (separate feature).
- Validators (separate feature, but called from here).
- \`PaymentsClient\` rename (separate feature).
- \`apps/checkout\` route addition (hosted-checkout milestone).

## Acceptance criteria (TDD)

- [ ] All 6 modes encode → decode round-trip identically (property test)
- [ ] \`/subscribe/\`, \`/pay/\`, \`/policy/\` paths emitted correctly per \`m\`
- [ ] Variant-specific fields parsed and validated
- [ ] Legacy \`encodeSubscriptionUrl\` still works
- [ ] Invalid \`m\` values rejected with clear error
- [ ] \`pnpm run build\` + \`pnpm run lint\` clean

## Handoff references

- \`packages/payments/src/core/session.ts\` — the file to change
- \`packages/payments/src/types/tributary.ts\` — TributaryConfig (depends on sibling feature)
- \`apps/checkout/src/pay-page.tsx\` — consumer (will need /policy/ route later)
- Milestone tributary-f6yh — design decisions (Axis 3, 4)
