---
# tributary-nog1
title: "SDK: warn on act-mode composable policy built without post_validation"
status: completed
type: feature
created_at: 2026-07-22T12:11:23Z
updated_at: 2026-07-22T12:30:00Z
parent: tributary-mygq
---

Act mode (ADR-0026) has NO on-chain output guard — the forward consumes input for a non-token settlement and Tributary asserts nothing about what was delivered. The owner's post_validation is the only backstop.

Add a builder-time warning to the SDK composable policy builder: when an act-mode policy (forward enabled + sentinel output_mint) is created WITHOUT a post_validation ProgramCall, emit console.warn pointing at the security gap and the docs.

Scope: packages/sdk only. No program change. No enforcement — the post_validation target is use-case-specific (external settlement account), so Tributary cannot validate it on-chain.

Acceptance:

- Builder detects act-mode + no post_validation ProgramCall.
- Emits a clear console.warn with a link to the docs page (see sibling docs feature).
- Does NOT block creation (warn, not throw).

## Summary of Changes

- **`packages/sdk/src/sdk.ts`**: new exported pure function
  `actModePostValidationWarning(forwardConfig, postValidation): string | null`
  that returns the warning message when act mode is detected without a
  post_validation ProgramCall, or null otherwise. Wired into
  `getCreateComposablePolicyInstruction` (the single chokepoint all
  composable creation paths route through — covers `createComposable`
  and `createComposableWithMetadata`).
- **`packages/sdk/src/__tests__/act-mode-post-validation-warning.test.ts`**:
  4 tests covering all branches — warns on act-mode + no post_validation;
  silent on act-mode + post_validation present; silent on deliver-transform;
  silent on forward-disabled (sentinel outputMint without forward is not
  act mode).
- All 17 SDK unit tests pass; lint clean; typecheck clean.
