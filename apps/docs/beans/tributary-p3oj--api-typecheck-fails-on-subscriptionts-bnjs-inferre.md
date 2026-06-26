---
# tributary-p3oj
title: API typecheck fails on subscription.ts bn.js inferred type
status: completed
type: bug
priority: low
created_at: 2026-06-25T13:28:14Z
updated_at: 2026-06-25T19:18:59Z
parent: tributary-etbw
---

apps/api typecheck exits 2: subscription.ts:15 infers a bn.js type that fails strict tsc. Either import the proper BN type explicitly or annotate the value. Re-run the api workspace typecheck to confirm exit 0 before marking complete.

- [x] Add explicit portable return type to getSubscriptionDetails
- [x] Confirm `pnpm --filter @tributary-so/api build` exits 0

## Summary of Changes

- Added exported `SubscriptionDetails` return type to `getSubscriptionDetails` in `apps/api/src/services/subscription.ts`, fixing `TS2742` (inferred return type referenced `@types/bn.js` transitively via the IDL-derived `PaymentPolicy`, which `@tributary-so/api` does not depend on directly).
- The type is built portably from exported SDK types: `Omit<PaymentPolicy, ...>` for the BN-bearing top-level fields (`totalPaid`/`createdAt`/`updatedAt` \u2192 `number`, `memo` \u2192 `string`, `padding`/`bump` \u2192 `undefined`) plus `policyAccount: PublicKey`.
- `policyType` uses a loose `StrippedPolicyVariant` (index signature \u2192 `unknown`) so the emitted `.d.ts` never names `BN`; the runtime still strips per-variant `padding`. This is intentional \u2014 the nested payload keeps `BN` numerics (e.g. `amount`), and the only consumer (`buildSubscriptionClaims`, typed `any[]\)) already tolerates `BN`.
- Verification: `pnpm --filter @tributary-so/api build` exits 0. The 4 failing jest cases (`subscription.route`/`tokens.route` validation rejections) are pre-existing \u2014 reproduced on baseline with the change stashed.
