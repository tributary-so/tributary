---
# tributary-asim
title: 'Testing: gateway merchant layer'
status: todo
type: epic
priority: high
created_at: 2026-07-03T09:10:29Z
updated_at: 2026-07-03T09:10:29Z
parent: tributary-mohi
blocked_by:
    - tributary-6egw
---

Container epic for test coverage of the merchant layer. Closes when the integration-tests feature closes.

Scope: auth challenge/verify flow (valid signature, wrong signer, expired nonce, JWT gateway-claim enforcement) + merchant endpoint contracts (policies/subscribers/revenue CSV shape, empty-state, pagination, cross-gateway isolation). Mock the on-chain PaymentGateway account read in verify.

Blocked-by the implementation epic — write tests against the implemented contract (TDD: tests may be authored first, but the epic closes only when both land).
