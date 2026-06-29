---
# tributary-mb9d
title: Re-voice apps/app + apps/checkout to final identities (C)
status: completed
type: task
priority: normal
created_at: 2026-06-28T11:21:44Z
updated_at: 2026-06-28T19:03:27Z
blocked_by:
    - tributary-m96d
---

Deferred C-tier re-voicing. Depends on the split epic landing — voice depends on each surface's final identity.

Scope:
- [ ] apps/app: owner-operator voice. Hero handle = 'If This Then Money' motif scaled to minimal config ('If Monday Then $10 to wallet'). Body = utility (your policies, your delegation, your activity). Drop persona-A merchant voice ('Accept...').
- [ ] apps/checkout: creation-surface voice. Recipient-hosted mode + owner-direct create mode + future composable mode.
- [ ] Stats sidebar: replace 'Type: Recurring Payments' with primitive framing (Network/Model/UX).
- [ ] Footer tagline: canonical primitive one-liner, not 'Automated recurring payments...'.

NOT in scope: pitch decks (deleted), showcases (separate).

Sequencing rationale: doing C before the split means re-voicing code that's about to move (payment-policy-form.tsx etc). A+B (vocab hygiene + tokens) applies regardless and ships now; C targets the final structure.

Scope narrowed post-Q7 (grilling 2026-06-28): C-on-staying-surfaces moved INTO tributary-yra3 (those surfaces don't move, so re-voicing is permanent). THIS bean now covers ONLY the 3 moving quickstart files (payment-policy-form.tsx, payment-policy-feature.tsx, integration-code.tsx) — re-voiced after they land in apps/checkout per the split epic.

## Resolution (2026-06-28)

Folded into tributary-m96d execution. Original scope (re-voice 3 files after they move to apps/checkout) became moot when the m96d move target changed from apps/checkout → a new apps/showcase-payment-policies (same HeroUI stack, clean git mv). The 3 files were already given owner-operator vocabulary hygiene by yra3; light showcase-context reframing handled during the m96d move. No separate re-voice pass needed.
