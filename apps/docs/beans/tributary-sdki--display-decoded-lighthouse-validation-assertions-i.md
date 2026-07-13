---
# tributary-sdki
title: Display decoded Lighthouse validation assertions in composable detail panel
status: completed
type: task
priority: normal
created_at: 2026-07-10T10:12:15Z
updated_at: 2026-07-10T13:54:45Z
parent: tributary-qpy3
---

Follow-up to tributary-h9ub. The ComposableDetailPanel (account-page.tsx:1455-1483) currently shows only 'Enabled'/'Disabled' labels for pre/post validation hooks. Decode and display the actual Lighthouse assertion data.

## Context

- decodeAssertionData is exported from @tributary-so/sdk (packages/sdk/src/lighthouse.ts:839, re-exported via index.ts:21)
- parseValidationPda, getPreValidationPda, getPostValidationPda also exported from @tributary-so/sdk
- Reference implementation: apps/cli/src/commands/pda/validation-pda.ts — fetches both ValidationPda accounts, parseValidationPda, then decodeAssertionData
- decodeAssertionData returns { kind, logLevel, assertions[] } or null
- ComposableDetailPanel is at account-page.tsx:1376; validation section at lines 1455-1483
- preValidationEnabled/postValidationEnabled already computed (lines 1394-1401)

## Acceptance criteria

- [ ] When composable policy selected, fetch pre + post ValidationPda accounts via getPreValidationPda/getPostValidationPda + connection.getAccountInfo
- [ ] Parse with parseValidationPda, decode with decodeAssertionData
- [ ] Replace 'Enabled'/'Disabled' labels with decoded assertion details (kind, operator, value) when enabled; keep 'Disabled' when not
- [ ] Graceful fallback: show raw hex or 'Unable to decode' if decodeAssertionData returns null
- [ ] No new dependencies (all from @tributary-so/sdk)
- [x] Lint + typecheck pass

## Summary of Changes

ComposableDetailPanel now fetches pre/post ValidationPda accounts on mount via useEffect, decodes the assertion data using parseValidationPda + decodeAssertionData, and displays decoded assertion details (kind, operator, value) via an AssertionInfo component. Falls back to 'Loading…' during fetch, 'Unable to decode' if decode returns null, and 'Disabled' when validation is not enabled.
