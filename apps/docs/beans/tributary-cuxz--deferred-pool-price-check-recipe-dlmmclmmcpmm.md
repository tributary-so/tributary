---
# tributary-cuxz
title: 'Deferred: pool price check recipe (DLMM/CLMM/CPMM)'
status: draft
type: task
priority: low
created_at: 2026-07-24T10:35:30Z
updated_at: 2026-07-24T10:35:30Z
parent: tributary-69jm
---

Pool price pre-validation recipe. Different pool types have different account layouts (DLMM bin-step, CLMM tick-spacing, CPMM reserves). Recipe would need pool-type-specific field offset parsers for Lighthouse accountData assertion. Trigger: first integrator needs 'only swap when pool price within X bps'. Interim: lighthouseValidation(lighthouse.accountData(pool).build()) escape hatch. Deferred from day-one scope per grilling session Q7.
