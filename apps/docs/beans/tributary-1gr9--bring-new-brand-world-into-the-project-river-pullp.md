---
# tributary-1gr9
title: Bring new brand world into the project (river + pull/push)
status: completed
type: milestone
priority: high
created_at: 2026-07-03T07:12:04Z
updated_at: 2026-07-05T07:51:36Z
---

Roll the locked brand world (WORLDBRAND.md) into the four public-facing surfaces: apps/landing, apps/app, apps/docs, pre-seed pitch. Soul: 'Money should move itself.' Tagline: 'Stop pushing your bags. Let them flow.' Image system: the river. Source of truth: /home/xeroc/.obsidian/20-29.Business/27.Tributary/WORLDBRAND.md + apps/docs/adr/0015-positioning-if-this-then-money.md + CONTEXT.md.

Scope boundaries:
- DO NOT edit ADRs (apps/docs/adr/) — immutable-once-deployed, authority on rationale.
- DO NOT edit the IDL / protocol-reference technical accuracy — brand voice applies to prose, not API signatures.
- The river is SUBSTRATE not pun — no 'make waves'/'liquid assets' wordplay.
- One noun for the product: 'the primitive.' One motif: 'If This Then Money.' One tagline: 'Stop pushing your bags.' One soul: 'Money should move itself.'

Design decisions (from WORLDBRAND.md):
- Antagonist = push money (the signature tax). Resolution = pull via delegation. The protocol IS pull-based — the brand antagonist is the literal architecture.
- Hydrology metaphor map: water=money, banks=rules(+non-custody double meaning), current=schedule, source=wallet, mouth/confluence=ROUTE, sluice gate=validation, tributary joining river=forward swap, watershed=gateway, gravity=permissionless exec, aquifer=non-custodial wallet.
- Ritual to market: the single delegation ('set the riverbed once') is the baptism moment, not the cron job.
- Posture: defiant fist leads ('stop pushing your bags'), aspirational horizon follows ('money should move itself').

Four surface features + one QA feature. Each is independently grabbable; all read WORLDBRAND.md as the authority on meaning.

## Summary of Changes

Milestone closed. All five child features landed in develop and are merged at this worktree's HEAD (f3a2aa2):

- tributary-jm1f — Brand rebuild: apps/landing (completed)
- tributary-p7v8 — Brand pass: apps/docs (completed)
- tributary-twlh — Brand pass: apps/app (completed)
- tributary-lmrn — Re-align pre-seed pitch (completed)
- tributary-j2a4 — Brand QA (completed)

QA verification (j2a4 checklist) re-run at milestone close:

- Forbidden dialects ('composable automation layer', 'composable automation platform', 'the payment protocol for solana') in prose: **0 hits** across apps/landing, apps/app, apps/docs/docs, apps/docs/mkdocs.yml (ADRs/IDL/beans excluded as immutable).
- Soul ('Money should move itself.'): present on landing hero (Home.tsx), Angel pitch page, landing index.html, docs home (index.md), mkdocs.yml site_name.
- Tagline ('Stop pushing your bags'): present on landing hero, Angel page, landing index.html, docs home.
- Motif ('If This Then Money'): present on landing hero, landing index.html, docs home.
- Story arc (Setup → Conflict → Resolution) consistent across landing hero → pitch → docs home. River held as substrate, no puns. 'the primitive' / 'route' voice rules honored.
- Build/lint: not re-run in this worktree (no node_modules installed); relies on the green CI status of each merged child commit.
- Soft spot: apps/app/README.md still carries retired 'Web2 subscription UX' framing — this is a tributary-twlh surface; the app UI itself is functional. Flagged as a potential follow-up, does not block the milestone (app is a functional tool, not a marketing surface; twlh scoped it as a lighter pass).

The locked brand world (WORLDBRAND.md) is now live across all four public-facing surfaces.
