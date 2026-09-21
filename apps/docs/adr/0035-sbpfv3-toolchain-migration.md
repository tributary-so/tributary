# sBPFv3 toolchain migration — Anchor 1.2, v3-only builds

SIMD-0500 (feature gate planned for Agave v4.4) will reject new
deployments, upgrades, and buffer finalizations of any program built for
sBPFv0–v2 bytecode. Already-deployed programs keep executing, but
Tributary's next mainnet upgrade — which flows through
`solana program write-buffer` and a Squads multisig `BPFUpgrade` — must
carry a v3 ELF or the buffer write itself gets rejected after activation.
Safe sBPFv3 requires static syscalls (`solana-define-syscall ≥ 3.0.0`,
i.e. the `solana-program` 2/3.x line): syscall sites are resolved at
compile time via `murmur32`-hashed `call` immediates instead of load-time
relocations. anchor-lang 0.31.x's dependency graph bakes `extern "C"`
syscall imports into the ELF — such a program cannot link as v3 without
leaving `call -1` sites that deploy fine and then brick with
`CallDepthExceeded`.

## Decision

Migrate the toolchain to **anchor-lang/anchor-spl 1.2 + Agave 3.1.10**
(`cargo-build-sbf` 4.2.0, which passes `-z defs` so unresolved symbols
fail the build, and `platform-tools` ≥ v1.56 — anchor 1.2 pins v1.57 by
default). `anchor build`/`anchor test` default to `--arch v3
--tools-version v1.57`; we additionally pin `ANCHOR_BUILD_SBF_ARCH=v3`
in CI so an upstream default flip cannot silently change our bytecode
format. Every **non-anchor** build entry point defaults to v0 and is
pinned explicitly: the fuzz-nightly workflow's bare
`cargo build-sbf` now passes `--arch v3 --tools-version v1.57`, and the
mainnet verifiable-build path runs `solana-verify build --arch v3`
(solana-verify 0.4.x defaults to v0 — without this pin the verified
buffer that Squads upgrades from would be the wrong bytecode). A
`make verify-sbf` guard (readelf `e_flags` must be `0x3`, "CPU Version:
3") runs after every build target and in CI; it exists because the
failure mode is silent: a v0 ELF deploys and executes fine today and is
only rejected at upgrade time after SIMD-0500 activates.

The Rust port was type-level only, no semantic changes: anchor 1.x
collapses `Context` to one lifetime (`Context<'info, T>` where the
handler consumes `ctx.accounts`/`ctx.remaining_accounts`),
`CpiContext::new[_with_signer]` takes the program as `Pubkey` (`.key()`
at every call site), `AccountInfo::realloc(0, false)` → `resize(0)`
(matching anchor 1.2's own close routine), borsh 1.x `to_vec` replaces
the removed `try_to_vec`, and `AccountInfo::new` drops its trailing
`rent_epoch` argument in test fixtures. The `transfer` handler's
`#[qed(verified)]` body hash was re-stamped for the port (`spec_hash`
unchanged — the `.qedspec` semantics did not move); a full miri/Kani
re-verification cycle should precede the next mainnet upgrade.

Rejected alternatives: staying on 0.31/v0 and freezing upgrades after
activation (kills the Squads upgrade path permanently and strands the
program on old toolchain bugfixes); building v2 (not a superset of v0 —
it reverts different SIMDs — and equally gated by SIMD-0500); keeping
`extern "C"` syscall bindings with a v3 target (the documented brick
path: deploys, then `CallDepthExceeded` at runtime).

Verification at merge time: `target/deploy/tributary.so` reads
`Machine: Linux BPF`, `Flags: 0x3, CPU Version: 3`, with **zero** UND
symbols (all syscalls static); 229 cargo tests green including the
Mollusk oracle that loads the compiled v3 `.so` directly (the
`CallDepthExceeded` canary); full Surfpool jest suite against the
mainnet fork; CI post-build ELF guard.
