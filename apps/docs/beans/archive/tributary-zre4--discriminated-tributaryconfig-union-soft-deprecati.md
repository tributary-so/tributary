---
# tributary-zre4
title: Discriminated TributaryConfig union + soft-deprecation shim
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:43:47Z
updated_at: 2026-07-03T11:06:29Z
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

## Work started (bean-f6yh worktree)

Implementing the discriminated `TributaryConfig` union (6 variants: subscription, milestone, payAsYouGo, oneTime, upTo, payment) per Axis 5, plus a soft-deprecation shim (`resolveTributaryConfig`) that accepts the legacy interface, emits a console warning, and translates to the subscription variant.

### Acceptance checklist
- [x] New `TributaryConfig` discriminated union lands in `types/tributary.ts`
- [x] Legacy interface preserved as `LegacyTributaryConfig` (`@deprecated`)
- [x] `resolveTributaryConfig(input)` shim: old→new translation + deprecation warning
- [x] Minimal type plumbing so package still compiles + existing tests green
- [x] TDD: union + shim tests (RED → GREEN)
- [x] `pnpm test` + tsc clean (5 suites / 62 tests pass; payments tsc clean)

## Summary of Changes

Landed the discriminated `TributaryConfig` union (Axis 5) — the foundational type work that the session encoder (tributary-nx0s), per-variant validators (tributary-uny8), and client rename (tributary-gj27) all depend on.

### Files
- `packages/payments/src/types/tributary.ts`
  - New `TributaryConfig` discriminated union: all 6 coexisting modes (subscription, milestone, payAsYouGo, oneTime, upTo, payment). Amounts/timestamps typed as `number | string` so u64/i64 survive JSON round-trips through the base64 session blob. Mirrors on-chain `PolicyType` (`programs/tributary/src/state/payment_policy.rs`); the `payment` arm mirrors ADR-0004 direct transfer.
  - Old interface kept as `LegacyTributaryConfig` (`@deprecated`).
  - `resolveTributaryConfig(input)` shim: passes new-variant input through unchanged; translates legacy shape → `subscription` variant + emits a `console.warn` deprecation notice; rejects ambiguous input.
  - `TRIBUTARY_CONFIG_VARIANTS` + `isTributaryConfigVariant` guard + `SubscriptionFrequency` (mirrors the on-chain enum / SDK `PaymentFrequencyString`).
  - `TributaryCheckoutSession.tributaryConfig` widened to `TributaryConfig | LegacyTributaryConfig` for the deprecation window.
- `packages/payments/src/utils/validation.ts`: `validateTributaryConfig` now types against `LegacyTributaryConfig` (per-variant union validation is feature tributary-uny8).
- `packages/payments/src/__tests__/tributary-config.test.ts` (new): 10 tests — variant table, guard, passthrough for all 6 variants, legacy→subscription translation + warning, rejection of invalid input.

### Verification
- TDD: tests written RED first (type errors + missing symbols), then GREEN.
- `pnpm test` in `packages/payments`: 5 suites / 62 tests pass (was 4 suites / 52 tests — no regressions; +1 suite / +10 tests).
- `tsc --noEmit`: clean (the only prior error, `tracking.ts` SDK resolution, was pre-existing on baseline and cleared once the SDK workspace was built).
- `pnpm run lint` in the package: exit 0.

### Out of scope (sibling features, untouched)
- session.ts encode/decode of new variants + `/policy/` path → tributary-nx0s
- per-variant fail-fast validators mirroring the Rust rules → tributary-uny8
- `client.subscriptions` → `client.policies` rename → tributary-gj27
- monorepo grep for old API surface → tributary-c206
- README + ADR for encoding v2 → tributary-9ltg
