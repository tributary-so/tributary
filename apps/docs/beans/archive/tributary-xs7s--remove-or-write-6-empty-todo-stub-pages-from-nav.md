---
# tributary-xs7s
title: Remove or write 6 empty TODO-stub pages from nav
status: completed
type: task
priority: normal
created_at: 2026-06-25T12:41:09Z
updated_at: 2026-06-25T13:01:45Z
parent: tributary-916s
---

Six .md files ship only a 'TODO scope (c):' placeholder and zero actual content, yet are linked in nav: docs/get-started/quickstart.md, docs/get-started/environments.md, docs/get-started/common-errors.md, docs/reference/glossary.md, docs/protocol-reference/payment-policy/overview.md, docs/integration-guide/pull-payments/overview.md (~108 lines total). Two options: (A) remove their nav entries + delete the files until someone writes them; (B) write the content. Recommend (A) — shipping 'this page will...' stubs to users is worse than a 404. Parent: tributary-916s.

## Summary of Changes

Deleted 6 TODO-only stub pages: get-started/{quickstart,environments,common-errors}.md, reference/glossary.md, protocol-reference/payment-policy/overview.md, integration-guide/pull-payments/overview.md. Removed their nav entries (and the now-empty Get Started + Reference top-level sections) from mkdocs.yml. Verified `uv run mkdocs build` succeeds with no orphan-nav warnings.
