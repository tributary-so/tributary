---
# tributary-blij
title: 'P1 Guide: Lighthouse assertions'
status: scrapped
type: task
priority: high
created_at: 2026-07-13T11:12:29Z
updated_at: 2026-08-04T20:06:46Z
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

## Reasons for Scrapping

REDUNDANT — apps/docs/docs/integration-guide/programmable-pull-payments/lighthouse-facade.md (verified DONE) already covers every requirement: all 8 assertion families (tokenAccount, mintAccount, accountInfo, accountData, accountDelta, sysvarClock, stakeAccount, merkleTree), operator sugar alongside IntegerOperator/EquatableOperator enums, .build() return type {data, numAccounts, accounts}, pre+post validation usage, ValidationPda assembly, LIGHTHOUSE_PROGRAM_ID import pattern. Creating a separate guides/lighthouse-assertions.md would duplicate content. The facade doc is the canonical reference.
