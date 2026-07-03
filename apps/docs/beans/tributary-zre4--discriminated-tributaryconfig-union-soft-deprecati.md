---
# tributary-zre4
title: Discriminated TributaryConfig union + soft-deprecation shim
status: todo
type: feature
priority: high
created_at: 2026-07-03T09:43:47Z
updated_at: 2026-07-03T09:45:04Z
parent: tributary-pg7r
---

# Discriminated TributaryConfig union + soft-deprecation shim

## What exists today

\`packages/payments/src/types/tributary.ts:83\`:
\`\`\`ts
export interface TributaryConfig {
  gateway: string;
  recipient: string;
  trackingId: string;
  autoRenew?: boolean;
  memo?: string;
}
\`\`\`
Subscription-specific. No fields for milestone amounts, PayAsYouGo caps,
OneTime due/expiry, or UpTo deadline.

## What changes

### 1. Replace \`TributaryConfig\` with discriminated union

\`\`\`ts
export type TributaryConfig =
  | { variant: \"subscription\"; gateway: string; recipient: string; trackingId: string;
      autoRenew?: boolean; memo?: string; maxRenewals?: number | null; paymentFrequency?: string }
  | { variant: \"milestone\"; gateway: string; recipient: string; trackingId: string;
      milestoneAmounts: number[]; milestoneTimestamps: number[];
      releaseCondition: number; totalMilestones: number; memo?: string }
  | { variant: \"payAsYouGo\"; gateway: string; recipient: string; trackingId: string;
      maxAmountPerPeriod: number; maxChunkAmount: number; periodLengthSeconds: number; memo?: string }
  | { variant: \"oneTime\"; gateway: string; recipient: string; trackingId: string;
      amount: number; dueDate?: number; expiryDate?: number; memo?: string }
  | { variant: \"upTo\"; gateway: string; recipient: string; trackingId: string;
      maxAmount: number; validAfter?: number; deadline: number; memo?: string }
  | { variant: \"payment\"; recipient: string; trackingId: string;
      amount: number; memo?: string };
\`\`\`

### 2. Soft-deprecation shim in \`session.ts\`/\`client.ts\`

Accept the OLD shape (no \`variant\` field, flat subscription-style) for one
release. Detection: \`!('variant' in cfg)\`. On detection:
- Emit \`console.warn('[Tributary] Depreated: TributaryConfig shape ...')\`
- Translate internally to \`{ variant: 'subscription', ...oldCfg }\` (the only
  shape the old API could express).

Drop the shim in the release after next.

### 3. \`mode\` field redundancy

Today \`TributaryCheckoutSession.mode\` (\`\"payment\" | \"subscription\"\`) and
the new \`TributaryConfig.variant\` overlap. Resolution: \`mode\` stays on
\`TributaryCheckoutSession\` for backward-compat with consumers reading it,
but it's derived from \`variant\`:
- \`variant: \"payment\"\` → \`mode: \"payment\"\`
- all other variants → \`mode: \"subscription\"\` for legacy compat? NO —
  that's a lie. Better: extend \`mode\` to the full union too, OR mark
  \`mode\` deprecated and point consumers at \`config.variant\`.

Decision for implementer: extend \`mode\` to mirror \`variant\` (cleanest),
OR deprecate \`mode\` with a getter that returns \`config.variant\`. Pick
the one that minimizes consumer breakage; document in the ADR.

## Out of scope

- \`PaymentsClient\` namespace rename (separate feature).
- Session encode/decode logic (separate feature).
- Validators (separate feature).

## Acceptance criteria (TDD)

- [ ] \`TributaryConfig\` discriminated union defined with all 6 variants
- [ ] Old flat shape accepted with deprecation warning (unit test)
- [ ] Old flat shape translated correctly to \`{ variant: 'subscription', ... }\`
- [ ] TypeScript narrows correctly on \`cfg.variant\` (discriminated union test)
- [ ] \`pnpm run build\` clean in \`packages/payments\`

## Handoff references

- \`packages/payments/src/types/tributary.ts\` — the file to change
- \`packages/payments/src/core/session.ts:86-147\` — \`create()\` consumer of TributaryConfig
- Milestone tributary-f6yh — design decisions (Axis 5)
