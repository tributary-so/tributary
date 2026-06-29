---
# tributary-fcmq
title: 'Dedup encodeSubscriptionUrl: showcase should use CheckoutSessionManager from @tributary-so/payments'
status: todo
type: bug
priority: low
created_at: 2026-06-28T19:20:42Z
updated_at: 2026-06-28T19:20:42Z
---

Surfaced during m96d execution. apps/showcase-payment-policies/src/components/integration-snippet.tsx hand-rolls an encodeSubscriptionUrl function to build 'https://checkout.tributary.so/#/subscribe/<base64>' URLs. apps/checkout uses the canonical CheckoutSessionManager.encodeSubscriptionUrl() from @tributary-so/payments for the same format.

Two encoders for the same wire format = drift risk (if the URL scheme evolves, the showcase silently produces broken links). Fix: have integration-snippet.tsx call CheckoutSessionManager from @tributary-so/payments (would need to add @tributary-so/payments to the showcase's deps) and delete the hand-rolled copy.

Low priority — both encoders currently produce correct output. But it's a latent bug.
