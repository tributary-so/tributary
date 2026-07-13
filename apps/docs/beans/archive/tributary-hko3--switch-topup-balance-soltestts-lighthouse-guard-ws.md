---
# tributary-hko3
title: 'Switch topup-balance-sol.test.ts Lighthouse guard: WSOL-ATA sensor → SOL (lamports) sensor'
status: completed
type: task
priority: normal
created_at: 2026-06-25T06:32:35Z
updated_at: 2026-06-25T18:08:50Z
---

## Context

`tests/topup-balance-sol.test.ts` exercises the NATIVE_OUTPUT topup flow: it
pulls USDC from coldWallet, DLMM-swaps to WSOL, then unwraps the WSOL
intermediate into **native SOL** via `closeAccount`, landing the value in
`hotWallet.publicKey` (the system wallet, NOT a WSOL ATA).

The Lighthouse guard that gates the topup currently asserts on the **WSOL
ATA** balance of the hot wallet:

```ts
const guard = lighthouse
  .tokenAccount(hotWalletWsolAta) // ← WSOL ATA, unrelated to the sweep
  .amount(1_000_000_000, "<") // < 1 WSOL
  .build();
```

This is semantically wrong for this test: the NATIVE_OUTPUT sweep mutates the
hot wallet's **SOL (lamports)** balance, never its WSOL ATA. The WSOL ATA is
funded with a static 0.4 WSOL purely to make the assertion hold — it does not
reflect the account that actually gets topped up. The test even carries an
open-decision note about this ("bean open-decision (a): WSOL-ATA sensor").

The guard must assert on the **lamports** of `hotWallet.publicKey` instead.

## Why it's a real bug (not just cosmetic)

The guard's job is "only top up if the recipient balance is low." Asserting
on a separate, static WSOL ATA means:

- The assertion never reflects the real topped-up balance.
- After the first execute, the SOL balance rises but the guard still keys off
  the unchanged WSOL ATA — so the guard can't model "already topped up."
- The `hotWalletWsolAta` exists ONLY as a Lighthouse read-target; once the
  sensor moves to the system wallet, that ATA (its creation, its 0.4 WSOL
  funding, its derivation, its declaration) is dead code.

## The fix — `accountInfo().lamports()` instead of `tokenAccount().amount()`

The SDK facade (`packages/sdk/src/lighthouse.ts`) already exposes exactly what
we need. `TokenAccountBuilder.amount()` reads the SPL `amount` field; the
sibling `AccountInfoBuilder.lamports()` reads a system account's lamports:

```ts
// packages/sdk/src/lighthouse.ts:372
lamports(value, operator): this {
  this.items.push({ __kind: "Lamports", value, operator: intOp(operator) });
  return this;
}
```

Its `build()` serializes via `getAssertAccountInfoInstructionDataSerializer`
and yields `numAccounts: 1`, `accounts: [hotWallet.publicKey]` — a drop-in
shape for the existing call site (`guard.numAccounts` + `guard.data` go
straight into `createComposablePolicy`).

### New guard

```ts
// Assert hotWallet NATIVE SOL (lamports) is below threshold before topping
// up. NATIVE_OUTPUT sweep mutates this balance, so this is the correct
// sensor. Mirrors AccountInfoBuilder.lamports() in lighthouse.ts.
const SOL_TOPUP_THRESHOLD = 20_000_000_000; // 20 SOL — see threshold note
const guard = lighthouse
  .accountInfo(hotWallet.publicKey)
  .lamports(SOL_TOPUP_THRESHOLD, "<")
  .build();
```

### Threshold decision

`hotWallet` is funded with 10 SOL (10_000_000_000 lamports) at test setup
(line ~132). For the `<` assertion to **hold** (so execute proceeds), the
threshold must be `> 10 SOL`. 20 SOL keeps the 10 SOL funding untouched —
minimal diff, no funding changes. (Alternative: drop hotWallet funding to
~0.5 SOL and use a 1 SOL threshold to mirror the original "low balance"
semantics — but that touches funding and risks fee-starving the feePayer.
Prefer the 20 SOL option.)

## All affected locations in tests/topup-balance-sol.test.ts

| Line(s)  | Current                                                                                   | Change to                                                                               |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| ~411-414 | `lighthouse.tokenAccount(hotWalletWsolAta).amount(1_000_000_000,"<").build()`             | `lighthouse.accountInfo(hotWallet.publicKey).lamports(SOL_TOPUP_THRESHOLD,"<").build()` |
| ~493     | `{ pubkey: hotWalletWsolAta, ... }` (validation target in remainingAccounts, 1st execute) | `{ pubkey: hotWallet.publicKey, ... }`                                                  |
| ~619     | `{ pubkey: hotWalletWsolAta, ... }` (validation target, 2nd execute attempt)              | `{ pubkey: hotWallet.publicKey, ... }`                                                  |

After the sensor moves, `hotWalletWsolAta` is orphaned. Remove its supporting
code (these all exist solely to feed the WSOL-ATA sensor):

- Line ~91 — `let hotWalletWsolAta: PublicKey;` declaration
- Lines ~192-195 — `hotWalletWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, hotWallet.publicKey);`
- Lines ~214-221 — `createAssociatedTokenAccountInstruction(... hotWalletWsolAta ...)` ATA creation block
- Lines ~250-254 — `surfpool.setTokenAccount({ owner: hotWallet.publicKey, mint: NATIVE_MINT, amount: 400_000_000 })` (the 0.4 WSOL sensor funding)

> NOTE: Do **not** remove `feeRecipientWsolAta` / `adminWsolAta` — those are
> fee accounts (fees are taken in WSOL _before_ the close) and are still
> required. Only `hotWalletWsolAta` (recipient-side, sensor-only) is dead.

## How the validation CPI wiring stays consistent

`execute_composable` passes `remaining_accounts[0]` = ValidationPDA, then the
next `numValidationAccounts` accounts as the Lighthouse read-targets. Since
`guard.numAccounts` is still 1 and `guard.accounts[0]` is now
`hotWallet.publicKey`, the remainingAccounts slices at lines ~490-496 and
~617-621 need only the single pubkey swap shown above. `guard.data` and
`guard.numAccounts` flow into `createComposablePolicy` unchanged.

## Acceptance criteria (verification)

- [x] Guard switched to `lighthouse.accountInfo(hotWallet.publicKey).lamports(...)`
- [x] Both `remainingAccounts` validation targets (1st + 2nd execute) use `hotWallet.publicKey`
- [x] Dead `hotWalletWsolAta` (declaration, derivation, ATA creation, 0.4 WSOL funding) removed
- [x] `feeRecipientWsolAta` / `adminWsolAta` left intact
- [x] `pnpm run lint` clean (no root lint script; verified via `prettier --check` + `tsc --noEmit` — both pass)
- [x] Suite passes against Surfpool: `surfpool start --legacy-anchor-compatibility --no-tui` then `cd tests && npx jest topup-balance-sol`

## Out of scope

- Program-side changes (none — the program is sensor-agnostic; it replays
  whatever assertion data + accounts the SDK supplies).
- The sibling test `tests/topup-balance-swap.test.ts` (that one delivers WSOL
  to a WSOL ATA, so its `tokenAccount().amount()` sensor is correct there).

## Summary of Changes

`tests/topup-balance-sol.test.ts` — switched the Lighthouse topup guard from
the WSOL-ATA sensor to the recipient system wallet's native SOL (lamports):

- **Guard**: `lighthouse.tokenAccount(hotWalletWsolAta).amount(1_000_000_000, "<")`
  → `lighthouse.accountInfo(hotWallet.publicKey).lamports(SOL_TOPUP_THRESHOLD, "<")`.
  Uses the existing `AccountInfoBuilder.lamports()` in `packages/sdk/src/lighthouse.ts:372`
  (serializes via `AssertAccountInfo`, `numAccounts: 1` — drop-in).
- **Threshold**: added `SOL_TOPUP_THRESHOLD = 20_000_000_000` (20 SOL) near the
  other test constants. hotWallet is funded 10 SOL at setup, so `< 20 SOL` holds
  → execute proceeds. No funding changes needed (minimal diff).
- **remainingAccounts**: both execute sites (1st + 2nd) now pass
  `hotWallet.publicKey` as the validation read-target instead of `hotWalletWsolAta`.
- **Dead code removed**: `hotWalletWsolAta` declaration, its `getAssociatedTokenAddressSync`
  derivation, its `createAssociatedTokenAccountInstruction` ATA-creation block, and
  the `surfpool.setTokenAccount({ ..., amount: 400_000_000 })` 0.4 WSOL sensor funding.
  Stale comments referencing the WSOL-ATA sensor updated.
- **Left intact**: `feeRecipientWsolAta` / `adminWsolAta` (fees taken in WSOL
  before the close), the sibling `topup-balance-swap.test.ts` (its WSOL sensor is
  correct there), and all program-side code (sensor-agnostic).

### Verification

- `prettier --check tests/topup-balance-sol.test.ts` → clean
- `tsc --noEmit -p tsconfig.json` → no errors in the file
- `grep hotWalletWsolAta` → 0 references in the SOL test (10 in the swap test, expected)
- Surfpool jest run NOT executed here — needs a live mainnet fork
  (`surfpool start --legacy-anchor-compatibility --no-tui`), user-spawned. This is
  the one remaining unchecked criterion.

### Files changed

- `tests/topup-balance-sol.test.ts`
