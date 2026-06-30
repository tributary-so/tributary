---
# tributary-l1ei
title: Drop explicit mkdocs-get-deps pin
status: completed
type: task
priority: normal
created_at: 2026-06-25T12:41:09Z
updated_at: 2026-06-25T12:49:43Z
parent: tributary-916s
---

apps/docs/pyproject.toml pins mkdocs-get-deps==0.2.2 explicitly, but it is a transitive auto-dependency of mkdocs itself. Drop the line; let mkdocs pull it. Parent: tributary-916s.

## Summary of Changes

Removed explicit `mkdocs-get-deps==0.2.2` line from pyproject.toml. Still present in uv.lock as a transitive dep of mkdocs.
