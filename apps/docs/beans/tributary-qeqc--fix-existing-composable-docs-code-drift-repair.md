---
# tributary-qeqc
title: Fix existing composable docs (code-drift repair)
status: draft
type: epic
priority: critical
created_at: 2026-07-13T11:08:36Z
updated_at: 2026-07-13T11:08:36Z
parent: tributary-6hl4
---

13+ docs in apps/docs/ have drifted from the current on-chain code. Each file needs a line-by-line audit against the actual SDK signatures, instruction accounts, flows, and constants (v2.2). Do NOT rewrite — surgically fix what's wrong. Priority order: integration-guide examples first (devs hit these first), then protocol-reference.
