---
# tributary-6sn9
title: sBPFv3 migration — Anchor 0.31→1.x toolchain + v3 bytecode
status: completed
type: milestone
priority: normal
created_at: 2026-09-21T09:54:13Z
updated_at: 2026-09-21T15:04:39Z
---

SIMD-0500 (Agave v4.4 gate) will reject new deployments/upgrades/buffers of v0-v2 bytecode. Tributary's next program upgrade must be an sBPFv3 ELF. Safe v3 requires solana-define-syscall >=3.0.0 (static syscalls), which requires anchor-lang 1.x (solana-program 3+ line). Current: anchor 0.31.1 (define-syscall 2.3.0 — the brick risk), cargo-build-sbf 3.0.13, platform-tools v1.51. Deliverable: repo builds v3 ELF end-to-end, all suites green, ADR records the decision.


## Completion (2026-09-21)

Delivered: anchor-lang/anchor-spl 1.2.0 + Agave 3.1.10 + platform-tools v1.57 (anchor default). `anchor build` emits sBPFv3 (e_flags 0x3, EM_BPF, zero UND symbols — static syscalls throughout). Non-anchor entry points pinned: fuzz-nightly `cargo build-sbf --arch v3 --tools-version v1.57`; Makefile `solana-verify build --arch v3` (its default is v0). `make verify-sbf` readelf guard wired into devnet_build/mainnet_build/verifiable-build + CI post-build guard; `ANCHOR_BUILD_SBF_ARCH=v3` + `solana_version = 3.1.10` restored in Anchor.toml [toolchain] (extract-versions source). Rust port type-level only: Context single lifetime, CpiContext Pubkey (.key()), realloc→resize, borsh to_vec, AccountInfo::new 7-arg. transfer #[qed] body hash re-stamped d54e56579d75532f (spec_hash unchanged; full miri/Kani re-verify recommended pre-upgrade). Verified: 229 cargo tests (Mollusk oracle = v3 canary), Surfpool jest 15/15 suites 232 tests, qedgen check 0 errors, cargo clippy + fmt clean. ADR-0035 written; AGENTS.md toolchain claims fixed (+ registered missing ADR-0034).
