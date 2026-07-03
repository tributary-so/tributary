---
# tributary-j2a4
title: 'Brand QA: voice consistency + build/lint + story-arc audit'
status: todo
type: feature
priority: normal
created_at: 2026-07-03T07:14:31Z
updated_at: 2026-07-03T07:14:52Z
parent: tributary-1gr9
blocked_by:
    - tributary-jm1f
    - tributary-twlh
    - tributary-p7v8
    - tributary-lmrn
---

Final QA pass across all four surfaces once the feature beans land. Brand is only real if it is CONSISTENT — this bean enforces the cure that ADR-0015 diagnosed but did not enforce.

RUN AFTER: the four surface features (landing, app, docs, pre-seed) are substantially done.

CHECKLIST:
- [ ] Forbidden-string grep across apps/landing, apps/app, apps/docs/docs, pre-seed.tributary.so/index.md:
      - 'composable automation layer' as a standalone noun
      - 'the payment protocol for Solana' as headline frame
      - 'composable automation platform'
      -> expect 0 hits in prose/code-comment copy (hits inside ADRs and IDL are FINE — those are immutable).
- [ ] Required-string presence:
      - 'Money should move itself.' (soul) — present on landing hero, docs home, pitch.
      - 'Stop pushing your bags' (tagline) — present on landing hero + pitch.
      - 'If This Then Money' (motif) — present on landing + pitch.
- [ ] Story-arc consistency: read landing hero then pitch title/closing then docs home in sequence. Same Setup (stablecoins built the balance) -> Conflict (inert/push money) -> Resolution (Tributary built the riverbed / pull don't push). No contradictions.
- [ ] Voice rules (WORLDBRAND.md section 10) sampled across surfaces: one noun ('the primitive'), 'route' over 'send/pay/transfer', 'banks' double-meaning used at most once per surface, river = substrate (no puns).
- [ ] Type system: ONE brand font family across landing + app + docs (currently landing unspecified, app has gt-cinetype/denim, docs has Roboto Mono). Reconcile.
- [ ] Meta/SEO: landing index.html title + og/twitter + meta description all carry new brand. docs site_description updated.
- [ ] Build/lint green: pnpm run lint at root; mkdocs build clean; Marp rebuild of pitch PDF clean.
- [ ] Links: WORLDBRAND.md referenced (or its thesis restated) in contributor-facing voice guidance so the brand survives future edits.
- [ ] Report any surfaces where the three-dialect problem persists (the original ADR-0015 diagnosis).

SOURCE OF TRUTH: WORLDBRAND.md, ADR-0015.
VERIFY: this bean's checklist all ticked; attach the forbidden/required string grep output to the bean body as evidence.

NOTE: if a surface cannot fully comply (e.g. ADR immutable text contains a retired phrase), document the exception in the bean body rather than forcing an edit.
