---
# tributary-ay5o
title: 'T5: Create-policy flow + success state'
status: completed
type: task
priority: normal
created_at: 2026-06-25T10:48:53Z
updated_at: 2026-06-25T11:27:37Z
parent: tributary-vyg1
blocked_by:
    - tributary-tp1g
---

Wire submit: src/hooks/useCreateTopupPolicy.ts (builds batched Transaction: createPaymentGateway-if-missing, createUserPayment-if-missing, createApprove delegate, getCreateComposablePolicyInstruction with PayAsYouGo + ForwardConfig(Meteora DLMM, NATIVE_OUTPUT flag from unwrap toggle, dataChecks from buildSwapDiscriminator) + lighthouse.accountInfo(hotWallet).lamports(thresholdLamports,'<').build(); sends via wallet adapter; returns sig), src/components/CreatePolicyButton.tsx (validates form, calls hook, loading state, error toast), src/components/SuccessCard.tsx (success-check transition + ExplorerLink to tx + policy PDA). Update Setup.tsx to render CreatePolicyButton + SuccessCard. Verify: full flow builds a valid-looking tx (against Surfpool if running, else dry-run instruction assembly without send).

## Summary of Changes

Create-policy flow + success state, wired into Setup:
- hooks/useCreateTopupPolicy.ts: builds batched tx (createPaymentGateway-if-missing w/ cold wallet authority, createUserPayment-if-missing, USDC ATA-if-missing, revoke+approve delegate=UserPayment PDA up to cap, createComposablePolicy with PayAsYouGo + ForwardConfig(Meteora DLMM, NATIVE_OUTPUT from unwrap toggle, dataChecks from buildSwapQuote discriminator) + lighthouse.accountInfo(hotWallet).lamports(threshold,'<') guard); sends via wallet-adapter, confirms.
- lib/form.ts: added validateForm() (pubkey/amount/period validation).
- components/SuccessCard.tsx: success-check transition (fade+rotate+blur+bob+path draw, dynamic stroke-length calibration via getTotalLength) + ExplorerLink to tx + policy PDA.
- components/CreatePolicyButton.tsx: status-aware button (preparing/sending/success), gates on validateForm, shows SuccessCard + 'Configure another' reset.
- pages/Setup.tsx: renders CreatePolicyButton under the steps.
- transitions.css: appended success-check snippet.
- pools.ts: FORWARD_FLAG_NATIVE_OUTPUT constant.

Verified: tsc -b clean, lint 0 errors (4 react-refresh co-location warnings matching apps/app), vite build succeeds (Setup lazy-chunk + meteora-vendor 446KB chunked separately).
