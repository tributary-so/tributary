---
# tributary-m2wy
title: Update qedspec const + regenerate Layer 1 + re-stamp drift gates
status: todo
type: task
priority: normal
created_at: 2026-07-12T19:12:53Z
updated_at: 2026-07-12T19:13:24Z
parent: tributary-rcjh
blocked_by:
    - tributary-jsna
---

Parent tributary-rcjh. Formal-verification consequence of MAX_PINNED_FORWARD_ACCOUNTS 4→2. Per AGENTS.md: program changes ⇒ update tributary.qedspec + recreate the entire formal_verification directory accordingly.

## Touch points
- `tributary.qedspec:103` — `const MAX_PINNED_FORWARD_ACCOUNTS = 4` → `2`.
- Drift gates: the spec text change alters spec_hash → `#[qed(verified, spec_hash=..., hash=...)]` on `create_payment_policy` and `transfer` will fail `cargo check` even though those handlers are untouched. Re-stamp via:
  ```
  qedgen adapt --program programs/tributary --spec tributary.qedspec
  ```
  Paste emitted attrs above each handler fn.
- Layer 1 (`formal_verification/kani.rs:22,35`): hardcodes `const MAX_PINNED_FORWARD_ACCOUNTS: u8 = 4` and `pinned_accounts: [PinnedAccount; 4]`. Regenerate:
  ```
  qedgen codegen --spec tributary.qedspec --kani --kani-output formal_verification/kani.rs
  rm -rf programs/src/ programs/Cargo.toml
  python3 formal_verification/fix-kani.py formal_verification/kani.rs
  cd formal_verification && cargo kani
  ```
- Layer 2 (`programs/tributary/tests/kani_pure_fns.rs`, `proptest_pure_fns.rs`): reference the real const via `use` (auto-track), but `kani_pure_fns.rs:497` has a literal `[ByteRangeCheck; 4]` — verify that 4 is MAX_BYTE_RANGE_CHECKS (also 4, unrelated) not the pin count.

## Acceptance criteria
- [ ] qedspec const updated; `qedgen check --spec tributary.qedspec` clean.
- [ ] Drift gates re-stamped; `cargo check` in programs/tributary clean (no compile_error).
- [ ] Layer 1 regenerated; `cargo kani` in formal_verification — 19 active harnesses still pass.
- [ ] Layer 2: `cargo test --test proptest_pure_fns` 21/21 pass; `cargo kani --tests` fast harnesses pass.
- [ ] Confirm the literal `4` at kani_pure_fns.rs:497 is MAX_BYTE_RANGE_CHECKS (unaffected), not pin capacity.

NOTE: MAX_VALIDATION_DATA_SIZE has NO qedspec/drift-gate/Layer-1 impact (Lighthouse assertions are out of spec scope, per qedspec header line 28).
