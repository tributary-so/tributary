---
# tributary-2r5m
title: Implement ComposablePolicyTracker
status: completed
type: task
priority: normal
created_at: 2026-07-16T10:23:11Z
updated_at: 2026-07-17T08:26:53Z
parent: tributary-3mho
blocked_by:
  - tributary-d8lf
---

In `packages/payments/src/core/tracking.ts` (or new `composable-tracking.ts`): add class ComposablePolicyTracker with getComposablePoliciesForOptions(options: PolicyLookupOptions) that delegates to sdk.getComposablePolicies(filters). Normalization: totalInput/totalOutput BN→number, decodeMemo (32-byte), strip padding/bump, carry policyAccount. Export a ComposablePolicyDetails type. Reuse PolicyLookupOptions (shared).

## Blocker (reported 2026-07-16)

Cannot implement per brief: `delegates to sdk.getComposablePolicies(filters)` — that SDK method does not exist yet. Only `getComposablePoliciesByUserPayment` and `getComposablePoliciesByGateway` are present in `packages/sdk/src/sdk.ts`.

Dependency: **tributary-d8lf** (`Implement getPaymentPolicies(filters) + getComposablePolicies(filters)`, status: todo) under epic tributary-oos2. That task must land first.

Milestone tributary-cbvp HANDOFF §5 (Definition of Done) lists the SDK combined-filter methods BEFORE `ComposablePolicyTracker implemented`, confirming the ordering. No `--blocked-by tributary-d8lf` was wired at dispatch time — dispatch gap.

Options for the human:

1. Land tributary-d8lf first (canonical path; matches brief's delegation contract).
2. Re-scope this bean to build memcmp filters inline (mirroring the existing `PaymentTracker.getPaymentPoliciesForOptions` at tracking.ts:94-135) and refactor to delegation later — diverges from the brief.

Stopped per dispatch contract: 'blocked on unmet dependencies → hordr blocked, then stop.' No code written.

## Blocker resolved (2026-07-17)

Dependency `tributary-d8lf` landed (`status: completed`): `sdk.getComposablePolicies(filters)` and `sdk.getPaymentPolicies(filters)` now exist in `packages/sdk/src/sdk.ts` (sdk.ts:3798). Blocker cleared; proceeded via the canonical delegation path (option 1).

## Summary of Changes

Added `ComposablePolicyTracker` class + `ComposablePolicyDetails` type to `packages/payments/src/core/tracking.ts` (appended to the same file as `PaymentTracker` — both are tracking concerns, one file).

- **`ComposablePolicyDetails`** — `Omit<ComposablePolicy, ...> &` override: `padding`/`bump` nulled, `memo` decoded to `string`, `totalInput`/`totalOutput`/`createdAt`/`updatedAt` BN→`number`, `policyAccount: PublicKey` carried. Matches milestone `tributary-cbvp` HANDOFF §2 contract.
- **`ComposablePolicyTracker.getComposablePoliciesForOptions(options)`** — delegates to `sdk.getComposablePolicies(filters)` and maps each raw `{publicKey, account}` through `normalizeComposable`.
- **`buildComposableFilters(options)`** (private) — translates `PolicyLookupOptions` into the SDK's `{userPayment?, gateway?, recipient?, trackingId?}` shape. `walletPublicKey`+`tokenMint` pair into a derived user-payment PDA (mirrors `PaymentTracker.getPaymentPoliciesForOptions`). The SDK owns the memcmp offsets (user_payment=9, gateway=41, memo=506, recipient=538) — no offset duplication in the tracker.
- Shared `PolicyLookupOptions` reused (no new options type). 32-byte memo path via SDK's `encodeMemo(id, 32)`; decode via SDK `decodeMemo`.

**Scope boundary:** `PaymentTracker` rename → `PaymentPolicyTracker` and the pre-existing PaymentPolicy memo=222 offset bug are owned by a sibling task; NOT touched here (surgical — `PaymentTracker` code path unchanged).

**Verification:**

- `pnpm --filter @tributary-so/sdk run build` — success (rebuilt workspace dep)
- `pnpm --filter @tributary-so/payments run build` (`tsc`) — clean
- `pnpm --filter @tributary-so/payments test` — 265/265 pass (11 suites; existing `PaymentTracker` tests unaffected)
