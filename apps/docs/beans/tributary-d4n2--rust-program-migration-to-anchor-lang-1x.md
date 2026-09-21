---
# tributary-d4n2
title: Rust program migration to anchor-lang 1.x
status: scrapped
type: epic
priority: normal
created_at: 2026-09-21T09:54:13Z
updated_at: 2026-09-21T17:54:59Z
---

Version bumps + compile fixes in programs/tributary; v3 build verified via readelf.


## Reasons for Scrapping (2026-09-21)

Delivered by milestone tributary-6sn9: full Rust port to anchor-lang 1.2 (Context lifetimes, CpiContext Pubkey, resize, borsh to_vec) with 229 cargo tests + 232 Surfpool jest tests green on the v3 build. See ADR-0035.
