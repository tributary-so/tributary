---
# tributary-4sdl
title: 'Verify: lint + build + full eyeball'
status: todo
type: task
priority: high
created_at: 2026-06-26T09:30:49Z
updated_at: 2026-06-26T09:31:11Z
parent: tributary-m08g
blocked_by:
    - tributary-breu
    - tributary-cglo
    - tributary-i182
    - tributary-3pu3
    - tributary-nisk
    - tributary-h741
    - tributary-ymfy
---

Final verification gate before the epic closes. Run: pnpm lint (from repo root, fix anything this epic introduced), pnpm build (apps/landing must build clean), pnpm dev (full scroll-through of the home page). Check specifically: no dead imports from the /composable removal, no UpTo references anywhere in apps/landing/src, no vendor names (Meteora/Jupiter/Raydium/Kamino) in any ROUTE/composable copy, every nav anchor resolves to a real section id, every CTA link still points somewhere valid, dark + light themes both render the new sections legibly. File any defects found as follow-up beans. Verify: lint clean, build clean, eyeball passes both themes.
