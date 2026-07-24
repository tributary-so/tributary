---
# tributary-ezpd
title: 'lighthouseValidation bridge: LighthouseAssertion → { spec, init }'
status: todo
type: task
priority: high
created_at: 2026-07-24T10:34:51Z
updated_at: 2026-07-24T10:34:51Z
parent: tributary-eznl
---

Pure function. Wraps programCallSpec(LIGHTHOUSE_PUBKEY) + makeValidationInit(guard.accounts.map(a=>a.pubkey), guard.data). Also the escape hatch for custom assertions not yet recipe'd. In packages/sdk/src/.
