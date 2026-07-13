---
# tributary-blij
title: 'P1 Guide: Lighthouse assertions'
status: draft
type: task
priority: high
created_at: 2026-07-13T11:12:29Z
updated_at: 2026-07-13T11:12:29Z
parent: tributary-9825
---

**File:** new — `apps/docs/docs/guides/lighthouse-assertions.md` or similar

**From checklist §D:** P1 Guide: Lighthouse assertions. How to build validation guards (fluent SDK facade: `lighthouse.tokenAccount(...).amount(...).build()`).

**Requirements:**

- Cover all assertion families: tokenAccount, mintAccount, accountInfo, accountData, accountDelta (2 accounts), sysvarClock (0 accounts), stakeAccount, merkleTree
- Show operator sugar: "<", ">=", "!=", "in" alongside enum equivalents
- Show the full facade API with .build() return (data, numAccounts, accounts)
- Show both pre-validation and post-validation usage
- Show how to assemble ValidationPda + guard.accounts into remaining_accounts
- Reference the vendored Lighthouse SDK (packages/lighthouse/)

**Current code anchors:** packages/sdk/src/lighthouse/facade.ts, packages/lighthouse/

**Per ADR:** ADR-0013 (vendored Lighthouse facade), ADR-0021 (dual validation)

**Acceptance:** Covers full facade API. All examples compile. Developer can write any assertion type from this guide.
