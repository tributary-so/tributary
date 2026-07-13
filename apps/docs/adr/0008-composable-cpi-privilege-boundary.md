# Composable CPI privilege boundary

`execute_composable` makes two CPIs into external programs — a
read-only **validation** CPI (Lighthouse) and a token-transform
**forward** CPI (Meteora DLMM). Both are dangerous by construction
because the program is signing on behalf of the user, and the original
design had two privilege-pass-through bugs (C-1, C-2, H-07). The fix
imposes four layered controls:

1. **Intermediate ATAs are owned by the ComposablePolicy PDA, not the
   UserPayment PDA.** The UserPayment PDA is the token-program delegate
   on the user's source ATA. If it also owned the intermediates, any
   CPI it signed (validation, forward, sweep, close) could be redirected
   via nested CPI to drain the user's source funds. Decoupling the
   intermediate authority from the user-source delegate means a forward
   program can only ever move transient intermediate balances — never
   the user's source ATA. (bean tributary-0kja)

2. **`is_signer` is stripped from every forwarded `remaining_account`.**
   The fee payer is a `Signer` in the outer transaction. If it were
   re-passed as a remaining account with `is_signer: true` preserved,
   Lighthouse / Meteora would see an inner-CPI signer and gain
   unintended authority. `build_validation_account_metas` hard-codes
   every forwarded account to **both** `is_signer = false` **and**
   `is_writable = false` — validation is strictly read-only, so neither
   flag is ever forwarded. `build_forward_account_metas` is narrower:
   it forces `is_signer = false` on every account except the
   ComposablePolicy PDA (the only signer the forward callee ever sees),
   and **preserves `is_writable`** verbatim from the caller-supplied
   info — safe because the Solana runtime rejects any inner instruction
   that claims writable access to an account the outer transaction did
   not also mark writable, so no privilege can be gained.
   (bean tributary-v6wj)

3. **Forward and validation target programs are hard-allowlisted in
   program constants.** `ALLOWED_FORWARD_PROGRAMS = [Meteora DLMM]`,
   `ALLOWED_VALIDATION_PROGRAMS = [Lighthouse]`. An arbitrary target
   would let a gateway route the pull through any program that returns
   "success" while moving funds sideways.

4. **The Token Program is explicitly NOT in the forward allowlist.**
   The natural-looking alternative — allowlist Token Program so a
   composable can "forward" by transferring — reintroduces the drain:
   `closeAccount` takes a caller-supplied `destination`, and a gateway
   could redirect the sweep to itself. The sentinel-disable pattern
   (ADR 0009) handles the no-swap case safely without this risk.
   (bean tributary-1lil)

The four controls are layered: any one of them alone is insufficient.
Together they reduce the composable CPI surface to "the gateway can
move only transient intermediate balances, and only to/from
program-pinned destinations."
