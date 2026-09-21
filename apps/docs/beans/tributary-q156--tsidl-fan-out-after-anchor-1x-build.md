---
# tributary-q156
title: TS/IDL fan-out after anchor 1.x build
status: todo
type: epic
created_at: 2026-09-21T09:54:13Z
updated_at: 2026-09-21T09:54:13Z
---

anchor 1.x changes IDL emission (codama/program-metadata path); packages/sdk imports target/idl/tributary.json + target/types/tributary.js directly. Regenerate + fix sdk, sdk-react, apps, tests consumers.
