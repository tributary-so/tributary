---
# tributary-u03u
title: 'C-04 remediation: admin key rotation + SECURITY.md'
status: completed
type: task
priority: high
created_at: 2026-06-17T14:50:11Z
updated_at: 2026-06-17T14:53:26Z
---

Update reports/C-04-no-admin-key-rotation.md with proposal: add set_admin instruction, defer multisig+timelock to Squads (no reinventing). Propose SECURITY.md distinguishing proposer/voter/executor roles.

## Summary of Changes

- reports/C-04-no-admin-key-rotation.md: replaced the textbook two-step propose/accept recommendation with (A) a single on-chain set_admin instruction, (B) deferral of multisig + timelock to Squads (no reinventing), including a comparison table and a 'Why not the textbook two-step pattern' section, plus updated References pointing to Squads docs and SECURITY.md.
- SECURITY.md (new): codifies the trust model (Squads vault PDA as admin), role separation (proposer/voter/executor), mandated Squads config, privileged instructions reference, and incident-response procedure.
