# Migration: v1 → v2

Tributary v2 adds the ComposablePolicy layer (validation + forward hooks)
to the existing PaymentPolicy layer. **Existing v1 integrations continue to
work unchanged** — v2 is a program upgrade, not a breaking change. This
guide covers what changed, what didn't, and when you might want to opt in.

## What changed

| Area         | v1                                                        | v2                                                                           |
| ------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Policy types | `PaymentPolicy` (subscription, milestone, pay-as-you-go)  | + `ComposablePolicy` (same types + validation + forward hooks)               |
| New variants | —                                                         | + `OneTime`, `UpTo`                                                          |
| Delegate     | `UserPayment` PDA or legacy global `PaymentsDelegate` PDA | Same — dual-delegate fully backward-compatible                               |
| Fees         | `FEATURE_NET_AMOUNT` flag controls gross/net pull         | Composable always input-side (ADR-0026); PaymentPolicy still honors the flag |
| SDK          | `createSubscription`, `createPayAsYouGo`, etc.            | + `createComposable`, `executeComposable`, `lighthouse` facade               |

## What did NOT change

- **Program ID** — same: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`
- **PDA seeds for v1 accounts** — `PaymentPolicy`, `UserPayment`,
  `PaymentGateway`, `ProgramConfig` all unchanged
- **v1 instruction signatures** — `create_payment_policy`, `execute_payment`,
  etc. work exactly as before
- **Your existing delegate approvals** — if you approved the `UserPayment`
  PDA or the legacy `PaymentsDelegate` PDA, those still work for both v1
  and v2 policies
- **Fee model** — the unified gateway fee model (ADR-0018) applies to both

## The dual-delegate model

Tributary accepts two delegate authorities on a user's token account:

1. **`UserPayment` PDA** (recommended) — `["user_payment", owner, mint]`.
   This is the default for new SDK integrations. Per-user, per-mint.
2. **`PaymentsDelegate` PDA** (legacy) — `["payments"]`. A single global
   delegate. Still accepted for backward compatibility.

At execution time, `resolve_delegate` checks both paths. If either matches
the actual delegate on the token account, execution proceeds.

### Do I need to migrate?

**No.** If your v1 integration uses the legacy global delegate, it keeps
working. New composable policies created via the SDK default to the
`UserPayment` PDA, but the program accepts either.

### When to switch to UserPayment PDA

- **New integrations** — start with `UserPayment`. It's per-user, per-mint,
  so revoking one user's delegation doesn't affect others.
- **Security upgrades** — the `UserPayment` PDA provides finer-grained
  control. You can revoke delegation for a specific user+mint pair without
  touching others.
- **Never required** — the legacy delegate is not deprecated. It's just
  less granular.

### How to switch (optional)

```typescript
// Old: legacy global delegate approved on token account
// (nothing to do — it still works)

// New: re-approve to the UserPayment PDA
const { address: userPaymentPda } = sdk.getUserPaymentPda(owner, mint);
const approveIx = createApproveInstruction(
  ownerTokenAccount,
  userPaymentPda, // delegate
  owner,
  amount
);
```

After re-approval, both v1 `PaymentPolicy` and v2 `ComposablePolicy`
execute against the `UserPayment` PDA.

## Upgrading your SDK

```bash
pnpm add @tributary-so/sdk@latest
```

The SDK is backward-compatible. All v1 methods (`createSubscription`,
`createPayAsYouGo`, `executePayment`, etc.) work exactly as before. New
v2 methods (`createComposable`, `executeComposable`) are additive.

## Adopting composable policies (optional)

You don't have to. But if you want validation hooks or forward swaps:

1. Read the [composable overview](https://docs.tributary.so)
2. Try a [quickstart](https://docs.tributary.so) (<10 min)
3. The same `UserPayment` PDA serves both `PaymentPolicy` and
   `ComposablePolicy` — no new delegate approval needed if you're already
   on `UserPayment`

### Counter independence

`PaymentPolicy` IDs come from `user_payment.created_policies_count`.
`ComposablePolicy` IDs come from `user_payment.created_composable_count`.
These are **independent** — a v1 policy #1 and a v2 policy #1 can coexist
on the same `UserPayment` with different PDA addresses.

## Questions?

- [FAQ](https://docs.tributary.so)
- [Existing team migration notice](https://docs.tributary.so)
- [Full ADR list](https://docs.tributary.so)
