---
# tributary-o7u1
title: Update tributary.qedspec + regenerate formal_verification
status: completed
type: task
priority: normal
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T12:17:22Z
parent: tributary-teqe
blocked_by:
  - tributary-2st5
---

Per AGENTS.md: program changes require updating the qedspec and regenerating the entire formal_verification directory. Reflect the two-entry ALLOWED_FORWARD_PROGRAMS in the spec.

## Summary of Changes

- `tributary.qedspec`: updated the two documentation-only mentions of the
  forward-program allowlist (OUT OF SCOPE header §L24, and the
  `cpi_boundary_documented` doc-invariant §L545) from "Meteora DLMM" to
  "Meteora DLMM + Raydium CPMM". The allowlist itself is explicitly OUT OF
  SCOPE of the formal state model (integration-tested only), so no state
  types, properties, handlers, or effects changed — the spec edit is
  comment-only.
- Regenerated `formal_verification/kani.rs` via
  `qedgen codegen --kani` + `fix-kani.py` post-processor. Result:
  **byte-identical** to the committed version (expected — comment-only spec
  edit produces identical codegen).
- Regenerated `formal_verification/Spec.lean` via `qedgen codegen --lean`.
  Result: **byte-identical** to the committed version (same reason).
- Verification:
  - `qedgen check`: clean (no errors; 48 warnings + 15 infos are pre-existing
    unused-field notices, unchanged by this edit).
  - Kani Layer 1: **19/19 PASS**, 0 failures, 119 checks SUCCESS, 1/1 cover
    satisfied (0.13s).
  - Layer 2 proptest: **23/23 PASS** (0.08s).
- No changes to `formal_verification/README.md` — its status block and
  honest-claim section reference "CPI allowlisting" generically; no
  program-count-specific claims needed updating.
- Depended on `tributary-2st5` (the constants.rs allowlist edit), which
  landed in commit `18c33cc2`.
