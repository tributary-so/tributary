---
# tributary-uny8
title: Fail-fast validators mirroring on-chain rules (per variant)
status: todo
type: feature
priority: high
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-03T09:45:04Z
parent: tributary-pg7r
---

# Fail-fast validators — mirror on-chain rules in TS

## What exists today

\`packages/payments/src/utils/validation.ts\` — \`ValidationUtils.validateCheckoutSessionParams()\`.
Today validates only subscription/payment basics (amount > 0, valid public
keys, valid frequency). Does NOT mirror the on-chain validators per variant.

On-chain validators (the source of truth):
- \`programs/tributary/src/policies/subscription.rs\`
- \`programs/tributary/src/policies/milestone.rs\` — totalMilestones 1-4,
  current < total, escrow > 0, amounts > 0, signer-bits mutually exclusive
- \`programs/tributary/src/policies/pay_as_you_go.rs\`
- \`programs/tributary/src/policies/one_time.rs\` — amount > 0, expiry > due
  (when both set and due > 0)
- \`programs/tributary/src/policies/up_to.rs\` — maxAmount > 0, deadline > 0,
  deadline > validAfter (when validAfter > 0)

## What changes

### 1. Per-variant validator functions

\`\`\`ts
export function validateSubscriptionConfig(cfg: SubscriptionConfig): void;
export function validateMilestoneConfig(cfg: MilestoneConfig): void;
export function validatePayAsYouGoConfig(cfg: PayAsYouGoConfig): void;
export function validateOneTimeConfig(cfg: OneTimeConfig): void;
export function validateUpToConfig(cfg: UpToConfig): void;
export function validatePaymentConfig(cfg: PaymentConfig): void;   // direct transfer
\`\`\`

Each throws a descriptive \`TributaryValidationError\` on invalid input. Mirror
the on-chain rules EXACTLY — same field checks, same ordering constraints,
same edge cases (e.g. OneTime skips expiry check when \`dueDate <= 0\`).

### 2. Dispatch by variant

\`\`\`ts
export function validateTributaryConfig(cfg: TributaryConfig): void {
  switch (cfg.variant) {
    case \"subscription\": return validateSubscriptionConfig(cfg);
    case \"milestone\":    return validateMilestoneConfig(cfg);
    case \"payAsYouGo\":   return validatePayAsYouGoConfig(cfg);
    case \"oneTime\":      return validateOneTimeConfig(cfg);
    case \"upTo\":         return validateUpToConfig(cfg);
    case \"payment\":      return validatePaymentConfig(cfg);
  }
}
\`\`\`

Called from \`session.ts\` \`encodeUrl()\` BEFORE encoding. Invalid → throw,
never produce a blob the chain will reject.

### 3. \`TributaryValidationError\`

New error class extending \`Error\` with:
- \`variant: string\` — which variant failed
- \`field?: string\` — which field
- \`constraint: string\` — human-readable constraint violated

### 4. Cross-package fixture test

\`\`\`tests/payments-validator-parity.test.ts\`\`\` (or \`packages/payments/src/__tests__/parity.test.ts\`):
shared fixtures (valid + invalid configs per variant) run through BOTH the
TS validators AND the Rust validators (via a small surfpool test that calls
\`validate_*_policy\` on-chain). Drift = test failure.

This is the single most important acceptance criterion — TS validators MUST
agree with Rust validators on every fixture.

## Out of scope

- \`session.ts\` encode/decode logic (separate feature, but consumes these).
- \`TributaryConfig\` type definition (separate feature).

## Acceptance criteria (TDD)

- [ ] All 6 \`validate*Config\` functions implemented
- [ ] Each validator's edge cases match the Rust \`#[test]\` cases in
      \`programs/tributary/src/policies/*.rs\` (port the test names)
- [ ] \`validateTributaryConfig\` dispatches correctly by variant
- [ ] \`TributaryValidationError\` carries variant + field + constraint
- [ ] Cross-package parity test green (TS agrees with Rust on all fixtures)
- [ ] \`session.ts\` \`encodeUrl\` calls validator before encoding
- [ ] \`pnpm run build\` + \`pnpm run lint\` clean

## Handoff references

- \`packages/payments/src/utils/validation.ts\` — file to extend
- \`programs/tributary/src/policies/{subscription,milestone,pay_as_you_go,one_time,up_to}.rs\` — source of truth
- \`programs/tributary/src/state/payment_policy.rs\` — RELEASE_* constants for milestone
- \`packages/payments/src/__tests__/\` — test location
- Milestone tributary-f6yh — design decisions (Axis 6, fail-fast)
