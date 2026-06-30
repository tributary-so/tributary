---
# tributary-cwdz
title: Gateway selection from on-chain list (no create)
status: completed
type: task
priority: normal
created_at: 2026-06-25T12:45:43Z
updated_at: 2026-06-25T19:28:19Z
parent: tributary-vyg1
---

Refactor apps/topup-sol gateway handling: replace the custom-paste AccordionAdvanced with a GatewaySelect that fetches existing PaymentGateways via sdk.getAllPaymentGateway() (mirrors apps/app payment-policy-form) and renders a dropdown. Drop all auto-create logic from useCreateTopupPolicy. Rename form field customGateway -> gateway (now required).
