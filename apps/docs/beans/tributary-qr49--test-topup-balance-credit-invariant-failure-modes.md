---
# tributary-qr49
title: 'Test TopUp: balance credit, invariant, failure modes'
status: todo
type: task
assigned: tester
created_at: 2026-07-23T08:04:11Z
updated_at: 2026-07-23T08:04:11Z
parent: tributary-e5ji
blocked_by:
    - tributary-u64i
---

CROSS-REPO: /home/xeroc/projects/Tributary/ore, cargo test-sbf. Cover milestone tributary-ew9s HANDOFF §5 bullet 1 and §6 rows 2/3/5: credits balance by exactly amount; lamports == rent + balance invariant holds after top-up; closed automation reverts; amount > funder balance reverts; signer other than WSOL owner reverts.
