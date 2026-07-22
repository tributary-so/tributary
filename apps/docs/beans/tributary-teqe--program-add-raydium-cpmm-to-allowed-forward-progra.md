---
# tributary-teqe
title: 'Program: add Raydium CPMM to ALLOWED_FORWARD_PROGRAMS'
status: todo
type: feature
priority: high
created_at: 2026-07-22T11:41:22Z
updated_at: 2026-07-22T11:41:22Z
parent: tributary-404h
---

Add CPMM program id to the on-chain allowlist in programs/tributary/src/constants.rs. This is the hard gate — without it no SDK work matters. Includes qedspec + formal_verification regen per AGENTS.md.
