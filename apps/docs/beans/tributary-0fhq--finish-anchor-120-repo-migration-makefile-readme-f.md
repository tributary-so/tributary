---
# tributary-0fhq
title: Finish anchor-1.2.0 repo migration — Makefile, README, fuzz crate
status: completed
type: task
priority: normal
created_at: 2026-09-28T14:21:33Z
updated_at: 2026-09-28T14:27:02Z
---

HEAD (9445797c) migrated the program toolchain to anchor 1.2.0 / agave 3.1.10 / sBPFv3 but left repo-level pieces stale, per ~/Accord/accord (working reference):

- [x] Makefile: Accord pattern — ANCHOR_COMMAND=anchor-1.2.0, --arch v3 --tools-version v1.57 pins, prep installs (avm install+use), verify-sbf gains e_machine BPF + staleness checks, build gains anchor build (SDK imports target/idl/tributary.json — program must build first)
- [x] README.md: Anchor 0.31.1→1.2.0, Solana CLI 2.2.11→3.1.10, make prep claim, tree comment, available-scripts table
- [x] programs/tributary/fuzz/Cargo.toml: dead anchor-lang 0.31.1 dep (zero refs in targets; would dual-copy anchor trees)
- [x] apps/docs/docs/protocol-reference/idl.md: anchor 0.31.x → 1.2.x
- [x] rust-toolchain.toml (Accord parity)
- [x] Verify: anchor-1.2.0 build emits v3 ELF, make verify-sbf green, fuzz crate cargo check clean

## Summary of Changes

Follow-up to 9445797c (program-side migration was complete; repo-level pieces were stale). Aligned with ~/Accord/accord patterns:

- Makefile: ANCHOR_COMMAND=anchor-$(ANCHOR_VERSION) versioned-binary entry points, SBPF_ARCH/SBPF_TOOLS pins (--arch v3 --tools-version v1.57), prep now installs (avm install+use), verify-sbf gains e_machine BPF(247) check + staleness check + .PHONY, build target now builds the program first (packages/sdk imports target/idl/tributary.json — anchor build must precede pnpm builds), publish_idl/test/test_surfpool use the versioned binary.
- README.md: Anchor 1.2.0 + Agave 3.1.10 claims (tech stack, prerequisites, prep tip, tree, scripts table + new verify-sbf row, sBPFv3 note).
- fuzz/Cargo.toml: dropped dead anchor-lang 0.31.1 dep (zero refs in targets) — lockfile shed ~1000 lines of duplicate 0.31 dep tree; cargo check green.
- idl.md: anchor 0.31.x → 1.2.x.
- rust-toolchain.toml added (host stable + rustfmt/clippy; Accord parity).

Verified: make devnet_build → anchor-1.2.0 build emits e_flags 0x3 / CPU Version 3 / Machine BPF; verify-sbf green; staleness guard proven to fire (touched lib.rs → ✗ + exit 1, restored); make prep idempotent-green; fuzz crate cargo check clean.
