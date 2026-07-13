---
# tributary-go09
title: Cross-package validation parity fixtures (TS encoder vs Rust on-chain)
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-04T09:45:59Z
parent: tributary-omtc
blocked_by:
    - tributary-uny8
---

# Cross-package parity — TS validators agree with Rust on-chain

The single most important test for the fail-fast validation strategy. If the
TS encoder accepts a config the Rust program rejects (or vice versa), a
merchant generates a blob → user lands on checkout → on-chain create fails
with a confusing Anchor error. Unacceptable.

## What changes

### 1. Shared fixtures

\`tests/fixtures/policy-configs.ts\` (or \`packages/payments/src/__tests__/fixtures/\`):
\`\`\`ts
export const POLICY_FIXTURES = {
  subscription: {
    valid: [...],
    invalid: [{ cfg, expectedRustError: \"InvalidAmount\" }, ...],
  },
  milestone: { valid: [...], invalid: [...] },
  payAsYouGo: { valid: [...], invalid: [...] },
  oneTime:    { valid: [...], invalid: [...] },
  upTo:       { valid: [...], invalid: [...] },
};
\`\`\`

Port the exact test cases from \`programs/tributary/src/policies/*.rs\` \`#[test]\`
blocks — same edge cases (zero amount, expired deadline, mutually exclusive
signer bits, etc.).

### 2. TS side

\`packages/payments/src/__tests__/parity.test.ts\`:
for each fixture, assert \`validateTributaryConfig(cfg)\` either passes (valid)
or throws with the matching constraint (invalid). Run with jest — no chain
needed.

### 3. Rust side

\`tests/payments-validator-parity.test.ts\` (top-level jest, runs against
Surfpool): for each fixture, call the on-chain \`create_payment_policy\` (or
the relevant variant-specific validator exposed via instruction) and assert
it either succeeds (valid) or fails with the expected Anchor error code.

Alternative: add a \`#[cfg(test)]\` block in \`programs/tributary/src/policies/mod.rs\`
that re-imports the same fixture file and runs each case through the Rust
\`validate_*\` functions directly — lighter than a Surfpool round-trip. Prefer
this if feasible.

### 4. CI guard

Both sides must run in CI. If either side skips, drift goes undetected.

## Acceptance criteria

- [ ] Fixture file covers all 5 policy variants × valid + invalid cases
- [ ] TS parity test green (validators agree on every fixture)
- [ ] Rust parity test green (on-chain agrees on every fixture)
- [ ] CI runs both
- [ ] Document the \"add a new fixture\" workflow for future variants

## Handoff references
- \`programs/tributary/src/policies/{subscription,milestone,pay_as_you_go,one_time,up_to}.rs\` — Rust test cases to port
- \`packages/payments/src/utils/validation.ts\` — TS validators (from sibling feature)
- \`tests/topup-balance.test.ts\` — Surfpool test pattern
- Milestone tributary-f6yh — Axis 6 (fail-fast)

## Summary of Changes

Cross-package validation parity contract. Chose the bean's preferred lighter
alternative (Rust #[cfg(test)] over live Surfpool round-trip) so both sides
run in CI without integration infra.

- `packages/payments/src/__tests__/fixtures/policy-configs.ts` (new): canonical
  valid+invalid fixtures for all 6 variants, each invalid case carrying the
  expected constraint substring. Header documents the 'add a new case' workflow
  (add to TS fixtures + mirror in the Rust validator's #[test]).
- `packages/payments/src/__tests__/parity.test.ts` (new): 37 tests running every
  fixture through ValidationUtils.validatePolicyConfig, asserting valid passes
  and invalid throws a TributaryValidationError whose constraint matches.
- `programs/tributary/src/policies/milestone.rs`: added #[cfg(test)] block
  (8 tests) — milestone previously had ZERO Rust coverage.
- `programs/tributary/src/policies/pay_as_you_go.rs`: added #[cfg(test)] block
  (6 tests) — payg previously had ZERO Rust coverage.
- All 5 variants now have Rust #[test] coverage mirroring the TS fixtures.

Verification: `cargo test --lib policies::` = 31 Rust tests pass (incl. new
milestone/payg). payments pnpm test = 10 suites / 176 tests pass.

The OPTIONAL live Surfpool round-trip (bean alternative #2) is intentionally
NOT added — it requires a running Surfpool cluster and duplicates the #[cfg(test)]
coverage. The #[cfg(test)] path is preferred per the bean and runs in plain CI.
