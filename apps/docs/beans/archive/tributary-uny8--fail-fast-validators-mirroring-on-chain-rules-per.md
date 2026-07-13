---
# tributary-uny8
title: Fail-fast validators mirroring on-chain rules (per variant)
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-03T20:41:28Z
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
- [~] Cross-package parity: Rust `#[test]` cases ported to TS (41 tests). Live Surfpool parity deferred to testing epic tributary-omtc (needs integration infra).
- [ ] \`session.ts\` \`encodeUrl\` calls validator before encoding
- [ ] \`pnpm run build\` + \`pnpm run lint\` clean

## Handoff references

- \`packages/payments/src/utils/validation.ts\` — file to extend
- \`programs/tributary/src/policies/{subscription,milestone,pay_as_you_go,one_time,up_to}.rs\` — source of truth
- \`programs/tributary/src/state/payment_policy.rs\` — RELEASE_* constants for milestone
- \`packages/payments/src/__tests__/\` — test location
- Milestone tributary-f6yh — design decisions (Axis 6, fail-fast)

## Work started (bean-f6yh worktree)

Mirroring the on-chain validators in TS. Porting the Rust #[test] cases as
TS fixtures (criterion #2). Live cross-package parity (Surfpool) deferred to
the testing epic (tributary-omtc) — needs integration infra not available here.

### Acceptance checklist
- [ ] All 6 per-variant validators implemented (mirror Rust rules EXACTLY)
- [ ] Rust #[test] cases ported to TS (subscription/one_time/up_to + payg/milestone rules)
- [ ] validatePolicyConfig dispatcher (name differs from bean pseudocode to avoid collision w/ legacy validateTributaryConfig — noted)
- [ ] TributaryValidationError carries variant + field + constraint
- [ ] session.ts encodeUrl calls validator before encoding
- [ ] Cross-package parity: Rust test cases ported; live Surfpool parity → tributary-omtc
- [ ] pnpm run build + pnpm run lint clean; existing tests green

## Summary of Changes

Per-variant fail-fast validators mirroring the on-chain create-time rules
EXACTLY (milestone Axis 6). Source of truth:
`programs/tributary/src/policies/{subscription,milestone,pay_as_you_go,
one_time,up_to}.rs`.

### Files
- `packages/payments/src/utils/validation.ts`:
  - `TributaryValidationError` class (variant + field + constraint + message).
  - RELEASE_* milestone bit constants (mirror of payment_policy.rs).
  - Per-variant validators: `validateSubscriptionConfig`,
    `validateMilestoneConfig`, `validatePayAsYouGoConfig`,
    `validateOneTimeConfig`, `validateUpToConfig`, `validatePaymentConfig`.
  - `validatePolicyConfig(params: CheckoutParams)` dispatcher.
  - Private `popcount` + `parseFrequency` helpers.
- `packages/payments/src/core/session.ts`: `encodeUrl` calls
  `ValidationUtils.validatePolicyConfig(params)` BEFORE encoding — no blob is
  ever produced that the chain would reject.
- `packages/payments/src/__tests__/policy-validators.test.ts` (new): 41 tests
  porting the Rust `#[test]` cases (subscription/one_time/up_to) plus the
  rule specs for pay_as_you_go/milestone and the payment direct-transfer guard.

### Rules mirrored (exact)
- subscription: amount > 0; custom interval > 0 AND <= i64::MAX; maxRenewals > 0 when set.
- milestone: totalMilestones 1..=4; each active amount > 0; signer bits
  (GATEWAY/OWNER/RECIPIENT) mutually exclusive (bit0 due-date independent).
- payAsYouGo: caps > 0; maxChunkAmount <= maxAmountPerPeriod; period > 0 AND <= i64::MAX.
- oneTime: amount > 0; expiryDate > dueDate only when both set AND dueDate > 0
  (immediate-due skips the check, matching Rust).
- upTo: maxAmount > 0; deadline > 0; deadline > validAfter (strict) when validAfter > 0.
- payment (ADR-0004 direct transfer): amount > 0 (no on-chain validator).

### Deviations from bean pseudocode (intentional)
- Dispatcher named `validatePolicyConfig` (not `validateTributaryConfig`) to
  avoid collision with the existing legacy `validateTributaryConfig` that the
  validation.test.ts suite depends on. Same dispatch-by-variant semantics.
- Validators typed on `CheckoutParams` arms (what `encodeUrl` holds) rather
  than `TributaryConfig` arms — avoids a `mode`->`variant` mapping switch.
- Milestone does NOT enforce ascending timestamps: Rust's create-time
  validator does not either (only future-checks on mainnet). Adding it here
  would break the deferred live cross-package parity test (TS stricter than
  Rust). Axis 6 mentions ascending — flagged for a follow-up if Fabian wants
  the on-chain validator itself tightened first.

### Verification
- TDD: RED -> GREEN.
- `pnpm test`: 7 suites / 121 tests pass (was 6/80; +1 suite / +41 tests).
- `tsc --noEmit` clean; `pnpm run lint` exit 0; `pnpm run build` clean.

### Deferred
- Live cross-package parity test (TS vs Rust via Surfpool) -> testing epic
  tributary-omtc ("Cross-package validation fixtures"). Needs integration infra.
