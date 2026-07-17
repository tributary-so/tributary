---
# tributary-3vcp
title: 'SDK: find gateways by signer pubkey + scheduler integration'
status: completed
type: task
priority: normal
created_at: 2026-07-17T06:52:49Z
updated_at: 2026-07-17T07:00:19Z
---

Add Tributary.getPaymentGatewaysBySigner() to SDK using memcmp at offset 188 (signer field). Update apps/scheduler payments.ts + composable.ts to discover gateways by signer instead of assuming keypair==authority. A signer can manage multiple gateways.

## Summary of Changes

- **SDK** (`packages/sdk/src/sdk.ts`): Added `getPaymentGatewaysBySigner(signer)` — memcmp filter on PaymentGateway.signer at Borsh offset 188. Returns all gateways a signer manages (can be multiple).
- **PaymentScheduler** (`apps/scheduler/src/payments.ts`): Now queries gateways by signer pubkey instead of assuming keypair==authority. Iterates all returned gateways per signer keypair.
- **ComposableScheduler** (`apps/scheduler/src/composable.ts`): Added `signerToGatewayPdas` map. `start()` discovers all gateways by signer. `rescanAll()` scans ComposablePolicy accounts across every gateway PDA the signer manages, aggregating into `watched`.
- Removed unused `getGatewayPda` import from composable.ts.
- All lint + typecheck passing.
