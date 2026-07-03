---
# tributary-p7v8
title: 'Brand pass: apps/docs (hero + terminology, keep ADRs/IDL intact)'
status: todo
type: feature
priority: normal
created_at: 2026-07-03T07:14:31Z
updated_at: 2026-07-03T07:14:31Z
parent: tributary-1gr9
---

Brand alignment for the MkDocs Material docs site. Docs serve developers (persona B) — the voice can stay technical but the framing/nav/marketing-prose must drop the two-products vocabulary.

CURRENT STATE:
- apps/docs/mkdocs.yml:1-3 — site_name 'Tributary Protocol Documentation', site_description 'Open-source, permissionless automated payment infrastructure for Solana' = bland/old.
- mkdocs.yml:30-50 — nav has 'Integration Guide > Pull Payments vs Programmable' = the two-products framing ('vs' reinforces two products). Devs DO need the technical distinction (PaymentPolicy vs ComposablePolicy) but the 'vs' top-level framing undercuts the one-primitive identity.
- apps/docs/adr/ — 22 ADRs, authority on rationale. IMMUTABLE — do not edit.
- apps/docs/docs/ — prose docs (index, use-cases, faq, integration-guide/*).
- protocol-reference/ — IDL, accounts, fees, errors. Technical accuracy is authority; brand voice applies to prose wrappers only.
- Theme: Roboto Mono, palette white/black + slate toggle.

WHAT TO CHANGE (checklist):
- [ ] mkdocs.yml site_description to new brand (one-paragraph statement or soul-led).
- [ ] docs/index.md (docs home/hero) rewrite lead with the soul + one-paragraph statement. Docs home is a marketing surface for devs.
- [ ] Re-frame the nav: 'Pull Payments vs Programmable' to reframe around the one primitive with two configurations (minimal knob config / full config), NOT two products. Keep the PaymentPolicy/ComposablePolicy technical split INSIDE the pages (devs need it).
- [ ] Voice pass on prose sections (use-cases.md, faq.md, integration-guide/*/overview.md): 'the primitive', 'route' not 'send', retire 'composable automation layer' as a noun. Keep API signatures and code blocks technically exact.
- [ ] Add a short 'Brand and voice' note (or link to WORLDBRAND.md) for doc contributors so future docs stay on-voice.
- [ ] DO NOT touch apps/docs/adr/ (immutable). DO NOT touch IDL/error-codes/fees technical accuracy.
- [ ] ADR-0015 already lives here and IS the brand authority for page mechanics — it stays as-is.

SOURCE OF TRUTH: WORLDBRAND.md, ADR-0015, CONTEXT.md.
OUT OF SCOPE: ADRs, IDL, protocol-reference technical content, fees/security/error-codes accuracy.

VERIFY: mkdocs build clean. Grep docs/docs for 'composable automation layer' / 'payment protocol for Solana' as standalone nouns -> 0 hits in prose (code/IDL hits OK). Nav no longer says 'vs' between the two policy families.
