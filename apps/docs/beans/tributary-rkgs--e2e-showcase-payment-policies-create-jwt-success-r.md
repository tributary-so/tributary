---
# tributary-rkgs
title: 'E2E: showcase-payment-policies create → JWT → success redirect'
status: todo
type: feature
priority: normal
created_at: 2026-07-03T09:22:10Z
updated_at: 2026-07-03T09:22:50Z
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
