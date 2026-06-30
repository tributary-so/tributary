---
# tributary-916s
title: 'Audit: trim over-engineering in apps/docs'
status: completed
type: epic
priority: normal
created_at: 2026-06-25T12:40:43Z
updated_at: 2026-06-25T13:01:45Z
---

Ponytail audit of apps/docs (MkDocs Material site). Findings ranked biggest cut first. One child task per finding.

## Summary of Changes

Implemented 4 of 5 findings. tributary-uwa3 (dead CSS trim) was scrapped — vendored neoteroi CSS kept intact for future feature use.

Completed:
- tributary-9t9w: dropped mkdocs-git-revision-date-localized-plugin (+ transitive gitdb, gitpython, smmap, tzdata)
- tributary-l1ei: dropped explicit mkdocs-get-deps pin (now transitive)
- tributary-l6cn: replaced footer.html override with `copyright: Made with 💗` in mkdocs.yml; deleted docs/overrides/ tree. Bonus: fixed stale twitter handle (tributary_so → tributaryso)
- tributary-xs7s: deleted 6 TODO-stub pages + nav entries; Get Started + Reference top-level nav sections removed

Net: ~110 lines md + 48 lines html + 2 deps + docs/overrides/ dir removed. Build verified green (`uv run mkdocs build`).
