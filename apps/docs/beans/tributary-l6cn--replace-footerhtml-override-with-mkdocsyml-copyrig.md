---
# tributary-l6cn
title: Replace footer.html override with mkdocs.yml copyright
status: completed
type: task
priority: normal
created_at: 2026-06-25T12:41:09Z
updated_at: 2026-06-25T12:52:57Z
parent: tributary-916s
---

docs/overrides/partials/footer.html (48 lines) hand-inlines Font Awesome SVGs for github+twitter, duplicating the extra.social: block already in mkdocs.yml (L131-135). The override only adds a 'Made with 💗' line. Replace: (1) add 'copyright: Made with 💗' to mkdocs.yml top level, (2) remove 'custom_dir: docs/overrides' from theme:, (3) delete docs/overrides/partials/footer.html and the now-empty docs/overrides/ tree. Parent: tributary-916s.

## Summary of Changes

- Added `copyright: Made with 💗` to apps/docs/mkdocs.yml.
- Removed `custom_dir: docs/overrides` from theme:.
- Deleted docs/overrides/partials/footer.html and the now-empty docs/overrides/ tree.
- Verified via `uv run mkdocs build`: copyright renders, both github + twitter social links render from the existing extra.social block.
- Bonus catch: footer.html had a stale twitter handle (tributary_so); mkdocs.yml canonical (tributaryso) now wins.
