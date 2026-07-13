# Lighthouse SDK vendored with an anti-corruption facade in @tributary-so/sdk

The Lighthouse client is **vendored into the workspace** as
`packages/lighthouse` (snapshot of `lighthouse-sdk-legacy`, not on npm),
and consumed only through a fluent facade in `@tributary-so/sdk`
(`lighthouse.tokenAccount(ata).amount(n, "<").build()`). Callers never
see the underlying `umi` types or the bundle's per-instruction
serializers directly.

We vendored rather than published-to-npm because (a) the upstream is
distributed as a legacy bundle with its own pinned `umi@0.9` /
`web3.js@1.91` graph that conflicts with our workspace
(`umi@^1.4.1` / `web3.js@^1.98.4`), and (b) we needed byte-for-byte
control over the assertion-serialisation output that gets stored in the
on-chain `ValidationPda` and replayed via CPI. A dep-dedupe pass
(overriding the bundle to the workspace versions) confirmed the
serialised bytes match the prior hand-rolled output exactly. (bean
tributary-j8dn)

The facade is intentionally **scope-narrow**: it owns only the
Lighthouse `target_account(s)` (the accounts the assertion reads). It
does **not** assemble Tributary's full `remaining_accounts` list — that
stays in the caller, because Tributary's remaining accounts mix
Lighthouse target accounts, the `ValidationPda`, and forward-program
accounts in a specific order, and centralising that would couple the
facade to Tributary's instruction layout. The facade covers every
Lighthouse assertion family (tokenAccount, mintAccount, accountInfo,
accountData, accountDelta, sysvarClock, stakeAccount, merkleTree) plus
their multi-variants, with operator sugar (`"<"`, `">="`, `"in"`)
alongside the raw `IntegerOperator` / `EquatableOperator` enums.

Upgrade cost of swapping Lighthouse out: rewrite the facade against the
new client, keep the public surface (`{ data, numAccounts, accounts }`)
stable, and the on-chain program needs no change (it just replays
whatever bytes the facade produced).
