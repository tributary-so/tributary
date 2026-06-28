---
# tributary-mb9d
title: Re-voice apps/app + apps/checkout to final identities (C)
status: todo
type: task
priority: normal
created_at: 2026-06-28T11:21:44Z
updated_at: 2026-06-28T12:16:00Z
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
