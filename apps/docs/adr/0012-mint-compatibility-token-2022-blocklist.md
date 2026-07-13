# Mint compatibility: legacy SPL Token only (Token-2022 rejected)

> **Amended by CF-009 (2026-07).** The original blocklist stance
> (reject known-dangerous Token-2022 extensions, allow clean ones)
> proved unsound: every execution instruction's `token_program` field
> is typed `Program<'info, Token>` — legacy only — so a clean
> Token-2022 mint would pass creation but fail every CPI
> `transfer_checked` with `AccountNotOwned`, silently locking users
> out of execution after rent is paid. Until Token-2022 execution
> support lands, the program rejects **all** Token-2022 mints at the
> owner check. The extension blocklist is retained in git history
> (commit `4506a59`) and documented below for restoration when
> `token_program` switches to `Interface<'info, TokenInterface>`.

## Current behavior

`validate_mint_compatible` ([`shared/mint.rs`](../../../programs/tributary/src/shared/mint.rs))
accepts only mints whose owning program is `spl_token::ID` and rejects
any mint owned by `spl_token_2022::ID`, regardless of extensions. It is
invoked as **defense-in-depth at every mint-touching instruction**, not
once at `UserPayment` creation: at `create_user_payment`, at both
regular and composable policy creation (`create_payment_policy`;
`create_composable_policy` checks both the input and output mint), and
again at every execution path (`execute_payment`, `transfer`,
`execute_composable` — again both mints). A Token-2022 mint can never
enter the program's pull paths.

This matches the program's actual CPI capability: every execution path
holds `token_program: Program<'info, Token>` (legacy), so only legacy
SPL Token accounts can move.

## Why not the original blocklist

The original decision (below) chose a blocklist over an allowlist on
the assumption that a clean Token-2022 mint would execute correctly.
That assumption was wrong — the `Program<'info, Token>` typing means
the program cannot move Token-2022 accounts at all. The blocklist was
not "permissive"; it was silently broken, letting users pay rent on
`UserPayment` / `PaymentPolicy` / `ComposablePolicy` PDAs that could
never execute. CF-009 classified this as a low-severity API-contract
bug (no fund loss — rent is recoverable via account deletion — but a
real UX trap given how common Token-2022 mints have become).

## Restoration: Token-2022 execution support

When Token-2022 support is added as a feature:

1. Switch `token_program` in `execute_payment`, `execute_composable`,
   and `transfer` from `Program<'info, Token>` to
   `Interface<'info, TokenInterface>`.
2. Update all CPI `transfer_checked` / `approve` / `revoke` call sites
   to the interface variants.
3. Derive intermediate ATAs (composable) using the mint's owning
   program.
4. Restore the extension blocklist in `validate_mint_compatible` from
   commit `4506a59`, and re-enable the corresponding unit tests.

### The deferred blocklist (six extensions)

Restored as-is when Token-2022 lands. Any of these breaks the
pull-payment invariant — the program would pull a balance it cannot
reason about:

- `TransferHook` — arbitrary transfer-time CPI
- `ConfidentialTransferMint` — amounts hidden from program logic
- `NonTransferable` — transfers forbidden by design
- `PermanentDelegate` — mint authority can seize/reassign at will
- `TransferFeeConfig` — fees distort expected amounts
- `MintCloseAuthority` — mint can be closed, breaking continuity

(`Pausable` was also flagged; it did not exist in spl-token-2022 6.0.0
when this ADR was first written. If a later pinned version exposes it,
add it to the blocklist — pausing would silently break execution
mid-stream.)

## Why re-validate at every mint boundary

Although the mint is constant per `UserPayment` by PDA seed
(`["user_payment", owner, mint]`) — so the _result_ is deterministic
for a given mint — re-validating at each mint boundary is cheap (a
single owner comparison) and removes any assumption that an earlier
gate ran. On a payments primitive, redundant validation at every CPI
entry point is the safer posture than a single trust boundary that, if
bypassed, leaves every downstream path open.
