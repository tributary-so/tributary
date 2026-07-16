---
# tributary-ztee
title: Integration tests for new endpoints
status: todo
type: task
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T10:23:50Z
parent: tributary-xh0f
---

Write integration tests in apps/api/src/__tests__/ for: GET /payment-policies (filter combos), GET /payment-policies/:address, GET /payment-policies/:address/executions, GET /composable-policies (filter combos), GET /composable-policies/:address, GET /composable-policies/:address/executions. Test 400 cases (no filters, >3 filters, wallet without mint). Verify /subscriptions still returns same shape (deprecated but working).
