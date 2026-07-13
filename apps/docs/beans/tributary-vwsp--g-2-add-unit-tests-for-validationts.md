---
# tributary-vwsp
title: 'G-2: Add unit tests for validation.ts'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:11Z
updated_at: 2026-07-06T16:47:17Z
parent: tributary-fzak
---

packages/payments/src/utils/validation.ts — no unit tests exist.

## Summary of Changes
Added 47 new tests to packages/payments/src/utils/validation.test.ts covering validatePolicyConfig (dispatcher), validateSubscriptionConfig, validateMilestoneConfig, validatePayAsYouGoConfig, validateOneTimeConfig, validateUpToConfig, validatePaymentConfig, and TributaryValidationError. The file previously only covered validateTributaryConfig and validateCheckoutSessionParams. All 59 tests pass.
