---
# tributary-bmlb
title: Gateway management surface in apps/app
status: todo
type: feature
priority: normal
created_at: 2026-06-28T11:21:44Z
updated_at: 2026-06-28T11:21:44Z
parent: tributary-m96d
---

apps/app should host a gateway-management surface for gateway authorities — rotate signer, change fee bps, change fee recipient, toggle feature flags, view/configure referral program. Pairs naturally with the existing referral-account-form.tsx (referral codes are gateway-scoped).

Surfaced during apps/app grilling: referral management already lives in app and is gateway-scoped, so gateway mgmt belongs alongside it. Lands after the split epic (app is pure owner-dashboard).

Scope TBD — does it cover ProgramConfig (protocol admin) too, or only per-gateway PaymentGateway settings? Probably per-gateway only; protocol admin is a separate ops concern.
