#!/usr/bin/env python3
"""
Post-process qedgen v2.47-generated Crucible fuzz harness (`<root>/.qed/fuzz/<prog>/src/main.rs`)
to fix two residual codegen bugs after the v2.38→v2.47 jump.

Bug A — `[u8; N>32]: Default` not satisfied.
        The macro `declare_fuzz_program!` derives Default for IDL types; padding
        arrays >32 fail. Fixed PRE-build by shrinking arrays in `idls/<prog>.json`
        to `[u8; 32]` (the fuzz harness never deserializes real on-chain accounts,
        so the padding size is irrelevant — it just calls instructions).

Bug B — fuzz input `u64` passed where IDL expects a typed arg.
        Each `action_*` method takes `u64`/`u32`/`u16`/`u8` fuzz inputs from
        libfuzzer, but the `.call(instruction::Foo { ... })` site expects typed
        args (PolicyStatus, PolicyType, ForwardConfig, ValidationSpec,
        ValidationInit, [u8; N], Vec<u8>, Option<u64>, custom Args structs).
        qedgen emits the bare identifier. We patch each problematic field with
        `Default::default()` (now that Bug A is fixed), `[0u8; N]`, `Vec::new()`,
        or `Some(<id>)` — the simplest expression that compiles and exercises
        the instruction path. Coverage-guided fuzzing then mutates the account
        state; post-state guards (lamport conservation, ownership, etc) catch
        host-side panics regardless of these defaults.

Usage:
  qedgen probe --fuzz 0 --root programs/tributary --no-smoke
  # shrink padding arrays in idls/tributary.json (Bug A)
  python3 formal_verification/fix-fuzz.py programs/tributary/.qed/fuzz/tributary/src/main.rs
"""
import re
import sys
from pathlib import Path


# Field name → replacement expression. Every site is a `.call(instruction::Foo { ... })`
# argument that qedgen emitted as a bare identifier. The replacement is the
# simplest expression matching the IDL-declared type. We use `Default::default()`
# for all complex types so the harness need not import them explicitly —
# Rust infers the type from the IDL-declared instruction arg.
FIELD_REPLACEMENTS = {
    # PolicyStatus / PolicyType / ForwardConfig / ValidationSpec / ValidationInit
    # / UpdateGateway*Args — all IDL-generated with Default impls (post Bug A fix).
    "new_status": "Default::default()",
    "policy_type": "Default::default()",
    "forward_config": "Default::default()",
    "pre_validation": "Default::default()",
    "pre_init": "Default::default()",
    "post_validation": "Default::default()",
    "post_init": "Default::default()",
    "args": "Default::default()",
    # Vec<u8>
    "instruction_data": "Vec::new()",
}
# Memo / name / url / referral_code: [u8; N] arrays. Keyed by name → array size.
# NB: the harness infers the size from the IDL; we MUST match it. Use
# `Default::default()` after Bug A's shrink capped arrays at 32 — but some
# fields (url=64 in older IDLs) may differ, so we hand-list the known ones.
ARRAY_FIELDS = {
    "memo": 32,           # create_composable_policy: [u8; 32]
    "name": 32,           # create_payment_gateway: [u8; 32]
    "url": 32,            # create_payment_gateway: [u8; 32] (was [u8; 64], shrunk by Bug A fix)
    "referral_code": 6,   # create_referral_account: [u8; 6]
}
# Option<u64> — wrap the bare identifier in Some(...)
OPTION_FIELDS = {
    "forward_amount",     # execute_composable
    "payment_amount",     # execute_payment
}


def patch_call_sites(text: str) -> str:
    """Inside every `.call(instruction::Foo { ... })` block, rewrite the
    bare-identifier shorthand `{ name }` (≡ `{ name: name }`) into the typed
    form `{ name: <expr> }` for every name known to need conversion.

    qedgen emits fields either:
      (a) one-per-line: `\\n    name,\\n`
      (b) inline      : `{ name1, name2 }`  or `{ name1, name2, }`

    For both, the substitution target is the bare identifier; we replace it
    with `name: <expr>` so the resulting struct literal is `name: <expr>`.

    The block is delimited by `.call(instruction::Foo {` ... `})`. Because
    qedgen never nests `{}` inside the call args, a non-greedy match up to the
    first `}` is sufficient AND safe.
    """
    call_pattern = re.compile(
        r"(\.call\(instruction::\w+\s*\{)(.*?\})(\s*\))",
        re.DOTALL,
    )

    # Union of all names we rewrite, each mapped to its replacement RHS.
    rhs_for = dict(FIELD_REPLACEMENTS)
    for nm, sz in ARRAY_FIELDS.items():
        rhs_for[nm] = f"[0u8; {sz}]"
    for nm in OPTION_FIELDS:
        rhs_for[nm] = f"Some({nm})"

    # For each known name, match a whole word NOT preceded by ':' or '.'.
    # The negative lookbehind protects already-substituted `name: repl` from
    # being re-matched if the script is run twice.
    name_alt = "|".join(re.escape(n) for n in rhs_for)

    def rewrite_ident(body: str) -> str:
        # Multi-line form: identifier alone on its line (optionally followed
        # by a comma + whitespace), preceded only by indentation.
        body = re.sub(
            rf"(?m)^(\s*)({name_alt})(\s*),?\s*$",
            lambda m: f"{m.group(1)}{m.group(2)}: {rhs_for[m.group(2)]},",
            body,
        )
        # Inline form: identifier surrounded by `[ {,]` on the left and
        # `[ ,}]` on the right. No newlines inside the match. The negative
        # lookbehind for `:` prevents double-rewrite.
        body = re.sub(
            rf"(?<![A-Za-z0-9_:.\$])({name_alt})(\s*)(?=[,}}])",
            lambda m: f"{m.group(1)}: {rhs_for[m.group(1)]}{m.group(2)}",
            body,
        )
        return body

    def fix_block(m: re.Match) -> str:
        return m.group(1) + rewrite_ident(m.group(2)) + m.group(3)

    return call_pattern.sub(fix_block, text)


def shrink_idl_arrays(idl_path: Path, cap: int = 32) -> bool:
    """Rewrite idls/<prog>.json in place: any `{"array": ["u8", N]}` with N>cap
    becomes `{"array": ["u8", cap]}`. Returns True if any change was made."""
    import json
    data = json.loads(idl_path.read_text())
    changed = [False]

    def walk(o):
        if isinstance(o, dict):
            if (
                isinstance(o.get("array"), list)
                and o["array"][0] == "u8"
                and int(o["array"][1]) > cap
            ):
                o["array"] = ["u8", cap]
                changed[0] = True
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(data)
    if changed[0]:
        idl_path.write_text(json.dumps(data, indent=2))
    return changed[0]


def patch_so_path(text: str, harness_path: Path, program_name: str) -> str:
    """Rewrite the hardcoded `ctx.add_program(&id, "<path>")` literal.

    qedgen emits a path relative to the *program crate* —
    `<crate>/target/deploy/<name>.so` — but the workspace build puts the .so
    at the *workspace* root: `<workspace>/target/deploy/<name>.so`. Walk up
    from the harness file until we find `target/deploy/<name>.so` and use that.
    """
    target = None
    for parent in [harness_path] + list(harness_path.parents):
        candidate = parent / "target" / "deploy" / f"{program_name}.so"
        if candidate.is_file():
            target = str(candidate.resolve())
            break
    if target is None:
        return text  # leave as-is; build will fail loudly with the original path
    return re.sub(
        r'ctx\.add_program\(&[a-zA-Z_][a-zA-Z0-9_:]*,\s*"[^"]+"\)',
        f'ctx.add_program(&{program_name}::ID, "{target}")',
        text,
    )


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    harness = Path(sys.argv[1])
    if not harness.is_file():
        print(f"error: harness not found: {harness}", file=sys.stderr)
        return 1

    original = harness.read_text()
    after_path = patch_so_path(original, harness, "tributary")
    after_calls = patch_call_sites(after_path)
    if after_path != original:
        print(f"patched .so path in {harness}")
    if after_calls != after_path:
        print(f"patched call sites in {harness}")
    if after_calls != original:
        harness.write_text(after_calls)
    else:
        print(f"warning: no patches applied to {harness}", file=sys.stderr)

    # Also shrink the IDL (Bug A) — adjacent to src/.
    idl = harness.parent.parent / "idls" / "tributary.json"
    if idl.is_file() and shrink_idl_arrays(idl):
        print(f"shrunk [u8; N>32] arrays in {idl}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
