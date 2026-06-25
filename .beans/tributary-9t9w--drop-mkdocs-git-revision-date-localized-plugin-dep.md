---
# tributary-9t9w
title: Drop mkdocs-git-revision-date-localized-plugin dep
status: todo
type: task
created_at: 2026-06-25T12:41:09Z
updated_at: 2026-06-25T12:41:09Z
parent: tributary-916s
---

pyproject.toml pins mkdocs-git-revision-date-localized-plugin==1.5.1 but the plugin is never listed under plugins: in mkdocs.yml (confirmed: grep git-revision|revision_date mkdocs.yml docs/ returns nothing). Remove the line from apps/docs/pyproject.toml dependencies. Parent: tributary-916s.
