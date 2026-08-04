---
# tributary-j9fq
title: Migrate topup-balance-swap-whirlpool test to tier-3 recipe layer
status: completed
type: task
priority: normal
created_at: 2026-07-26T19:00:53Z
updated_at: 2026-07-26T19:13:16Z
---

Collapse per-test forward + validation boilerplate in tests/topup-balance-swap-whirlpool.test.ts onto composablePolicyRecipe + recipientOutputBalanceCheck (tier 2) + createWhirlpoolForward (tier 1) + buildComposableExecutionPayload (tier 3 fire helper). Whirlpool has no createSwapWhenBalanceLow named recipe (out of ADR-0033 day-one scope), so use the tier-2+3 escape hatch the ADR prescribes for the long tail. Same assertions, same flow, ~70 lines of setup collapsed. Mirrors tributary-16wm migration pattern.

## Summary of Changes

Migrated tests/topup-balance-swap-whirlpool.test.ts onto the tier-3 recipe layer, collapsing the per-test forward/validation boilerplate. Net −128/+70 lines (~58-line reduction).

- Setup test: replaced manual lighthouse guard + programCallSpec/validationInit/DISABLED_* assembly with recipientOutputBalanceCheck (tier 2) + composablePolicyRecipe (tier 3). Used the ADR-0033 escape hatch for forward programs without a named recipe — tiers 1+2+3 composed directly (Whirlpool has no createSwapWhenBalanceLow; out of ADR-0033 day-one scope, deferred to a separate bean if ever needed).
- Each execute test (1 happy + 2 negative): replaced createWhirlpoolForward().build() + resolveValidationTargets(×2) + assembleComposableRemainingAccounts with a single buildComposableExecutionPayload call.
- forwardBuilder captured at describe scope from createWhirlpoolForward() and reused across all execute tests (mirrors the meteora/raydium migration).
- console.warn spy suppresses the expected deliver-transform-no-post economic-gap warning from the enforcement posture (ADR-0033).
- Negative-test corruption offsets updated: remainingAccounts is now the assembled [pre(1), forward(17), post(0)] array, so pool-at-forward-slot-4 → assembled-index 5 (was index 4 when corrupting the un-assembled forward slice). Comment explains the layout.
- encodeMemo replaces the manual 32-byte buffer copy (matches meteora migration).
- Dropped imports: lighthouse, resolveValidationTargets, assembleComposableRemainingAccounts, DISABLED_SPEC, DISABLED_INIT, programCallSpec, validationInit, ./helpers/composable. Added: buildComposableExecutionPayload, composablePolicyRecipe, encodeMemo, recipientOutputBalanceCheck, type ForwardBuilder.

All original assertions preserved verbatim. Lint clean. TypeScript clean (no errors in the migrated file; pre-existing errors in apps/api and apps/app are unrelated).

Verification was static (jest requires a running surfpool): every imported symbol resolves to a confirmed export in packages/sdk/src and packages/forward-builders/src, and every call site matches source signatures.
