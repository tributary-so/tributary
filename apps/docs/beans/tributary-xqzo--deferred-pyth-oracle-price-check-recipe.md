---
# tributary-xqzo
title: 'Deferred: Pyth oracle price check recipe'
status: draft
type: task
priority: low
created_at: 2026-07-24T10:35:30Z
updated_at: 2026-07-24T10:35:30Z
parent: tributary-69jm
---

Pyth oracle price pre-validation recipe. Pyth price accounts have known layout (PriceFeed with price/ema_price/conf/exponent) but assertion is nuanced (aggregate vs confidence band, negative prices, exponent scaling). Pyth also migrating to pull-based PythNet. Trigger: first integrator needs oracle-gated execution. Interim: lighthouseValidation escape hatch. Deferred from day-one scope per grilling session Q7.
