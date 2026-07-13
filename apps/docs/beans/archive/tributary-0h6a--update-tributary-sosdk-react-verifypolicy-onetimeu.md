---
# tributary-0h6a
title: Update @tributary-so/sdk-react — verifyPolicy + OneTime/UpTo buttons + JWT issuance helper
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:20:19Z
updated_at: 2026-07-05T07:53:30Z
parent: tributary-ml90
blocked_by:
    - tributary-5pd3
---

# Update @tributary-so/sdk-react

## What exists today

\`packages/sdk-react/src/hooks/useTributaryToken.ts\` — reads \`?token=\` from
URL, calls \`TributaryVerifier.verify()\`, returns \`TributaryJWTPayload\`.
Currently typed against the OLD \`subscriptions[]\` shape.

\`packages/sdk-react/src/components/\`:
- \`SubscriptionButton.tsx\` (line 37)
- \`MilestoneButton.tsx\` (line 25)
- \`PayAsYouGoButton.tsx\` (line 25)
- \`SubscriptionWithCodeButton.tsx\` — referral-code variant

NO \`OneTimeButton\`, NO \`UpToButton\`. Both ADR-0019 (OneTime policy) and
ADR-0020 (UpTo) shipped without sdk-react wrappers.

\`packages/sdk-react/src/index.ts\` — exports the buttons + hook.

\`apps/showcase-payments/src/pages/Success.tsx\` — consumes
\`useTributaryToken(undefined, API_BASE_URL)\`, reads \`payload.subscriptions\`
(via \`PaymentDetails\` component). **Will break** when payload shape changes.

## What changes

### 1. Update \`useTributaryToken\` to new payload shape

Reads \`policies\` instead of \`subscriptions\`. Returns
\`TributaryJWTPayload\` (the new discriminated-union shape from
\`@tributary-so/payments\`).

### 2. Add \`OneTimeButton\` component

Mirrors \`PayAsYouGoButton\`. Calls
\`sdk.getCreateOneTimePolicyInstruction\` (or whatever the existing low-level
helper is — check \`packages/sdk/src/instructions/\`). Props:
- \`recipient\`, \`gateway\`, \`tokenMint\`
- \`amount: BN\`
- \`dueDate?: number\` (<=0 = immediate)
- \`expiryDate?: number\` (None = never expires)
- \`memo?: string\` (64 bytes)
- \`onSuccess?: (policyPda) => void\`
- \`onError?: (err) => void\`
- \`label?: string\`

### 3. Add \`UpToButton\` component

Mirrors \`OneTimeButton\`. Calls
\`sdk.getCreateUpToPolicyInstruction\`. Props:
- \`recipient\`, \`gateway\`, \`tokenMint\`
- \`maxAmount: BN\`
- \`validAfter?: number\` (<=0 = immediate)
- \`deadline: number\` (mandatory > 0)
- \`memo?: string\`
- callbacks + label

### 4. Add JWT issuance helper

The existing \`apps/checkout/src/lib/tributary.ts\` has local helpers
\`issueSubscriptionToken\` and \`issueOneTimeToken\` that poll
\`/v1/tokens/issue\`. Move a generalized version into sdk-react (or sdk) so
the showcase-payment-policies app can reuse it without copy-paste:

\`\`\`ts
export async function issuePolicyToken(params: {
  walletPublicKey: PublicKey;
  recipient?: PublicKey;
  tokenMint?: PublicKey;
  policyAddress?: PublicKey;
  trackingId?: string;
  apiBaseUrl: string;
  timeoutMs?: number;
}): Promise<{ token: string; expiresAt: number }>
\`\`\`

This replaces both \`issueSubscriptionToken\` and \`issueOneTimeToken\`.
\`apps/checkout/src/lib/tributary.ts\` becomes a thin shim over the sdk-react
export. Do NOT delete the checkout helpers — just delegate.

### 5. Add \`verifyPolicy\` wrapper hook (optional)

\`useVerifiedPolicy(token, { recipient, variant })\` — returns the matching
\`PolicyClaim\` or null. Sugar over \`useTributaryToken\` +
\`TributaryVerifier.verifyPolicy\`. Useful for consumers who want
typed-per-variant access.

### 6. Export everything from \`src/index.ts\`

\`\`\`diff
+ export { OneTimeButton } from \"./components/OneTimeButton\";
+ export { UpToButton } from \"./components/UpToButton\";
+ export { issuePolicyToken } from \"./helpers/issuePolicyToken\";
+ export type { OneTimeButtonProps, UpToButtonProps } from \"...\";
\`\`\`

## Out of scope

- Updating \`apps/showcase-payments/src/pages/Success.tsx\` — that's a consumer
  fix, done in the showcase feature (or as a drive-by here if trivial).
- Updating \`apps/checkout/src/components/checkout-form.tsx\` and \`pay-form.tsx\`
  — done in the checkout reframe feature.

## Acceptance criteria (TDD)

- [ ] \`useTributaryToken\` returns new \`policies\` shape; types align with
      \`@tributary-so/payments\` post-refactor
- [ ] \`OneTimeButton\` creates an OneTime policy on-chain (devnet test)
- [ ] \`UpToButton\` creates an UpTo policy on-chain (devnet test)
- [ ] \`issuePolicyToken\` polls \`/v1/tokens/issue\` and returns \`{token, expiresAt}\`
- [ ] Existing buttons (Subscription/Milestone/PayAsYouGo) still work
- [ ] \`pnpm run build\` + \`pnpm run lint\` clean in \`packages/sdk-react\`
- [ ] Storybook/showcase snippet (optional) for the new buttons

## Handoff references

- \`packages/sdk-react/src/hooks/useTributaryToken.ts\` — main hook to update
- \`packages/sdk-react/src/components/PayAsYouGoButton.tsx\` — template for new buttons
- \`apps/checkout/src/lib/tributary.ts:25-60\` and \`269-297\` — JWT issuance
  helpers to generalize
- \`packages/sdk/src/instructions/\` — low-level policy creation helpers (verify
  OneTime + UpTo instruction builders exist)
- Milestone tributary-pzp2 — design decisions

## Summary of Changes

- types.ts: added CreateOneTimeParams/Result, CreateUpToParams/Result, UseCreateOneTimeReturn, UseCreateUpToReturn
- hooks/useCreateOneTime.ts + useCreateUpTo.ts: mirror useCreatePayAsYouGo pattern; call sdk.createOneTimePayment and sdk.createUpToAuthorization respectively
- components/OneTimeButton.tsx + UpToButton.tsx: mirror PayAsYouGoButton
- helpers/issuePolicyToken.ts: generalized polling helper, replaces both issueSubscriptionToken and issueOneTimeToken. 404 polls (slot lag), other errors surface immediately
- hooks/index.ts + src/index.ts: export everything
- useTributaryToken already aligned (uses TributaryJWTPayload which now has policies[])
- pnpm run build clean
