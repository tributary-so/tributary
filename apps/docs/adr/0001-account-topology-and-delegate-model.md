# Account topology and the UserPayment-as-delegate model

The protocol scopes all of a user's activity for one mint under a single
`UserPayment` PDA (`["user_payment", owner, mint]`), and that same PDA is
the token-program delegate on the user's source ATA. Execution is
permissionless: any gateway signer can call `execute_payment`, the program
verifies the delegate, and the pull happens.

We chose per-`(user, mint)` scoping with the **UserPayment PDA itself as
the delegate** rather than a global delegate PDA (`["payments"]`,
retained for backwards-compat as a fallback delegate in _both_
`execute_payment` and `execute_composable`, resolved via the shared
`resolve_delegate` helper). A global
delegate would have allowed one policy failure / pause to affect every
mint a user holds; per-mint scoping isolates blast radius and lets users
approve different allowances per mint without re-approving globally. The
cost is one approve per mint per user — acceptable because the approve is
a one-time setup.

See ADR 0008 for how this decision forced the ComposablePolicy era to put
intermediate ATAs under the ComposablePolicy PDA, not the UserPayment PDA.
