---
# tributary-wmqx
title: 'R-1: Remove hard HeroUI/lucide-react deps from buttons'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:03Z
updated_at: 2026-07-06T16:46:51Z
parent: tributary-jnx8
---

OneTimeButton.tsx:3, UpToButton.tsx:3 — break in non-HeroUI apps. Make optional or use slots.

## Summary of Changes
Removed hard @heroui/button and lucide-react imports from OneTimeButton.tsx and UpToButton.tsx in packages/sdk-react/src/components. Both components now render a native <button> styled with the same Tailwind classes (extracted to a new shared buttonStyles.ts module that also handles R-2 dedup). The radius/size HeroUI-style props are mapped to tailwind classes via buttonClass(). SPINNER_SVG is a pure-CSS inline spinner replacing lucide-react's Loader2. Note: the package-level @heroui/button + lucide-react deps remain because MilestoneButton, PayAsYouGoButton, SubscriptionButton, and SubscriptionWithCodeButton still hard-import them (out of scope for this finding — those weren't named in the review).
