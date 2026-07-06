---
# tributary-jek8
title: 'R-2: Deduplicate Tailwind class strings'
status: completed
type: task
priority: low
created_at: 2026-07-06T15:42:03Z
updated_at: 2026-07-06T16:47:00Z
parent: tributary-jnx8
---

Both OneTimeButton and UpToButton have duplicated long Tailwind class strings. Extract shared classes.

## Summary of Changes
Extracted the duplicated long Tailwind class string from OneTimeButton.tsx and UpToButton.tsx into packages/sdk-react/src/components/buttonStyles.ts (buttonClass helper, RADIUS_CLASS, SIZE_CLASS). Both button components now call buttonClass(className, radius, size) so future class tweaks live in one place.
