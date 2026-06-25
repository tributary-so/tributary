---
# tributary-l6cn
title: Replace footer.html override with mkdocs.yml copyright
status: todo
type: task
created_at: 2026-06-25T12:41:09Z
updated_at: 2026-06-25T12:41:09Z
parent: tributary-916s
---

docs/overrides/partials/footer.html (48 lines) hand-inlines Font Awesome SVGs for github+twitter, duplicating the extra.social: block already in mkdocs.yml (L131-135). The override only adds a 'Made with 💗' line. Replace: (1) add 'copyright: Made with 💗' to mkdocs.yml top level, (2) remove 'custom_dir: docs/overrides' from theme:, (3) delete docs/overrides/partials/footer.html and the now-empty docs/overrides/ tree. Parent: tributary-916s.
