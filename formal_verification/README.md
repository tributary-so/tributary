# Tributary — Formal Verification (QEDGen)

This directory holds the **formal specification** of Tributary's
security-critical pull-payment logic and the **generated** proof artifacts
derived from it. The single source of truth is
[`../tributary.qedspec`](../tributary.qedspec).

> **Status (2026-07-01):** the spec is authored and **validation-clean**
> (`qedgen check` reports 0 errors). The executable proof backends (Kani BMC,
> Lean theorems) are scaffolded but currently blocked on two QEDGen v2.38
> tooling issues documented under [§Current blockers](#current-blockers) —
> not on the spec. Read [§Honest status](#honest-status) before quoting any
> "formally verified" claim.

---

## Verification architecture

```
                         ┌─────────────────────────────────────┐
   single source of  →   │       tributary.qedspec             │
   truth (authored,      │  State · handlers · properties      │
   human-readable)       └───────────────┬─────────────────────┘
                                         │  qedgen check   (lint + coverage + drift)
                                         │  qedgen codegen (derives all artifacts)
                ┌────────────────────────┼────────────────────────┐
                ▼                        ▼                        ▼
   ┌────────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
   │  Kani harnesses        │ │  Lean 4 project      │ │  Crucible fuzz probe │
   │  (kani.rs)             │ │  (Spec.lean +        │ │  (qedgen probe       │
   │                        │ │   Proofs.lean)       │ │   --crucible)        │
   │  Bounded model check   │ │  Theorem proving     │ │  Coverage-guided     │
   │  of the spec-model     │ │  (∀-quantified       │ │  fuzzing of the      │
   │  transitions over all  │ │  preservation        │ │  deployed .so        │
   │  symbolic inputs       │ │  theorems, Mathlib)  │ │  (optional)          │
   └────────────────────────┘ └──────────────────────┘ └──────────────────────┘
         code-level                math-level                adversarial
```

**What each layer proves:**

| Layer                      | Target                                                                                       | Discharge method          | Status                     |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------- | -------------------------- |
| **Spec validation**        | `tributary.qedspec` parses, type-checks, coverage matrix is complete, no drift               | `qedgen check`            | ✅ clean                   |
| **Kani (code level)**      | Each handler transition preserves each property for ALL symbolic inputs; no overflow / panic | `cargo kani --harness …`  | ⚠️ blocked (codegen bug)   |
| **Lean (math level)**      | `∀ pre, property(pre) ∧ guard ⇒ property(handler(pre))` — quantified preservation            | `lake build` (sorry-free) | ⚠️ blocked (dep recursion) |
| **Crucible (adversarial)** | No panic / unwrap / overflow crash sequence on the deployed binary                           | `qedgen probe --crucible` | ⏸️ optional, deferred      |

The spec is deliberately **structured around the program's pure functions** —
`validate_policy_execution`, `advance_policy`, `calculate_fees` — which already
encapsulate the drain-resistance and fee-conservation math. Modeling them as
handler `effect`/`requires` blocks makes the headline properties cheap to
state and (once the tooling unblocks) cheap to prove.

### What is specified (the claim this spec supports)

| Property                   | Asserts                                                                                              | Mirrors in code                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `period_bounded` (A2)      | No PAYG chunk sequence, across period resets, extracts more than `max_amount_per_period` per period. | [`validate_policy_execution`](../programs/tributary/src/shared/schedule.rs) PAYG branch + `advance_policy` |
| `period_cap_fixed`         | `max_amount_per_period` is immutable after creation.                                                 | (no handler widens it)                                                                                     |
| `fee_conservation`         | The four fee carve-outs sum exactly to `total_fee`; residual is the balancing item.                  | [`calculate_fees`](../programs/tributary/src/shared/fees.rs)                                               |
| `fee_is_bps_decomposition` | `total_fee == payment_amount × gateway_fee_bps / 10000`.                                             | [`bps_mul`](../programs/tributary/src/shared/fees.rs)                                                      |
| `recipient_net_of_fee`     | Gross-mode recipient receives `payment_amount − total_fee` (no hidden tax).                          | `calculate_fees`                                                                                           |
| `pull_bounded`             | PAYG chunk ≤ `max_chunk_amount`.                                                                     | `validate_policy_execution` PAYG                                                                           |
| `residual_nonnegative`     | `gateway_residual ≤ total_fee`.                                                                      | `calculate_fees` (`checked_sub`)                                                                           |

Handlers modeled: `create_payment_policy` (establishes the invariants from a
zero state), `execute_payment`, `execute_composable` (both the PAYG
period-reset and period-accumulate arms), `transfer`, `release_milestone`
(milestone signer-bit access control).

### Explicitly OUT of scope

Account wiring / PDA seed derivation, the forward-program allowlist (Meteora
DLMM), signer sanitization (ADR-0008 privilege boundary), the emergency-pause
flag, and all admin/config handlers. **Swap-output conservation is the
responsibility of the third-party forward program (Meteora DLMM).**
`delegated_amount` is SPL Token program state (read-only here). These are
covered by the Surfpool integration suite and the (planned) coverage-guided
fuzzer, not by this spec. See [`../SECURITY.md`](../SECURITY.md) for the full
layered-defence picture and [`../apps/docs/protocol-reference/security.md`](../apps/docs/protocol-reference/security.md)
for the per-measure code links.

---

## Toolchain installation

To run the verification locally you need QEDGen, Kani, and Lean 4. Crucible
is optional. The commands below are what this environment was set up with
(verified working as of QEDGen v2.38.0).

### 1. QEDGen (the spec driver)

QEDGen's release ships a prebuilt binary with SHA256 verification. From the
**root of a clone of [`qedgen/solana-skills`](https://github.com/qedgen/solana-skills)**:

```bash
git clone --depth 1 https://github.com/qedgen/solana-skills.git
cd solana-skills
bash install.sh          # downloads the platform binary, verifies checksum, links onto PATH
qedgen --version         # → qedgen 2.38.0 (or newer)
```

> ⚠️ The GitHub search hit `beardedwheatgrasswalkupapartment951/solana-skills`
> is **not** QEDGen — it pushes a Windows `.zip` and is not the source. Use
> the `qedgen/solana-skills` org only.

If `install.sh` cannot reach the release asset, build from source:

```bash
cargo build --release -p qedgen      # produces target/release/qedgen
```

### 2. Kani (bounded model checker — code-level proofs)

Kani is distributed as a prebuilt tarball per release. Install the latest
from <https://github.com/model-checking/kani/releases>:

```bash
# Linux x86_64 example — adjust the tag/arch to the latest release
KANI_TAG=kani-0.67.0
curl -fSL -o /tmp/kani.tar.gz \
  "https://github.com/model-checking/kani/releases/download/${KANI_TAG}/kani-0.67.0-x86_64-unknown-linux-gnu.tar.gz"
mkdir -p /tmp/kani && tar xzf /tmp/kani.tar.gz -C /tmp/kani --strip-components=1
export PATH="/tmp/kani/bin:$PATH"
cargo kani --version     # → cargo-kani …
```

(On Arch Linux: `yay -S kani`.)

### 3. Lean 4 + Lake (theorem proving — math-level proofs)

Install `elan` (Lean's toolchain manager) and a default toolchain:

```bash
curl -sSfL https://raw.githubusercontent.com/leanprover/lean/master/elan-init.sh \
  | sh -s -- -y --default-toolchain none --no-modify-path
export PATH="$HOME/.elan/bin:$PATH"
elan default leanprover/lean4:stable
lean --version          # → Lean (version 4.x …)
```

(On Arch Linux: `yay -S lean4`. A system package works; if you hit a
kernel-recursion error in a dependency tactic, pin the `lean-toolchain` to
the version the dependency was built against.)

### 4. Crucible (optional — coverage-guided fuzz)

Only needed for `qedgen probe --crucible`. Install per the Crucible project
instructions. The fuzz probe is a **secondary** adversarial input and is not
required to run the spec/Kani/Lean proofs.

### One-time QEDGen workspace

After the tools resolve on `PATH`, initialise the shared proof workspace
(stores the QEDGen Lean support library):

```bash
qedgen setup             # creates ~/.qedgen/workspace
```

---

## Running the verification

```bash
# 1. Validate the spec — must report 0 errors.
qedgen check --spec tributary.qedspec

# 2. Regenerate the derived artifacts (overwrites Spec.lean + kani.rs;
#    Proofs.lean is user-owned and never overwritten).
qedgen codegen --spec tributary.qedspec --kani  --kani-output formal_verification/kani.rs
qedgen codegen --spec tributary.qedspec --lean --output-dir formal_verification

# 3. Run the proofs (once the relevant blocker below is resolved).
cd formal_verification && lake build                 # Lean
cargo kani --harness <name>                          # Kani (from the harness crate)
qedgen probe --crucible --root ../programs/tributary # optional fuzz
```

---

## Honest status

The protocol's pull-payment + fee state machine is **formally specified and
validation-clean**. The executable proofs (Kani BMC, Lean theorems) are
**scaffolded but not yet executing** — blocked on the two issues below.

> Do **not** shorten this to "formally verified, period." That oversells the
> handler/CPI surface, which is integration-tested, not proven.

### Current blockers

**Blocker 1 — Lean: qedsvm dependency recursion.** `lake build` compiles the
`qedgenSupport`/`qedsvm` dependency tree and fails at
`SVM/SBPF/Tactic/WP.lean:217` with `(kernel) deep recursion detected` (dep
reached 261/290; `Spec.lean` itself was never reached). A Lean-version
mismatch is the likely cause — pin the `lean-toolchain` to the version
`lean_solana` was built against, or bump qedsvm. Not a spec issue.
Tracked in bean `tributary-kqhl`.

**Blocker 2 — Kani/Rust codegen: bare field reads + ML-syntax calls.**
`qedgen codegen --kani` emits transition functions that do not compile (339
errors). Two distinct QEDGen v2.38 Rust-backend bugs:

1. **State-field reads lose the receiver.** Guards and effect RHS read fields
   by bare name (`emergency_pause == 0`, `total_fee - protocol_cut`) instead
   of `s.emergency_pause` / `s.total_fee`. LHS writes are correct.
   Repro: [`kani.rs:128`](kani.rs).
2. **`ref_impl` calls render in ML application syntax.** The `bps_mul`
   ref_impl is emitted as `(bps_mul (chunk) (gateway_fee_bps))` instead of
   `bps_mul(chunk, gateway_fee_bps)`. Repro: [`kani.rs:135`](kani.rs).

Workaround under investigation: inline `mul_div_floor(…)` (a built-in that
renders correctly) instead of the `bps_mul` ref_impl (removes bug 2), then
patch the guard emitter (bug 1). The Lean backend is unaffected by bug 2
(ML syntax is native to Lean). Tracked in bean `tributary-o2vs`.

---

## Toolchain versions this environment was validated against

- QEDGen `v2.38.0` — `github.com/qedgen/solana-skills` release
- Kani `0.64.0` — Arch `kani` package
- Lean `4.31.0` + Lake `5.0.0` — Arch `lean4` package
- Crucible — **not installed** (optional)
