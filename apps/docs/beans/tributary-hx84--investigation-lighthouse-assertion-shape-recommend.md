---
# tributary-hx84
title: 'Investigation: Lighthouse assertion shape + recommendation for intermediate-output post_validation'
status: todo
type: task
priority: normal
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T11:42:04Z
parent: tributary-mygq
---

Trace process_output_and_sweep (composable_policy.rs) to confirm what the existing >0 guard covers for deliver-transform. Determine if act mode has any backstop. Prototype the Lighthouse assertion (lighthouse.tokenAccount(intermediateOutputAta).amount(0, '>')) via the SDK facade. Produce the (a)/(b)/(c)/(d) recommendation per the epic body. If recommendation is enforce/default, create follow-up feature beans.
