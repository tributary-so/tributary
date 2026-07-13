# ComposablePolicy.memo: 32 bytes, not 64

`ComposablePolicy.memo` ships at `[u8; 32]`, half the width of
`PaymentPolicy.memo` (`[u8; 64]`). The two policy families keep
**different memo widths** — deliberately, not as debt.

**Decision.** `memo` is a **user-defined, human-readable label**: a
short ASCII/UTF-8 string so a human can tell which service a transfer
or execution corresponds to ("Pro plan", "aws-prod-1", "Q3 retainer").
32 bytes is the floor for that job — it fits a UUID-as-hex-without-dashes
(32 chars) and any short service label — without paying for the binary
correlation-ID headroom 64 reserves. `PaymentPolicy` is frozen on
mainnet with user funds per ADR-0007, so it stays at 64;
`ComposablePolicy` is pre-release with zero live accounts, so its layout
is free to reshape. ADR-0007 already blesses composable/payment
flat-struct asymmetry (different inlined field sets, no shared
`PolicyHeader`); a different memo width is another instance of the same
principle, not a new kind of divergence.

The account shrinks 32 bytes (≈0.00026 SOL per account, one-time,
rent-payer). `padding: [u8; 32]` is **kept** as the deliberate
future-field buffer — it is not burned for trivial savings.

**Rejected: 16 bytes (raw UUID binary).** A 16-byte field holds a raw
UUID and nothing human-readable. That kills the field's primary job —
a human scanning on-chain state should read the label without a lookup
table. 16 bytes optimises for a secondary use (binary correlation) at
the cost of the primary one.

**Rejected: keep at 64 for symmetry.** Symmetry for its own sake is
not a goal; the two account types are already asymmetric by design
(ADR-0007). Carrying 32 unused bytes per composable account forever,
to match a frozen sibling, is pure rent cost with no benefit — the
composable path has no mainnet constraint forcing it.

The `encodeMemo` default stays at 64 (PaymentPolicy / `transfer` still
need it); only the composable SDK call site passes `32` explicitly.

(bean tributary-7ndv)
