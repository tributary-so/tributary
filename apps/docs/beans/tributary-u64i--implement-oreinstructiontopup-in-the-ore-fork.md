---
# tributary-u64i
title: Implement OreInstruction::TopUp in the ORE fork
status: todo
type: task
created_at: 2026-07-23T08:04:11Z
updated_at: 2026-07-23T08:04:11Z
parent: tributary-e5ji
---

CROSS-REPO: /home/xeroc/projects/Tributary/ore. Add TopUp=26 to api/src/instruction.rs (+ args struct, instruction! macro), handler program/src/top_up.rs per milestone tributary-ew9s HANDOFF §4 pseudo-code and the E1 design doc, wire into program/src/lib.rs. Permissionless, deposit-only; hard-fail on closed automation / authority mismatch / over-transfer; credit exactly amount (never rent) to balance.
