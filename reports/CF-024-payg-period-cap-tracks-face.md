# CF-024: PayAsYouGo Period Cap Tracks Face, Not Gross — NET-Mode User Cost Exceeds Cap

> **Severity:** ⚪ 1 (INFO)  
> **Category:** Economic Logic (by-design, potentially surprising)  
> **File:** `programs/tributary/src/instructions/payment/execute_payment.rs:363`  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

| Path          | `advance_policy` amount       | Period cap tracks |
| ------------- | ----------------------------- | ----------------- |
| PaymentPolicy | `payment_amount` (face/chunk) | Face              |
| Composable    | `gross_pull` (face + fee)     | Gross             |

For PaymentPolicy in NET mode (`FEATURE_NET_AMOUNT`), `total_from_user = payment_amount + fee`. The user pays gross, but `current_period_total` accumulates only face. After N chunks: `current_period_total = N × chunk ≤ max_amount_per_period`, but `total_user_cost = N × (chunk + fee)`.

## Impact

By design per ADR-0026. The composable path was corrected to bind on gross; the PaymentPolicy path was not. A NET-mode PaymentPolicy PayAsYouGo user's actual cost can exceed `max_amount_per_period` by `N × fee_per_chunk`. Not a vulnerability — the gateway fee was authorized at creation — but potentially surprising for users who expect `max_amount_per_period` to be a hard ceiling on total outflow.

## Recommendation

Document the behavior. If a hard ceiling on total user cost is desired for PaymentPolicy PayAsYouGo in NET mode, change `advance_policy` to accumulate `total_from_user` instead of `payment_amount` for that combination.
