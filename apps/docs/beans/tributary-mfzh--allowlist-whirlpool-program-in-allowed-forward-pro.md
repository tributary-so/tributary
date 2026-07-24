---
# tributary-mfzh
title: Allowlist Whirlpool program in ALLOWED_FORWARD_PROGRAMS
status: todo
type: task
priority: high
created_at: 2026-07-23T18:41:57Z
updated_at: 2026-07-23T18:41:57Z
parent: tributary-z893
---

Add `pubkey!("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"), // Orca Whirlpool` as the fourth entry of `ALLOWED_FORWARD_PROGRAMS` in `programs/tributary/src/constants.rs` (currently Meteora DLMM, Raydium CPMM, Raydium CLMM at lines 14-18).

Then rebuild the program: `anchor build`.

See milestone tributary-na7u HANDOFF §2 for the program id, §5 for DoD.

## Tasks

- [ ] Add Whirlpool pubkey to ALLOWED_FORWARD_PROGRAMS with comment
- [ ] anchor build green
