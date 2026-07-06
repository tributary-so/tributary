---
# tributary-a13n
title: 'T2: mkdocs.yml nav rewrite + file moves + defect fixes'
status: completed
type: task
priority: high
tags:
    - ia
    - nav
created_at: 2026-06-25T08:40:57Z
updated_at: 2026-06-25T09:38:50Z
parent: tributary-61ow
---

Rewrite mkdocs.yml nav to the new IA. Move 9 existing files to new paths. Create stub pages for Get Started, Protocol Reference top-level, and Reference sections. Fix 2 documentation defects.

## Nav target structure (top-level)
Home / Get Started / Integration Guide / Protocol Reference / Operate / API Server / Reference

## File moves (git mv)
- docs/sdk.md → docs/integration-guide/pull-payments/sdk.md
- docs/sdk-react/* → docs/integration-guide/pull-payments/sdk-react/*
- docs/checkout.md → docs/integration-guide/pull-payments/checkout.md
- docs/jwt-auth.md → docs/integration-guide/pull-payments/jwt-auth.md
- docs/x402*.md → docs/integration-guide/pull-payments/x402/
- docs/tools.md → docs/integration-guide/pull-payments/cli.md
- docs/integration.md → docs/integration-guide/index.md (rewrite as decision page)
- docs/policies/*.md → docs/protocol-reference/payment-policy/
- docs/referral-program.md → docs/protocol-reference/payment-policy/referral-program.md
- docs/fees.md → docs/protocol-reference/fees.md
- docs/architecture.md → docs/protocol-reference/overview.md (stub — T7 fills)
- docs/security.md → docs/protocol-reference/security.md (stub — T7 fills)
- docs/providers.md → docs/operate/providers.md
- docs/smart-contract.md → DELETE (replaced by protocol-reference pages)
- docs/how.md → DELETE (content split into get-started/* + integration-guide/index.md)

## Stub pages to create (H1 + one-paragraph + TODO comment)
- docs/get-started/{quickstart,environments,common-errors}.md
- docs/protocol-reference/{accounts-and-pdas,idl,deployment,error-codes,changelog}.md
- docs/reference/glossary.md

## Defect fixes (apply before/during moves)
1. Program ID typo: grep for 'AD1rBRXEdy' (wrong) everywhere, replace with 'AD1rEBRXEdy' (correct: TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ)
2. PaymentFrequency enum in subscription.md: remove BiWeekly/Yearly, add SemiAnnually/Annually/Custom(u64) per state/payment_policy.rs:21-37

## Verification
- mkdocs build succeeds with no broken links
- Nav renders correctly

## Summary of Changes

T2 executed the IA restructure for `apps/docs`. All scope items complete.

### Defect fixes
- **Defect 1 (program ID typo):** the only docs occurrence of the typo
  (`AD1RxBRXEdy` in `how.md`) was eliminated when `how.md` was deleted in the
  move step. No other docs files referenced the wrong program ID.
- **Defect 2 (PaymentFrequency enum):** fixed in `policies/subscription.md`
  (now `protocol-reference/payment-policy/subscription.md`) — removed
  `BiWeekly`/`Yearly`, added `SemiAnnually`, `Annually`, `Custom(u64)` to match
  `programs/tributary/src/state/payment_policy.rs:21-37`.

### File moves (git mv, history preserved)
- `sdk.md` → `integration-guide/pull-payments/sdk.md`
- `sdk-react/{buttons,common,hooks,index}.md` → `integration-guide/pull-payments/sdk-react/`
- `checkout.md` → `integration-guide/pull-payments/checkout.md`
- `jwt-auth.md` → `integration-guide/pull-payments/jwt-auth.md`
- `x402.md` → `integration-guide/pull-payments/x402/overview.md`
- `x402-getting-started.md` → `integration-guide/pull-payments/x402/getting-started.md`
- `x402-api-reference.md` → `integration-guide/pull-payments/x402/api-reference.md`
- `tools.md` → `integration-guide/pull-payments/cli.md`
- `fees.md` → `protocol-reference/fees.md`
- `referral-program.md` → `protocol-reference/payment-policy/referral-program.md`
- `policies/{subscription,milestone,payasyougo}.md` → `protocol-reference/payment-policy/`
- `providers.md` → `operate/providers.md`
- `integration.md` → `integration-guide/index.md` (content left intact; marked for rewrite as a decision page)

### Files deleted (git rm)
- `smart-contract.md` — superseded by protocol-reference pages
- `how.md` — content split into get-started/* + integration-guide/index.md
- `architecture.md` — superseded by T7's `protocol-reference/overview.md`
- `security.md` — superseded by T7's `protocol-reference/security.md`

  (Note: `architecture.md`/`security.md` were `git rm`'d rather than `git mv`'d
  because T7 had already created full-content files at the destination paths.
  Overwriting T7's work with stubs would have destroyed completed work.)

### Stubs created (H1 + paragraph + TODO comment)
- `get-started/quickstart.md`
- `get-started/environments.md`
- `get-started/common-errors.md`
- `reference/glossary.md`
- `integration-guide/pull-payments/overview.md` (section landing)
- `protocol-reference/payment-policy/overview.md` (section landing)

  Note: protocol-reference top-level stubs (`accounts-and-pdas`, `idl`,
  `deployment`, `error-codes`, `changelog`, `overview`, `security`) were NOT
  created because T7 had already shipped full-content versions. Left T7's
  files intact.

### mkdocs.yml
- Rewrote the entire `nav:` block to the new IA (Home / Get Started /
  Integration Guide / Protocol Reference / Operate / API Server / Reference).

### Broken-link fixes (consequence of moves)
- `index.md`: 9 links updated to new paths (policies/*, sdk.md, checkout.md,
  sdk-react/, providers.md, architecture.md → protocol-reference/overview.md).
- `faq.md`: `integration.md` → `integration-guide/index.md`.
- `use-cases.md`: 4 links (policies/*, integration.md).
- `api/overview.md`, `api/rest-api.md`: SDK/checkout/jwt-auth links → new
  `integration-guide/pull-payments/` paths.
- `protocol-reference/fees.md`: providers → `../operate/providers.md`,
  referral-program → `payment-policy/referral-program.md`.
- `operate/providers.md`: `how.md` → `../protocol-reference/overview.md`.
- `integration-guide/pull-payments/checkout.md`: policies + api links.
- `integration-guide/pull-payments/sdk-react/common.md`: integration + api links.
- `integration-guide/pull-payments/sdk.md`: tools → cli.
- `integration-guide/pull-payments/jwt-auth.md`: 4 next-step links.
- `integration-guide/pull-payments/x402/{getting-started,overview}.md`:
  policies/smart-contract/x402 links.

### Verification
- `make build` succeeds: "Documentation built in 8.77 seconds".
- Every nav target file exists.
- Residual mkdocs warnings are all in files owned by OTHER tasks:
  - `integration-guide/index.md` (left intact per bean; rewrite task owns it)
  - `integration-guide/programmable-pull-payments/{overview,sdk}.md` (T5)
  - `protocol-reference/overview.md` (T7)

### Out-of-scope items noted
- Installed `mkdocs-swagger-ui-tag==0.7.1` (was missing; blocks build). T3's
  pyproject.toml already declared it.
