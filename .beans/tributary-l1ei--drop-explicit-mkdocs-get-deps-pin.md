---
# tributary-l1ei
title: Drop explicit mkdocs-get-deps pin
status: todo
type: task
created_at: 2026-06-25T12:41:09Z
updated_at: 2026-06-25T12:41:09Z
parent: tributary-916s
---

apps/docs/pyproject.toml pins mkdocs-get-deps==0.2.2 explicitly, but it is a transitive auto-dependency of mkdocs itself. Drop the line; let mkdocs pull it. Parent: tributary-916s.
