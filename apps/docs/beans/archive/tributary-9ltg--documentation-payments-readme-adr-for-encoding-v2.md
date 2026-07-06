---
# tributary-9ltg
title: Documentation — payments README + ADR for encoding v2
status: completed
type: feature
priority: normal
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-04T09:50:58Z
parent: tributary-f6yh
blocked_by:
    - tributary-zre4
    - tributary-nx0s
---

# Documentation — payments encoding v2

## What changes

### 1. ADR: \`apps/docs/adr/00XX-payments-session-encoding-v2-all-policytype-variants.md\`

(Verify next free number with \`ls apps/docs/adr/\` — likely 0024 after the
JWT milestone's ADR-0023.)

Format per \`apps/docs/adr/0001-…md\`:
- **Decision**: \`@tributary-so/payments\` session encoding extends from 2
  modes (subscription/payment) to 6 (subscription/milestone/payAsYouGo/
  oneTime/upTo/payment). \`TributaryConfig\` becomes a discriminated union.
  New \`/policy/{blob}\` URL path for the 4 new variants; existing
  \`/subscribe/\` and \`/pay/\` stay as backward-compat aliases.
- **Rejected alternatives**:
  - Per-variant URL paths with no shared \`/policy/\` (rejected: 4 new paths
    vs 1 unified)
  - Deprecate direct-transfer \`mode: \"payment\"\` entirely (rejected: breaks
    outstanding links; transfer and OneTime policy serve different needs)
  - Loose validation at encode-time (rejected: drift between TS and chain
    causes bad UX — fail-fast enforced via parity tests)
- **Rationale**: hosted checkout deep-link use case (Axis 1 = a) requires
  the encoding spec to carry all variant-specific fields. Discriminated
  union enables type-safe \`switch\` handling. Soft-deprecation gives
  consumers one release to migrate.

### 2. Update \`packages/payments/README.md\`

Currently 687 lines, all subscription + one-time-transfer examples. Add:
- Quick-start for each new variant (milestone/payAsYouGo/oneTime-policy/upto)
- \"Encoding v2\" section explaining the discriminated union
- Migration guide: old flat \`TributaryConfig\` → new \`{ variant: ..., ... }\`
- Cross-link to the new ADR

### 3. Update \`packages/payments/example.ts\`

Add per-variant encode/decode examples mirroring the README quick-starts.

## Acceptance criteria

- [x] ADR 0023 written, format matches existing ADRs
- [x] README has quick-start for the 4 new variants + subscription/payment already documented
- [x] Migration guide present (legacy flat config -> discriminated union; .subscriptions -> .policies)
- [ ] \`example.ts\` runs clean (\`npx ts-node example.ts\` or equivalent)
- [ ] \`mkdocs serve\` builds without broken links

## Handoff references
- \`apps/docs/adr/0019-onetime-policy-variant.md\`, \`0020-upto-scheme-and-policy-variant.md\` — cross-link
- \`packages/payments/README.md\` — file to update
- Milestone tributary-f6yh — design decisions to encode

## Summary of Changes

- `apps/docs/adr/0023-payments-session-encoding-v2-all-policytype-variants.md`
  (new): Decision / Rejected alternatives / Rationale. Auto-discovered by the
  neoteroi.mkdocsoad plugin (no nav edit needed). Cross-links ADR-0004/0019/0020.
- `packages/payments/README.md`: new 'Encoding v2 — All Policy Variants'
  section (variant/path table + milestone/payAsYouGo/oneTime/upTo quick-starts
  + migration guide: legacy flat config -> union, .subscriptions -> .policies).
  Cross-links the ADR.
- `packages/payments/example.ts`: added `encodingVariants()` — encode/decode
  round-trip for all 6 modes; verified via `npx tsx` (6/6 OK).

Verification: `mkdocs build --strict` completes (7.72s, no new broken links);
payments pnpm test = 10 suites / 176 tests pass; build/lint clean.
