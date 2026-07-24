---
# tributary-5r2d
title: 'Deferred: account delta check recipe'
status: draft
type: task
priority: low
created_at: 2026-07-24T10:35:30Z
updated_at: 2026-07-24T10:35:30Z
parent: tributary-69jm
---

Account delta post-validation recipe using Lighthouse accountDelta (2-account assertion). 'Did balance change by >= X'. Program already enforces >0 output guard in deliver-transform mode, so delta check is only useful for custom settlement verification or act-mode external accounts. Trigger: concrete use case appears. Interim: lighthouseValidation escape hatch. Deferred from day-one scope per grilling session Q7.
