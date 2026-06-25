---
# tributary-uwa3
title: Delete 1,440 lines of dead neoteroi CSS
status: scrapped
type: task
priority: normal
created_at: 2026-06-25T12:41:09Z
updated_at: 2026-06-25T12:46:32Z
parent: tributary-916s
---

docs/css/mkdocsoad.css is 1,814 lines but the site only uses the [OAD(...)] directive (rest-api.md). Trim to the OAD block only (L1628-1814, ~187 lines). Kill: --nt-color-* palette (1-145), --nt-group-* palettes (147-379), .nt-group-N selectors (381-569), .nt-timeline CSS (571-913), gantt CSS (915-1413), span-table + .nt-contribs + .nt-cards CSS (1414-1627). Verify: grep for timeline|gantt|nt-cards|span-table|nt-contribs in docs/*.md returns nothing. Touch: docs/css/mkdocsoad.css, mkdocs.yml extra_css unchanged. Parent: tributary-916s.
