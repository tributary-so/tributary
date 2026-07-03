---
# tributary-9zbg
title: 'Documentation: new ADR for generalized JWT + AGENTS.md update'
status: todo
type: feature
priority: normal
created_at: 2026-07-03T09:22:10Z
updated_at: 2026-07-03T09:22:50Z
parent: tributary-pzp2
blocked_by:
    - tributary-o7du
---

# Documentation: generalized JWT ADR + AGENTS.md

## What changes

### 1. New ADR

\`apps/docs/adr/0023-jwt-authorization-and-payment-proof-across-all-policytype-variants.md\`
(next free number — verify with \`ls apps/docs/adr/\`).

Following the format in \`apps/docs/adr/0001-…md\`:

- **Decision**: JWT \`/v1/tokens/issue\` generalizes from subscription-only to
  all 5 PolicyType variants. \`TributaryJWTPayload.subscriptions\` →
  \`.policies\` as a discriminated union. JWT now carries authorization proof
  (policy exists, Active) AND payment proof (\`lastPayments[]\); merchant
  decides which to require.
- **Rejected alternatives**:
  - Separate \`/v1/tokens/issue-policy\` endpoint (rejected: same lookup +
    signing machinery, one endpoint is simpler)
  - Keep \`subscriptions[]\` and add parallel \`policies[]\` (rejected: payload
    bloat, dual sources of truth, breaks consumers anyway)
  - Per-variant endpoints (rejected: client-side branching, no benefit)
- **Rationale**: \`buildSubscriptionClaims\` already didn't enforce paymentCount
  > 0 — the \"authorization-only\" semantic exists for subscriptions. Generalizing
  formalizes what's already true and unblocks Milestone/PayAsYouGo/OneTime/UpTo.
- **Breaking change**: \`TributaryJWTPayload\` shape. Consumers MUST move from
  \`payload.subscriptions\` to \`payload.policies\`. Deprecated alias path
  documented.

### 2. Update \`apps/docs/adr/0019-onetime-policy-variant.md\`

Add a note clarifying the distinction between:
- Standalone \`transfer\` instruction (ADR-0004) — direct SPL payment, no policy
- OneTime PolicyType (ADR-0019) — single-shot policy with full gateway lifecycle

Cross-link to the new ADR-0023 and to the checkout reframe feature.

### 3. Update \`AGENTS.md\`

In the \"SDK usage\" section, add a \"JWT verification\" subsection:
\`\`\`typescript
import { TributaryVerifier } from \"@tributary-so/payments\";

const verifier = new TributaryVerifier({ baseUrl: \"https://api.tributary.so\" });
const payload = await verifier.verify(token);

// payload.policies: PolicyClaim[] (discriminated union)
// payload.lastPayments: PaymentRecord[]
for (const p of payload.policies) {
  switch (p.variant) {
    case \"subscription\": /* p.amount, p.nextPaymentDue, ... */
    case \"milestone\":    /* p.currentMilestone, p.escrowRemaining */
    case \"payAsYouGo\":   /* p.capRemainingThisPeriod, p.periodResetsAt */
    case \"oneTime\":      /* p.amount, p.dueDate, p.expiryDate */
    case \"upTo\":         /* p.maxAmount, p.deadline */
  }
}
\`\`\`

### 4. Update \`CONTEXT.md\`

Add a \"JWT claim\" entry under the relevant section, distinguishing
\"authorization proof\" (policy exists) from \"payment proof\"
(\`lastPayments[]\`).

## Acceptance criteria

- [ ] ADR-0023 written, format matches existing ADRs
- [ ] ADR-0019 amended with the direct-transfer vs policy distinction
- [ ] AGENTS.md SDK usage section shows the generalized verifier
- [ ] CONTEXT.md updated with the new terms
- [ ] \`mkdocs serve\` builds clean (no broken links)

## Handoff references

- \`apps/docs/adr/0019-onetime-policy-variant.md\` — to amend
- \`apps/docs/adr/0020-upto-scheme-and-policy-variant.md\` — cross-link
- \`apps/docs/adr/0004-permissionless-execution-and-standalone-transfer.md\`
- \`AGENTS.md\` — SDK usage section
- \`CONTEXT.md\` — glossary
- Milestone tributary-pzp2 — design decisions to encode
