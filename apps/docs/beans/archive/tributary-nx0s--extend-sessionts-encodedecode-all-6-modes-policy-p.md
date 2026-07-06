---
# tributary-nx0s
title: Extend session.ts — encode/decode all 6 modes + /policy/ path
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:43:47Z
updated_at: 2026-07-03T20:31:56Z
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

- [x] All 6 modes encode → decode round-trip identically (property test)
- [ ] \`/subscribe/\`, \`/pay/\`, \`/policy/\` paths emitted correctly per \`m\`
- [x] Variant-specific fields parsed and validated (structural; full fail-fast in tributary-uny8)
- [ ] Legacy \`encodeSubscriptionUrl\` still works
- [ ] Invalid \`m\` values rejected with clear error
- [ ] \`pnpm run build\` + \`pnpm run lint\` clean

## Handoff references

- \`packages/payments/src/core/session.ts\` — the file to change
- \`packages/payments/src/types/tributary.ts\` — TributaryConfig (depends on sibling feature)
- \`apps/checkout/src/pay-page.tsx\` — consumer (will need /policy/ route later)
- Milestone tributary-f6yh — design decisions (Axis 3, 4)

## Work started (bean-f6yh worktree)

Building on the landed `TributaryConfig` union (tributary-zre4). Extending
`EncodedSessionData.m` to the full 6-variant union, adding per-variant
encoded fields, extending `CheckoutParams`, branching `encodeUrl`/`decodeUrl`
on `m`, and emitting `/subscribe/` | `/pay/` | `/policy/` paths.

Validation scope: structural only (required fields + mode). Full on-chain-
mirroring fail-fast rules land in tributary-uny8.

### Acceptance checklist
- [ ] All 6 modes encode → decode round-trip identically
- [ ] /subscribe/, /pay/, /policy/ paths emitted correctly per m
- [ ] Variant-specific fields parsed (structural validation)
- [ ] Legacy encodeSubscriptionUrl still works
- [ ] Invalid m values rejected with clear error
- [ ] pnpm run build + pnpm run lint clean; existing tests green

## Summary of Changes

Extended the base64 session encoding to the full 6-variant union (milestone
Axis 3/4). Builds on the `TributaryConfig` union from tributary-zre4.

### Files
- `packages/payments/src/core/session.ts`:
  - `SessionMode` type + `EncodedSessionData.m` widened to all 6 modes.
  - New `CheckoutParams` arms: `MilestoneParams`, `PayAsYouGoParams`,
    `OneTimePolicyParams` (ADR-0019, distinct from `OneTimeParams` direct
    transfer), `UpToParams` (ADR-0020).
  - Per-variant encoded fields: `ma`/`mt`/`rc`/`tn` (milestone),
    `mp`/`mc`/`pl` (payAsYouGo), `dd`/`ed` (oneTime), `xm`/`va`/`dl`
    (upTo). `a` stays canonical for single-amount variants.
  - `encodeUrl` switches on `m`, populates variant fields, emits path via
    `pathForMode`: subscription→/subscribe/, payment→/pay/, others→/policy/.
  - `validateDecodedData` switches on `m` and returns the right arm.
    Validation is STRUCTURAL (required fields + parseable; gateway required
    for all policy modes). Full on-chain-mirroring fail-fast rules land in
    tributary-uny8.
  - Added `memo?` to `SubscriptionParams` (on-chain all policy variants
    carry the 64-byte memo).
  - Legacy `encodeSubscriptionUrl`/`decodeSubscriptionUrl` aliases unchanged.
- `packages/payments/src/__tests__/session-variants.test.ts` (new): 18 tests
  — path selection per mode, full round-trip for all 6 modes, optional-field
  preservation (oneTime due/expiry, upTo validAfter), explicit cluster on
  /policy/, omitted-optionals-come-back-undefined, legacy alias, unknown-mode
  rejection, missing-gateway rejection.

### Verification
- TDD: RED (`CheckoutParams` only accepted 2 modes) → GREEN.
- `pnpm test`: 6 suites / 80 tests pass (was 5/62 — no regressions, +1 suite / +18 tests).
- `tsc --noEmit` clean; `pnpm run lint` exit 0; `pnpm run build` clean.

### Out of scope (sibling features)
- per-variant fail-fast validators mirroring Rust rules → tributary-uny8
- `client.subscriptions` → `client.policies` rename → tributary-gj27
- monorepo grep for old API surface → tributary-c206
- README + ADR for encoding v2 → tributary-9ltg
- `apps/checkout` `/policy/` route + form rendering → hosted-checkout milestone (tributary-wwwh)
