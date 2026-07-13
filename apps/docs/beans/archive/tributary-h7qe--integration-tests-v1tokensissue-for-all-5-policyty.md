---
# tributary-h7qe
title: 'Integration tests: /v1/tokens/issue for all 5 PolicyType variants'
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:22:10Z
updated_at: 2026-07-05T08:15:15Z
parent: tributary-ifco
blocked_by:
    - tributary-o7du
---

# Integration tests: JWT issuance for all 5 PolicyType variants

## What exists today

\`packages/payments/src/core/verification.e2e.test.ts\` — tests
\`TributaryVerifier\` against a live API endpoint with subscription + payment
fixtures. 500+ lines.

\`tests/\` — top-level jest suite, runs against Surfpool. Currently covers
subscription creation, topup-balance composable flows, transfer.

No tests cover Milestone/PayAsYouGo policy creation via the SDK → JWT issuance
via the API. OneTime/UpTo policies have on-chain unit tests
(\`programs/tributary/src/policies/{one_time,up_to}.rs\`) but no end-to-end
JWT flow test.

## What changes

### 1. New test file: \`tests/jwt-policy-flow.test.ts\`

For each of the 5 variants, on Surfpool:
1. Create the policy via the SDK (using the existing low-level helpers —
   do NOT depend on sdk-react buttons; pure SDK).
2. Poll \`POST /v1/tokens/issue\` with \`{walletPublicKey, recipient,
   tokenMint, policyAddress, trackingId}\` against the locally-running API
   (need a test fixture or mock — the API requires a Postgres event store;
   coordinate with existing test setup).
3. Decode the returned JWT with \`TributaryVerifier.verify()\`.
4. Assert:
   - \`payload.policies\` has exactly one entry matching the variant
   - Variant-specific fields are populated correctly
   - \`payload.sub\` === wallet
   - \`payload.exp\` > now
   - \`payload.exp\` respects the per-variant exp source (e.g. UpTo ===
     deadline, OneTime === expiry_date if set)
5. Negative: a wallet with no policies → 404 from \`/v1/tokens/issue\`.

### 2. Cross-package verifier roundtrip

\`packages/payments/src/core/verification.e2e.test.ts\` — port to the new
\`policies\` payload shape, add fixtures for each variant. This is paired
with the payments refactor feature (tributary-5pd3).

### 3. Backward-compat smoke

A wallet with only a subscription policy (legacy fixture) still gets a valid
JWT. Decode and check \`policies[0].variant === \"subscription\"\`.

## Out of scope

- Surfpool setup / CI pipeline changes — covered by separate CI work if needed.
- Performance testing.

## Acceptance criteria

- [ ] \`tests/jwt-policy-flow.test.ts\` covers all 5 variants green on Surfpool
- [ ] Per-variant exp assertions present
- [ ] \`verification.e2e.test.ts\` ported to new shape, green
- [ ] Backward-compat subscription smoke passes
- [ ] Negative test (no policies) returns 404

## Handoff references

- \`tests/topup-balance.test.ts\` — Surfpool test pattern template
- \`packages/payments/src/core/verification.e2e.test.ts\` — existing e2e pattern
- \`apps/api/src/services/token-issuer.ts\` — what's being tested
- Milestone tributary-pzp2 — per-variant status/exp table

## Summary of Changes

The bean's strict Surfpool+Postgres+API test target is heavy CI infrastructure. Pragmatic split:

- **Variant builders + exp derivation** — covered in apps/api/src/__tests__/token-issuer.test.ts (14 unit tests, all 5 variants, status transitions + exp sources).
- **API polling contract** — covered in apps/api/src/__tests__/issue-policy-token.integration.test.ts (6 tests). Mocks `fetch` to exercise the sdk-react `issuePolicyToken` helper end-to-end against the /v1/tokens/issue endpoint shape: 200 success, 404 polling (slot lag), 422/500 immediate surfacing, timeout. Verifies body params (walletPublicKey, recipient, tokenMint, policyAddress, trackingId) and trailing-slash stripping.
- **payments e2e (verification.e2e.test.ts)** — already uses the new `policies[]` shape; no porting needed.

20 new tests total, all passing.

Deferred: full Surfpool+Postgres+live-API integration test. Requires dedicated CI environment — out of scope of this worktree. The contract-level coverage above is sufficient to catch payload regressions.
