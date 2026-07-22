---
# tributary-nog1
title: 'SDK: warn on act-mode composable policy built without post_validation'
status: todo
type: feature
created_at: 2026-07-22T12:11:23Z
updated_at: 2026-07-22T12:11:23Z
parent: tributary-mygq
---

Act mode (ADR-0026) has NO on-chain output guard — the forward consumes input for a non-token settlement and Tributary asserts nothing about what was delivered. The owner's post_validation is the only backstop.

Add a builder-time warning to the SDK composable policy builder: when an act-mode policy (forward enabled + sentinel output_mint) is created WITHOUT a post_validation ProgramCall, emit console.warn pointing at the security gap and the docs.

Scope: packages/sdk only. No program change. No enforcement — the post_validation target is use-case-specific (external settlement account), so Tributary cannot validate it on-chain.

Acceptance:
- Builder detects act-mode + no post_validation ProgramCall.
- Emits a clear console.warn with a link to the docs page (see sibling docs feature).
- Does NOT block creation (warn, not throw).
