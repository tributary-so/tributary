---
# tributary-576z
title: 'Ponytail #12: delete Xargo.toml (legacy)'
status: completed
type: task
priority: high
tags:
    - ponytail
    - dead-config
created_at: 2026-06-24T12:38:46Z
updated_at: 2026-06-24T13:00:00Z
parent: tributary-9hca
---

`programs/tributary/Xargo.toml` is a leftover from the pre-1.14 Solana toolchain era when building for `bpfel-unknown-unknown` required a sysroot stub. Anchor 0.31 / Solana 1.18 / `cargo-build-spf` do not read it.

## Verification

- [x] `cat programs/tributary/Xargo.toml` — confirmed it is the legacy stub: `[target.bpfel-unknown-unknown.dependencies.std] features = []`
- [x] `cargo check` succeeds without it
- [x] `cargo test --lib` 60/0 without it

## Cut

`rm programs/tributary/Xargo.toml`

## Summary of Changes

- Deleted `programs/tributary/Xargo.toml` (2-line legacy sysroot stub).
- `cargo check` clean; `cargo test --lib` 60/0.

No behavior change. Anchor 0.31 / Solana 1.18 / `cargo-build-spf` do not consult this file — its contents (`[target.bpfel-unknown-unknown.dependencies.std] features = []`) were only load-bearing for Xargo-based sysroot builds pre-Solana-1.14.

## Files
- `programs/tributary/Xargo.toml` (delete)
