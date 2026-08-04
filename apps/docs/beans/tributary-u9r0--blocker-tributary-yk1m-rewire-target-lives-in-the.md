---
# tributary-u9r0
title: 'BLOCKER: tributary-yk1m rewire target lives in the Mill repo (separate git/herdr lane) + @tributary-so/pools-client is unpublished'
status: scrapped
type: task
priority: high
created_at: 2026-07-30T11:05:13Z
updated_at: 2026-08-04T19:43:48Z
---

Cross-repo mis-dispatch. yk1m ('Rewire param-field.tsx PoolControl') cannot be implemented from the tributary worktree.

TWO HARD BLOCKERS (both need a human):

1. TARGET CODE IS IN THE MILL REPO, NOT TRIBUTARY.
   - param-field.tsx (apps/app/src/components/setup/param-field.tsx), the two cloned pickers (pool-autocomplete.tsx, raydium-pool-autocomplete.tsx), pool-direction.ts, use-{,raydium-}pool-search.ts, and the if(lane==='raydium') branch all live ONLY in /home/xeroc/projects/Tributary/mill.
   - Mill is a SEPARATE git repo (branch develop, unrelated WIP), its own herdr lane (/home/xeroc/.herdr/worktrees/mill), its own bean store (mill-* e.g. mill-52g2, mill-obl5).
   - The yk1m bean file lives in THIS tributary worktree. Completion contract = ONE commit carrying BOTH code + bean status flip — impossible across two repos.

2. @tributary-so/pools-client IS UNPUBLISHED (npm 404). The Mill app has NO dep on it (only published @tributary-so/sdk + @tributary-so/tokens-client). i2nd built the unified picker in packages/pools-client so Mill could replace its two clones with ONE component — but Mill can't resolve that local workspace package, so the rewire breaks the Mill build. Needs a publish (release decision) or a cross-workspace link that does not exist.

RESOLUTION PATHS (pick one):
  (a) Publish @tributary-so/pools-client, then re-file this as a mill-* bean in the Mill repo (its natural home) and scrap/close the tributary yk1m duplicate.
  (b) If the intent really is one combined repo, merge Mill's picker code into the tributary worktree first (separate decision), then yk1m becomes implementable here.
  (c) Defer yk1m until pools-client is published AND a mill-* bean owns the Mill-side edit.

EVIDENCE: param-field.tsx:354 `if (lane === "raydium")`; :363 6-arg onSelect vs :393 5-arg onSelect; config.ts has venue URLs but no POOL_SOURCES map.

ACTION TAKEN: left tributary-yk1m as todo (no fake completion, no Mill-repo edit). Did NOT run hordr done.
