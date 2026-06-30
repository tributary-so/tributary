---
# tributary-fcmq
title: 'Dedup encodeSubscriptionUrl: showcase should use CheckoutSessionManager from @tributary-so/payments'
status: completed
type: bug
priority: normal
created_at: 2026-06-28T19:20:42Z
updated_at: 2026-06-29T06:52:04Z
---

Surfaced during m96d execution. apps/showcase-payment-policies/src/components/integration-snippet.tsx hand-rolls an encodeSubscriptionUrl function to build 'https://checkout.tributary.so/#/subscribe/<base64>' URLs. apps/checkout uses the canonical CheckoutSessionManager.encodeSubscriptionUrl() from @tributary-so/payments for the same format.

Two encoders for the same wire format = drift risk (if the URL scheme evolves, the showcase silently produces broken links). Fix: have integration-snippet.tsx call CheckoutSessionManager from @tributary-so/payments (would need to add @tributary-so/payments to the showcase's deps) and delete the hand-rolled copy.

Low priority — both encoders currently produce correct output. But it's a latent bug.

## Investigation result (2026-06-28) — NOT a simple dedup; escalated low->normal

Premise was wrong: 'showcase hand-rolls, checkout uses canonical, swap them.' The canonical (CheckoutSessionManager) is ITSELF buggy, and the two encoders diverge in TWO ways:

1. URL ROUTING: apps/checkout uses HashRouter (main.tsx:3,10). Showcase emits `/#/subscribe/` (CORRECT for HashRouter). CheckoutSessionManager.encodeUrl emits `/subscribe/` (session.ts:160, NO hash — WRONG for HashRouter, would 404 on static hosting without SPA fallback). So swapping showcase -> CheckoutSessionManager as-is would BREAK the URL scheme.

2. PAYLOAD SCHEMA: CheckoutSessionManager emits + requires `m` (mode: 'subscription'|'payment') — EncodedSessionData.m (session.ts:43), enforced by validateDecodedData (!data.m, session.ts:211). Showcase's hand-rolled encoder OMITS `m` (integration-snippet.tsx:113-126). So showcase-generated URLs would FAIL validation if decoded by the canonical decoder, AND checkout's pay-page.tsx:77 reads sessionData.mode to distinguish subscription vs one-time — an undefined mode misroutes.

Net: BOTH encoders are buggy in different ways. Showcase = correct URL scheme, wrong payload. CheckoutSessionManager = correct payload, wrong URL scheme.

Resolution requires (NOT a quick swap):
- Fix CheckoutSessionManager.encodeUrl to emit /#/subscribe/ and /#/pay/ (add hash) — affects apps/checkout's own link generation too, needs verification against checkout's deployment (SPA fallback? GH Pages?).
- Then swap showcase to use CheckoutSessionManager (now correct on both axes).
- OR: add `m` to the showcase encoder (keeps its correct URL scheme, fixes payload) and leave CheckoutSessionManager's hash bug as a separate issue.

Scope is now cross-package (packages/payments + apps/checkout + apps/showcase-payment-policies). Recommend a focused grilling before touching — needs a decision on canonical URL scheme (depends on checkout deployment) and whether CheckoutSessionManager's hashless URL is a live bug or masked by an SPA fallback.

## Summary of Changes (2026-06-28)

Resolved per grilling Q1 (option a + LineItem import). apps/showcase-payment-policies/src/components/integration-snippet.tsx now uses the canonical encoder:

- Deleted the hand-rolled encodeSubscriptionUrl function (lines 99-131).
- Added module-level singleton: `const checkoutManager = new CheckoutSessionManager(); checkoutManager.setBaseUrl('https://checkout.tributary.so/#')` — setBaseUrl injects the '#' so encodeUrl emits a HashRouter-friendly URL (apps/checkout uses HashRouter). The hashless-default 'bug' in encodeUrl was never a bug; it's a config knob.
- Call site now: `checkoutManager.encodeSubscriptionUrl({ mode: 'subscription', ... })`.
- Replaced the local LineItem interface with `import { CheckoutSessionManager, type LineItem } from '@tributary-so/payments'` (structurally identical; barrel re-exports both).
- Kept local generateTrackingId (still used at call site; out of scope).
- Added @tributary-so/payments (workspace:*) to the showcase's package.json.

LATENT BUG FIXED: the old encoder omitted the 'm' (mode) field, which CheckoutSessionManager.validateDecodedData requires (!data.m). Old showcase-generated URLs would have failed decode in apps/checkout. The canonical encoder emits mode, so generated URLs now decode correctly.

Build + lint clean (3 pre-existing react-refresh warnings only).
