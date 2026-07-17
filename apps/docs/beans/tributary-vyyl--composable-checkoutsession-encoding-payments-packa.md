---
# tributary-vyyl
title: Composable checkout/session encoding (payments package)
status: draft
type: feature
priority: low
created_at: 2026-07-16T10:24:01Z
updated_at: 2026-07-16T10:24:01Z
parent: tributary-cbvp
---

Extend packages/payments with composable checkout session encoding (base64 session encoding for checkout page). Mirrors the PaymentPolicy checkout flow but includes ForwardConfig, ValidationSpec, and composable-specific fields. Covers: TributaryConfig composable variant, session create/encode/decode, checkout page rendering. DEFERRED - not needed for usemills.xyz read-only API work. Postpone until composable checkout UX is designed.
