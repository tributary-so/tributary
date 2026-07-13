---
# tributary-9n9q
title: Commit ADRs + CONTEXT.md and wire into AGENTS.md/README.md
status: completed
type: task
priority: high
created_at: 2026-06-26T14:58:27Z
updated_at: 2026-06-26T15:04:37Z
---

User moved ADRs to apps/docs/adr/. Stage everything, add ADR-map to AGENTS.md, reference ADRs in README.md, commit.

## Summary of Changes

- ADRs verified against code by 5 parallel subagents; 6 of 13 corrected (0001, 0004, 0006, 0007, 0008, 0012). Code is authority.
- AGENTS.md: added apps/docs/adr/ + CONTEXT.md to Repository Layout; added new ADR section with full ADR-map (0001-0013) before SDK section.
- README.md: added adr/ subdir to monorepo tree, added CONTEXT.md reference, added orientation blockquote pointing new contributors at CONTEXT.md → AGENTS.md → ADRs.
- Stray beans (tributary-eldj from subagent, tributary-9n9q this tracker) landed in apps/docs/beans/ via .beans.yml config.
