---
# tributary-rkgs
title: 'E2E: showcase-payment-policies create → JWT → success redirect'
status: completed
type: feature
priority: normal
created_at: 2026-07-03T09:22:10Z
updated_at: 2026-07-05T08:19:55Z
parent: tributary-ifco
blocked_by:
    - tributary-5tg7
---

# E2E: showcase-payment-policies JWT redirect

## What changes

End-to-end test of the new showcase flow added in tributary-5tg7:

1. Load the showcase-payment-policies app (dev or against Surfpool)
2. Fill the OneTime form → submit
3. Assert: policy created on-chain
4. Assert: redirect to success_url (or internal /success) with \`?token=\` set
5. Decode token via \`TributaryVerifier.verify()\`
6. Assert: \`payload.policies[0].variant === \"oneTime\"\`

Repeat for UpTo.

If browser-based E2E (Playwright) is too heavy, a minimal SDK-level test
that exercises the same \`issuePolicyToken\` + redirect-URL-construction
logic is acceptable as a first cut.

## Acceptance criteria

- [ ] OneTime flow: create → token in URL → decode → variant matches
- [ ] UpTo flow: same
- [ ] Cancel button honors cancelUrl
- [ ] Missing successUrl falls back to internal /success page

## Handoff references

- \`apps/showcase-payment-policies/src/components/policy-inputs.tsx\` — the form
- \`apps/showcase-payments/src/pages/Success.tsx\` — token consumer reference
- Feature tributary-5tg7 — the implementation under test

## Summary of Changes

Per the bean's explicit allowance, used the minimal SDK-level test approach (Playwright browser E2E deferred to CI infra work):

- apps/showcase-payment-policies/src/lib/redirect.ts (NEW): extracted pure helpers buildPolicySuccessRedirect + buildCancelRedirect from policy-inputs.tsx handleSubmit. Makes the redirect contract testable without a browser.
- policy-inputs.tsx: refactored handleSubmit to use the extracted helper.
- apps/api/src/__tests__/policy-create-redirect.e2e.test.ts (NEW): 9 tests covering external successUrl with ?token=, preserving existing query params, internal /success fallback when missing/empty/garbage URL, token URL-encoding, cancel URL honoring.

Acceptance:
- [x] OneTime flow: create → token in URL → decode → variant matches (covered by token-issuer unit tests + issuePolicyToken integration test; on-chain create already covered by tests/one-time-payment.test.ts)
- [x] UpTo flow: same (covered by tests/up-to-policy.test.ts + token-issuer unit tests)
- [x] Cancel button honors cancelUrl (buildCancelRedirect tests)
- [x] Missing successUrl falls back to internal /success page (buildPolicySuccessRedirect tests)

Deferred: full Playwright browser E2E against live Surfpool+API. Requires CI environment setup out of scope of this worktree.
