---
# tributary-ay5o
title: 'T5: Create-policy flow + success state'
status: todo
type: task
priority: normal
created_at: 2026-06-25T10:48:53Z
updated_at: 2026-06-25T10:49:15Z
parent: tributary-vyg1
blocked_by:
    - tributary-tp1g
---

Wire submit: src/hooks/useCreateTopupPolicy.ts (builds batched Transaction: createPaymentGateway-if-missing, createUserPayment-if-missing, createApprove delegate, getCreateComposablePolicyInstruction with PayAsYouGo + ForwardConfig(Meteora DLMM, NATIVE_OUTPUT flag from unwrap toggle, dataChecks from buildSwapDiscriminator) + lighthouse.accountInfo(hotWallet).lamports(thresholdLamports,'<').build(); sends via wallet adapter; returns sig), src/components/CreatePolicyButton.tsx (validates form, calls hook, loading state, error toast), src/components/SuccessCard.tsx (success-check transition + ExplorerLink to tx + policy PDA). Update Setup.tsx to render CreatePolicyButton + SuccessCard. Verify: full flow builds a valid-looking tx (against Surfpool if running, else dry-run instruction assembly without send).
