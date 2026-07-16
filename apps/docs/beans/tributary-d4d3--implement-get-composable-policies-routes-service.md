---
# tributary-d4d3
title: Implement GET /composable-policies routes + service
status: todo
type: task
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T10:23:50Z
parent: tributary-nwgr
---

Create apps/api/src/services/composable.ts with getComposablePolicyDetails(options) using ComposablePolicyTracker and normalizing response. Create apps/api/src/routes/composable-policies.ts with three routes: (1) GET / uses ComposablePolicyTracker. (2) GET /:address uses sdk.getComposablePolicy(address). (3) GET /:address/executions uses getComposableExecutionsByPolicyAddress. Register in routes/index.ts. OpenAPI annotations. Response normalization in service layer (forward_config, validation specs included).
