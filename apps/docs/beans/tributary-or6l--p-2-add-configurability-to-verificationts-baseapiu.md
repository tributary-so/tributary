---
# tributary-or6l
title: 'P-2: Add configurability to verification.ts baseApiUrl'
status: completed
type: task
priority: low
created_at: 2026-07-06T15:42:10Z
updated_at: 2026-07-06T16:47:42Z
parent: tributary-fzak
---

payments/src/core/verification.ts — hardcoded baseApiUrl default. Accept as parameter or config.

## Summary of Changes
Exported DEFAULT_BASE_URL, DEFAULT_ISSUER, DEFAULT_AUDIENCE from packages/payments/src/core/verification.ts (previously file-private). The verifier itself was already configurable via TributaryVerificationConfig + TRIBUTARY_BASE_URL/TRIBUTARY_ISSUER/TRIBUTARY_AUDIENCE env vars; the fix exposes the defaults so consumers can reference them when building config, and adds doc comments pointing at the config knobs.
