---
# tributary-fqro
title: Test ComposablePolicyTracker filters
status: completed
type: task
created_at: 2026-07-16T10:23:11Z
updated_at: 2026-07-17T00:00:00Z
parent: tributary-3mho
blocked_by:
  - tributary-2r5m
---

Unit tests: filter by gateway, by user payment (wallet+mint), by recipient, by trackingId. Verify normalization (memo decoded, BN converted, padding stripped). Test against Surfpool if integration needed.

## Summary of Changes

Added 12 unit tests for `ComposablePolicyTracker` in `packages/payments/src/core/tracking.test.ts`, covering the full bean scope: filter translation (gateway, user-payment PDA derivation from wallet+mint, recipient, trackingId, combined), and normalization (memo decoded via `decodeMemo`, `totalInput`/`totalOutput`/`createdAt`/`updatedAt` BN→number, `padding`/`bump` stripped to undefined, `policyAccount` carried from the account publicKey, order preservation).

**Files touched:**

- `packages/payments/src/core/tracking.test.ts` — new `ComposablePolicyTracker` describe block (filter translation + normalization suites) with `makeComposableTracker()` and `makeRawComposableAccount()` helpers mirroring the existing `PaymentTracker` mock pattern.
- `packages/payments/src/__tests__/setup.ts` — added `decodeMemo` and `ComposablePolicy` to the global `@tributary-so/sdk` mock (necessary because `tracking.ts` imports `decodeMemo` at runtime for the normalization path; previously only `encodeMemo` was mocked).

**Design note:** `ComposablePolicyTracker` delegates filter-building to the SDK (`sdk.getComposablePolicies(filters)`) — it only translates `PolicyLookupOptions` into the SDK's `{userPayment?, gateway?, recipient?, trackingId?}` shape. Tests assert the translation + delegation, not memcmp offsets (those live in the SDK and are tested there). This mirrors the architectural split introduced in `tributary-2r5m` / `tributary-d8lf`.

**Verification:**

- `npx jest --testPathPattern='tracking.test'` — 23/23 pass (11 existing PaymentTracker + 12 new ComposablePolicyTracker)
- `pnpm --filter @tributary-so/payments test` — 277/277 pass (11 suites; +12 from baseline 265; no regressions from the setup.ts mock addition)
- `pnpm --filter @tributary-so/payments run lint` — clean
- `tsc --noEmit` — clean
