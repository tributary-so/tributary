---
# tributary-cbvp
title: API Composable Policy Support + Payment Policy Endpoint Restructure
status: todo
type: milestone
priority: high
created_at: 2026-07-16T10:22:18Z
updated_at: 2026-07-16T10:22:18Z
---

## Goal

Make `apps/api` composable-policy-compatible with full read-only query parity.
Restructure payment-policy endpoints alongside. Primary consumer: usemills.xyz
dashboard (historic data per policy).

## Scope (confirmed via grilling session)

### New endpoints (all under `/api/v1`)

```
GET /payment-policies                              → list (filters)
GET /payment-policies/:address                     → single policy (RPC)
GET /payment-policies/:address/executions          → PaymentRecord events

GET /composable-policies                           → list (filters)
GET /composable-policies/:address                  → single policy (RPC)
GET /composable-policies/:address/executions       → ComposableExecuted events
```

- `/subscriptions` → DEPRECATED, untouched (thin alias kept for backward compat)
- `/onetime/:trackingId` → UNTOUCHED

### Refactors

| Area | Change |
|------|--------|
| Program (`events.rs`) | Add `memo: [u8; 32]` to `ComposableExecuted` event + update emit! |
| SDK (`types.ts`) | Export `IdlEvents<Tributary>` event types — single source of truth |
| SDK (`sdk.ts`) | Add combined-filter methods: `getPaymentPolicies(filters)` / `getComposablePolicies(filters)` with `{userPayment?, gateway?, recipient?, trackingId?}` |
| payments (`tracking.ts`) | Rename `PaymentTracker` → `PaymentPolicyTracker`. Add `ComposablePolicyTracker`. Both delegate to SDK |
| API (`db/events.ts`) | Replace hand-written interfaces with SDK imports. Add composable events to `TributaryEventName` + `EventDataMap` |
| API (`routes/`) | New `payment-policies.ts` + `composable-policies.ts` |
| API (`services/`) | New `composable.ts` service |
| API (`db/queries.ts`) | `getComposableExecutionsByPolicyAddress` + `getPaymentExecutionsByPolicyAddress` |

### Deferred (DRAFT bean)

- `packages/payments` checkout/session encoding for composables (base64 checkout page flow)

## HANDOFF

### 1. Happy Path

1. Merchant/integrator calls `GET /api/v1/composable-policies?gatewayPublicKey=X` → API delegates to `ComposablePolicyTracker.getComposablePoliciesForOptions(options)` → SDK `getComposablePolicies(filters)` → `program.account.composablePolicy.all(memcmp_filters)` → returns array of `{publicKey, account}` → tracker normalizes (BN→number, decodeMemo, strip padding/bump) → JSON response
2. Dashboard drills into a policy: `GET /api/v1/composable-policies/:address` → `program.account.composablePolicy.fetchNullable(address)` → normalize → JSON
3. Dashboard requests execution history: `GET /api/v1/composable-policies/:address/executions` → postgres query `events WHERE event_name = 'tributary_ComposableExecuted' AND data->>'composable_policy' = :address ORDER BY timestamp DESC` → map rows → JSON
4. Same three flows exist for `/payment-policies` (PaymentPolicy family, PaymentRecord events)

### 2. Data Contract

**Filter options (shared by both families):**
```typescript
interface PolicyLookupOptions {
  walletPublicKey?: string;
  tokenMint?: string;
  userPublicKey?: string;
  gatewayPublicKey?: string;
  recipient?: string;
  trackingId?: string;
}
```

**SDK combined-filter method signature:**
```typescript
async getPaymentPolicies(filters?: {
  userPayment?: PublicKey;
  gateway?: PublicKey;
  recipient?: PublicKey;
  trackingId?: string;
}): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>>

async getComposablePolicies(filters?: { /* same shape */ })
  : Promise<Array<{ publicKey: PublicKey; account: ComposablePolicy }>>
```

**PaymentPolicy memcmp offsets** (discriminator + fields in declaration order):
- user_payment: offset 8
- recipient: offset 8 + 32 = 40
- gateway: offset 8 + 32 + 32 = 72
- memo (trackingId): offset 8 + 32 + 32 + 32 + 118 = 222

**ComposablePolicy memcmp offsets** (bump BEFORE user_payment):
- user_payment: offset 9 (8 disc + 1 bump)
- gateway: offset 41 (9 + 32)
- recipient: at END of struct (after forward_config + validation specs) — SDK method or post-filter
- memo (trackingId): position TBD (32-byte memo)

**Response normalization (composable):**
```typescript
type ComposablePolicyDetails = Omit<ComposablePolicy, 'padding' | 'bump' | 'memo' | 'totalInput' | 'totalOutput' | 'createdAt' | 'updatedAt'> & {
  padding: undefined;
  bump: undefined;
  memo: string;
  totalInput: number;
  totalOutput: number;
  createdAt: number;
  updatedAt: number;
  policyAccount: PublicKey;
}
```

**Execution query (postgres):**
```sql
SELECT * FROM events
WHERE event_name = 'tributary_ComposableExecuted'
  AND data->>'composable_policy' = $1
ORDER BY timestamp DESC LIMIT $2 OFFSET $3;
```

**New route files:**
- `apps/api/src/routes/payment-policies.ts`
- `apps/api/src/routes/composable-policies.ts`

**Modules touched:**
- `programs/tributary/src/state/events.rs`
- `programs/tributary/src/instructions/composable/execute_composable.rs`
- `packages/sdk/src/types.ts`
- `packages/sdk/src/sdk.ts`
- `packages/payments/src/core/tracking.ts`
- `apps/api/src/db/events.ts`
- `apps/api/src/db/queries.ts`
- `apps/api/src/services/composable.ts` (new)
- `apps/api/src/routes/payment-policies.ts` (new)
- `apps/api/src/routes/composable-policies.ts` (new)
- `apps/api/src/routes/index.ts`

### 3. Edge Cases & Constraints

- ComposablePolicy has `bump` at offset 8 BEFORE `user_payment` — PaymentPolicy does NOT. memcmp offsets are NOT interchangeable.
- ComposablePolicy memo is `[u8; 32]`. PaymentPolicy memo is `[u8; 64]`. `decodeMemo`/`encodeMemo` handle both — confirm.
- Adding `memo` to `ComposableExecuted` is additive for postgres JSONB (old records → undefined). No migration.
- ComposablePolicy `recipient` at END of struct — exact memcmp offset needs calculation. May need post-filter fallback.
- ComposablePolicy uses `total_input`/`total_output` (not `total_paid`).
- `/subscriptions` MUST remain functional. Do NOT remove or redirect.
- Filter validation: same rules as `/subscriptions` (1-3 filters, walletPublicKey+tokenMint paired).
- Pagination: limit (default 100) + offset (default 0) on executions.

### 4. Business Logic

**Tracker filter composition:**
```
buildFilters(options):
  filters = []
  if walletPublicKey && tokenMint:
    userPaymentPda = deriveUserPaymentPda(walletPublicKey, tokenMint)
    filters.push(memcmp(offset_user_payment, userPaymentPda))
  if recipient:
    filters.push(memcmp(offset_recipient, recipient))
  if gatewayPublicKey:
    filters.push(memcmp(offset_gateway, gatewayPublicKey))
  if trackingId:
    encodedMemo = encodeMemo(trackingId, MEMO_SIZE)
    filters.push(memcmp(offset_memo, bs58.encode(encodedMemo)))
  return filters
```

**Response normalization:**
```
normalizeComposable({account, publicKey}):
  return { ...account,
    memo: decodeMemo(account.memo),
    padding: undefined, bump: undefined,
    totalInput: account.totalInput.toNumber(),
    totalOutput: account.totalOutput.toNumber(),
    createdAt: account.createdAt.toNumber(),
    updatedAt: account.updatedAt.toNumber(),
    policyAccount: publicKey }
```

### 5. Definition of Done

- [ ] ComposableExecuted event includes memo field
- [ ] anchor build succeeds, IDL updated
- [ ] SDK exports all event types via IdlEvents
- [ ] SDK has getPaymentPolicies(filters) + getComposablePolicies(filters)
- [ ] PaymentTracker renamed to PaymentPolicyTracker, all callers updated
- [ ] ComposablePolicyTracker implemented
- [ ] API events.ts uses SDK event types
- [ ] GET /payment-policies (list) works
- [ ] GET /payment-policies/:address (single) works
- [ ] GET /payment-policies/:address/executions works
- [ ] GET /composable-policies (list) works
- [ ] GET /composable-policies/:address (single) works
- [ ] GET /composable-policies/:address/executions works
- [ ] /subscriptions still works (deprecated, untouched)
- [ ] pnpm --filter @tributary-so/api test passes
- [ ] pnpm -r run lint clean
- [ ] make build succeeds

### 6. Test Matrix

- Given composable policy exists, When GET /composable-policies?gatewayPublicKey=X, Then response includes policy with variant, status, forward_config
- Given composable policy address, When GET /composable-policies/:address, Then full account data (total_input, total_output, memo decoded)
- Given executed composables, When GET /composable-policies/:address/executions, Then array of execution records
- Given payment policy, When GET /payment-policies?gatewayPublicKey=X, Then matches /subscriptions shape
- Given no filters, When GET /composable-policies, Then 400
- Given >3 filters, When GET /payment-policies, Then 400
- Given walletPublicKey without tokenMint, Then 400
- Given /subscriptions called, Then response unchanged

### 7. Open Questions

- ComposablePolicy recipient offset: at END of struct. Calculate exact byte offset or use post-filter. Assumption: calculate from layout; fallback to post-filter if too deep.
- DRAFT composable-checkout bean independent of this milestone. Assumption: yes.
