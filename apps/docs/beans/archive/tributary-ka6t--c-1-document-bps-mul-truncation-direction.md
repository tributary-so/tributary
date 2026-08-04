---
# tributary-ka6t
title: 'C-1: Document bps_mul truncation direction'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:41:47Z
updated_at: 2026-07-06T15:56:13Z
parent: tributary-u5vf
---

Add doc comment to bps_mul in shared/fees.rs noting truncation toward zero and ~40K lamport dust bound per payment.

## Summary of Changes
Added doc comment to bps_mul in shared/fees.rs noting truncation toward zero (integer division drops remainder, result ≤ exact value) and the worst-case dust bound (<10000 base units, ~40K lamports at 1 SOL).
