# Mint compatibility: Token-2022 extension blocklist

`validate_mint_compatible` rejects mints carrying any of six Token-2022
extensions: `TransferHook`, `ConfidentialTransferMint`,
`NonTransferable`, `PermanentDelegate`, `TransferFeeConfig`,
`MintCloseAuthority`. It is invoked as **defense-in-depth at every
mint-touching instruction**, not once at `UserPayment` creation: at
`create_user_payment`, at both regular and composable policy creation
(`create_payment_policy`; `create_composable_policy` checks both the
input and output mint), and again at every execution path
(`execute_payment`, `transfer`, `execute_composable` — again both
mints). The mint can never enter the program's pull paths unchecked.

We chose a **blocklist** (reject known-dangerous extensions) over an
**allowlist** (only accept plain Token or a vetted extension set)
because the extension landscape is still moving — an allowlist would
gate legitimate new mints behind a program upgrade, which on Solana is
expensive and risky. The six blocked extensions are the ones that
either move tokens without the holder's signature (TransferHook,
PermanentDelegate, TransferFee), cannot move at all (NonTransferable),
hide balances (ConfidentialTransfer), or can be closed by the mint
authority (MintCloseAuthority). Any of them breaks the pull-payment
invariant — the program would pull a balance it cannot reason about.

The check is re-applied at every policy create and execution rather
than being `UserPayment`-scoped-once. Although the mint is constant per
UserPayment by PDA seed (`["user_payment", owner, mint]`) — so the
_result_ is deterministic for a given mint — re-validating at each
mint boundary is cheap (a single extension TLV scan, early-returning
for legacy SPL Token) and removes any assumption that an earlier gate
ran. On a payments primitive, redundant validation at every CPI entry
point is the safer posture than a single trust boundary that, if
bypassed, leaves every downstream path open.

`Pausable` was considered but does not exist in spl-token-2022 6.0.0
(the pinned version). If it ships in a later version, add it to the
blocklist — pausing would silently break execution mid-stream.

## Amendment (CF-009 Option B)

All execution instructions (`execute_payment`, `transfer`,
`execute_composable`) now type `token_program` as
`Interface<'info, TokenInterface>` instead of `Program<'info, Token>`.
This accepts both the legacy SPL Token program and Token-2022, so
clean Token-2022 mints (no dangerous extensions) flow through the
full create → delegate → execute lifecycle. The extension blocklist
above is the active defense — not deferred, not dead code.
