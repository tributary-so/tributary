---
# tributary-ksdy
title: 'SDK: wire InstructionConstraint + post_validation + two ValidationPDAs'
status: completed
type: feature
priority: high
created_at: 2026-07-02T11:43:16Z
updated_at: 2026-07-02T13:02:09Z
parent: tributary-l9qw
blocked_by:
    - tributary-cjhh
---

SDK compatibility for the new composable types. InstructionConstraint builder, post_validation assertion helpers, two ValidationPda derivation, updated executeComposable account layout.

## Summary of Changes

- Updated SDK constants: replaced SEEDS.VALIDATION_PDA with VALIDATION_PDA_PRE/POST, added MAX_PINNED_FORWARD_ACCOUNTS
- Updated pda.ts: replaced getValidationPda with getPreValidationPda/getPostValidationPda
- Updated types.ts: added InstructionConstraint + ValidationSpec types, removed ValidationConfig
- Updated sdk.ts: getCreateComposablePolicyInstruction now takes preValidation/postValidation + ValidationInit structs; executeComposable resolves pre/post validation PDAs + programs; deleteComposablePolicy passes both PDAs as remaining_accounts
- createPaymentGateway accepts initialFeatureFlags param
- SDK builds clean (tsup + tsc --noEmit)
