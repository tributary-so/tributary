---
# tributary-9eyp
title: Document SDK composable read methods in apps/docs
status: completed
type: task
priority: normal
created_at: 2026-07-07T12:04:33Z
updated_at: 2026-07-07T12:18:14Z
parent: tributary-nxkz
blocked_by:
    - tributary-bq8r
---

Add documentation for the new composable read methods.

**File:** apps/docs/sdk-reference/composable-policy.md (or existing SDK reference page)

**Content:**
- Document each of the 4 new methods with signature + example
- Show ComposablePolicy account layout (field names, types)
- Explain the "read-only" nature — no execute/create from the app (this milestone scope)
- Cross-link to ADR-0007 (ComposablePolicy as separate account type)

**Acceptance:**
- [ ] All 4 methods documented with JSDoc + example
- [ ] ComposablePolicy field reference table
- [ ] mkdocs build clean



## Summary of Changes
Added 'Read methods' section to apps/docs/docs/integration-guide/programmable-pull-payments/sdk.md. Covers all 4 methods with code examples, memcmp offset table (9/41), and field difference table (total_paid → total_input/total_output). mkdocs nav unchanged — page already in nav.
