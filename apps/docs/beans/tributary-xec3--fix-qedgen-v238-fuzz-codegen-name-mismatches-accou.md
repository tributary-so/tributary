---
# tributary-xec3
title: 'Fix QEDGen v2.38 fuzz-codegen: name mismatches + account-fixture stubs + IDL version gap'
status: scrapped
type: task
priority: high
created_at: 2026-07-22T12:57:02Z
updated_at: 2026-07-22T14:23:42Z
parent: tributary-nrjy
---

Unblocks: tributary-c1jy (Crucible coverage-guided fuzz of deployed tributary.so)

QEDGen v2.38 synthesizes a 38-action Crucible fuzz harness at
`programs/tributary/.qed/fuzz/tributary/` but it does NOT compile.
Three independent reproductions (2026-07-22) confirm three codegen bugs:

## Bug 1 — Name mismatches (textually fixable)
`declare_fuzz_program!` emits `Handler*`/`Handle*` prefixed names
(`HandlerChangeProgramAuthority`, `HandleInitialize`,
`HandleUpdateGatewayFeatureFlags`, bare `Handler`) that don't exist in the
IDL-derived module (actual: `ChangeProgramAuthority`, `Initialize`,
`UpdateGatewayFeatureFlags`). ~40 mismatches.
**Fix:** regex strip `Handler*`/`Handle*` prefix → IDL PascalCase (a
`fix-fuzz.py` post-processor analogous to `formal_verification/fix-kani.py`).

## Bug 2 — 38 unfilled account-fixture stubs (NOT textually fixable)
Every action handler body is `todo!("agent-fill: accounts::<Name> { ... }
from spec accounts block")`. QEDGen synthesizes the `accounts::*` struct
types from the IDL but emits `todo!()` for every account-fixture struct
literal. Real fixtures require semantically valid Solana state — funded
payer, valid PDAs, token accounts with balances, delegate approvals,
fee-recipient ATAs. No regex post-processor can produce this.
**Fix:** (a) QEDGen codegen emits compilable account-fixture literals
(upstream tooling change), OR (b) hand-fill the 38 fixtures by porting the
Mollusk harness pattern (`tests/mollusk_oracle.rs`, 21 KB) into Crucible's
`accounts::*` struct format.

## Bug 3 — Anchor version gap (potential runtime risk)
Generated Cargo.toml pins `anchor-lang = "1.0.1"` + `solana-* = "3.x"`.
Tributary builds with Anchor 0.31.0 / Solana 1.18.x. The macro DOES expand
after providing the IDL, but Anchor 0.31 IDL format may not be fully
compatible with the 1.0.1 macro types — potential runtime-deserialization
risk, not a hard compile failure.

## Alternative minimal path
Build a hand-rolled `crucible init` harness (58-line clean scaffold)
targeting only 3 security-critical handlers: execute_payment,
execute_composable, transfer — with the lamport-conservation invariant the
generated skeleton provides (lines 40–76). This avoids the 38-fixture
problem entirely but is substantial dedicated work.

## Acceptance criteria
- [ ] `qedgen probe --fuzz --root programs/tributary` produces a compiling
      harness (zero E0422/E0432/E0433 errors), OR
- [ ] A `fix-fuzz.py` post-processor + hand-filled fixtures produce a
      compiling harness, OR
- [ ] A minimal `crucible init` harness for the 3 critical handlers runs
      green against the deployed .so

## Reasons for Scrapping — 2026-07-22

**Superseded by qedgen 2.47.0 + `formal_verification/fix-fuzz.py`.**

This bean was created to fix QEDGen v2.38 fuzz-codegen so that
`qedgen probe --fuzz` produces a compiling Crucible harness. Acceptance
criteria were:

- [x] `qedgen probe --fuzz --root programs/tributary` produces a compiling
      harness (zero E0422/E0432/E0433 errors), OR
- [x] A `fix-fuzz.py` post-processor + hand-filled fixtures produce a
      compiling harness, OR
- [ ] A minimal `crucible init` harness for the 3 critical handlers runs
      green against the deployed .so

Two of three acceptance criteria are now met:

1. **qedgen 2.47.0** eliminates the structural bugs:
   - 38 `todo!()` account-fixture stubs → 0 (fixtures now synthesized)
   - ~40 `Handler*/Handle*` name mismatches → 0
   - IDL auto-placed at the crate root

2. **`formal_verification/fix-fuzz.py`** post-processes the 3 residual
   codegen seams:
   - Bug A: shrink `[u8; N>32]` padding in idls/tributary.json (Default impl)
   - Bug B: rewrite bare-identifier call args to typed expressions
   - Bug C: repath `ctx.add_program()` to the workspace-rooted .so

The harness builds + runs green (60s smoke: 0 crashes, ~3000 executions,
corpus growing, post-state guards live). See tributary-c1jy Summary of
Changes (2026-07-22 qedgen 2.47.0 + fix-fuzz.py) for the verification.

No further work needed — the unblock path the bean specified is delivered.
Scrapping rather than completing because the bean's framing was "fix the
tooling"; the resolution is "the tooling matured upstream + a 200-line
post-processor analogous to fix-kani.py" — there is no further tooling-fix
work to track here.
