---
# tributary-dfi4
title: Round-trip encode/decode tests for all 6 variants
status: todo
type: feature
priority: high
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-03T09:45:04Z
parent: tributary-omtc
blocked_by:
    - tributary-nx0s
---

# Round-trip encode/decode tests — all 6 variants

\`packages/payments/src/__tests__/session.roundtrip.test.ts\` (new file, or
extend existing \`session.test.ts\`).

For each of the 6 modes (subscription, milestone, payAsYouGo, oneTime, upto,
payment):
1. Construct a valid \`CheckoutParams\` arm.
2. \`encodeUrl(params)\` → string.
3. Extract blob from URL, \`decodeUrl(blob)\` → \`CheckoutParams\`.
4. Assert deep-equality with original (modulo serialization normalization).
5. Assert URL path is correct (\`/subscribe/\`, \`/pay/\`, \`/policy/\`).

Property test (if feasible): generate random valid configs per variant
(using the same generators as the parity test), round-trip, assert stable.

## Acceptance criteria

- [ ] All 6 variants round-trip green
- [ ] URL path assertion per variant
- [ ] Variant-specific fields preserved exactly (milestone amounts, payg caps, etc.)
- [ ] \`cluster\` field defaults to \"mainnet\" when absent
- [ ] Legacy \`encodeSubscriptionUrl\` round-trips too
- [ ] \`pnpm run test\` green in \`packages/payments\`

## Handoff references
- \`packages/payments/src/__tests__/session.test.ts\` — existing session tests
- \`packages/payments/src/core/session.ts\` — encoder under test
- Milestone tributary-f6yh
