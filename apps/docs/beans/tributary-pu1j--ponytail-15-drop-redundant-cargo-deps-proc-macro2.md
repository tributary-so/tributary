---
# tributary-pu1j
title: 'Ponytail #15: drop redundant Cargo deps (proc-macro2, syn, quote, Xargo.toml)'
status: completed
type: task
priority: normal
tags:
    - ponytail
    - deps
created_at: 2026-06-24T12:39:51Z
updated_at: 2026-06-25T18:09:15Z
parent: tributary-9hca
---

`programs/tributary/Cargo.toml` declares three crates that are almost certainly transitive:

```toml
# https://solana.stackexchange.com/a/21694
proc-macro2 = "1.0"
syn = "1.0"
quote = "1.0"
```

These are pulled in by `anchor-lang` and `solana-security-txt` already. The SO link is a workaround for a proc-macro stack-overflow that has been fixed upstream in newer anchor/solana-sdk versions.

`Xargo.toml` is covered by bean #12 — listed here for the complete dependency-trimming picture.

## Cut

- [ ] Remove the three lines from `Cargo.toml`'s `[dependencies]` section
- [ ] `cargo build-spf` — confirm the build still succeeds (the transitive versions should suffice)
- [ ] If the build fails with the stack-overflow error, the workaround is still needed — restore the pins but move them to a `[patch.crates-io]` block with a comment explaining why
- [ ] `cargo tree -i proc-macro2` to confirm where the dep actually comes from (informational)

## Verification

- Build + test pass
- `cargo tree` shows the same resolved versions (transitive)

## Risk

Medium-low. If the SO workaround is still load-bearing on this toolchain version, the build will fail with a clear error and the pins can be restored.

## Files
- `programs/tributary/Cargo.toml:17-19` (delete three lines)
