---
# tributary-vd06
title: Rename PaymentTracker → PaymentPolicyTracker + delegate to SDK
status: completed
type: task
priority: normal
created_at: 2026-07-16T10:23:11Z
updated_at: 2026-07-17T09:05:00Z
parent: tributary-6f5k
blocked_by:
  - tributary-d8lf
---

In `packages/payments/src/core/tracking.ts`: rename class PaymentTracker → PaymentPolicyTracker. Refactor getPaymentPoliciesForOptions to delegate to sdk.getPaymentPolicies({userPayment, gateway, recipient, trackingId}) instead of building memcmp arrays directly. Keep SubscriptionStatus interface and getPoliciesByGateway/getPoliciesByOwner as thin wrappers. Update all imports across the codebase (grep for PaymentTracker).

## Summary of Changes

Renamed `PaymentTracker` → `PaymentPolicyTracker` and refactored `getPaymentPoliciesForOptions` to delegate to the SDK's combined-filter method `Tributary.getPaymentPolicies({userPayment?, gateway?, recipient?, trackingId?})` (sdk.ts:3782), mirroring the existing `ComposablePolicyTracker` delegation pattern. The SDK now owns all memcmp offsets; the tracker only translates `PolicyLookupOptions` → SDK filter shape via a new private `buildPaymentFilters(options)`. `SubscriptionStatus`, `getPoliciesByGateway`, and `getPoliciesByOwner` kept as thin wrappers. Return shape unchanged (raw `{publicKey, account: PaymentPolicy}[]`).

- `packages/payments/src/core/tracking.ts` — class rename + `buildPaymentFilters` + delegating `getPaymentPoliciesForOptions`; dropped now-unused `bs58` / `GetProgramAccountsFilter` / `encodeMemo` imports; updated two `{@link}` JSDoc refs in the `ComposablePolicyTracker` block.
- `packages/payments/src/core/client.ts` — import/type/error-message/JSDoc (`PaymentTracker` → `PaymentPolicyTracker`).
- `packages/payments/src/core/session.ts` — stale commented-out type hint.
- `packages/payments/example.ts` — import + construction call.
- `packages/payments/src/core/tracking.test.ts` — renamed `describe`/maker/import; rewrote the `getPaymentPoliciesForOptions` suite to assert delegation to `sdk.getPaymentPolicies` with the translated filter shape (no more memcmp-offset assertions, mirroring the composable block).
- `packages/payments/src/__tests__/client-policies.test.ts` — import + 9 `as unknown as PaymentPolicyTracker` casts.
- `apps/api/src/services/subscription.ts` — import + `new PaymentPolicyTracker(connection)`.
- `apps/api/src/routes/payment-policies.ts` — updated the ponytail note (rename landed).
- `apps/api/src/__tests__/payment-policies.route.test.ts` — stale `jest.mock` key.
- Public docs renamed for consistency: `packages/payments/README.md`, `apps/api/README.md`, `apps/api/SUBSCRIPTION_TEST_SUMMARY.md`.

Verification: `pnpm --filter @tributary-so/payments test` → 277/277 pass (11 suites). `pnpm --filter @tributary-so/api test` → 224/224 tests pass; the one failing _suite_ (`tokens-proxy.service.test.ts`) is pre-existing (missing `@tributary-so/tokens-client` module) and untouched by this change. `pnpm --filter @tributary-so/payments run lint` and `pnpm --filter @tributary-so/api run lint` clean. `tsc --noEmit` on `apps/api` clean for the renamed export after rebuilding `@tributary-so/payments`.
