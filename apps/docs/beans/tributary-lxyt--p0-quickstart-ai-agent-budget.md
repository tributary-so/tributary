---
# tributary-lxyt
title: 'P0 Quickstart: AI agent budget'
status: draft
type: task
priority: critical
created_at: 2026-07-13T11:12:23Z
updated_at: 2026-07-13T11:12:23Z
parent: tributary-9825
---

**File:** new — `apps/docs/docs/quickstarts/p0-ai-agent-budget.md` (new path, or follow existing quickstart convention)

**From checklist §D:** P0 Quickstart: AI agent budget. Copy-paste: create PayAsYouGo composable policy with spending cap + Lighthouse guard. Target <10 min TTFV.

**Requirements:**

- Uses PayAsYouGo PolicyType with spending cap (max_chunk_amount + max_amount_per_period + period_length)
- Lighthouse validation guard (balance check on the agent's wallet)
- Deliver-no-transform settlement (output_mint == input_mint)
- Forward config disabled (just validation)
- Full copy-paste: imports → setup → policy creation → delegate approval → execution
- Must compile against current SDK (packages/sdk/src/)

**Current code anchors:** packages/sdk/src/instructions/composable.ts, packages/sdk/src/lighthouse/

**Per ADR:** ADR-0024 (optional PayAsYouGo expiry), ADR-0026 (deliver-no-transform shape)

**Acceptance:** A developer can copy-paste from this doc and have a working policy in <10 minutes. All method signatures match current SDK. Include delegate approval step. Include sanity-check assertions.
