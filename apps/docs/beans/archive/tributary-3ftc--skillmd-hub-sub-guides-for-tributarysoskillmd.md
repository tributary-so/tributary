---
# tributary-3ftc
title: SKILL.md hub + sub-guides for tributary.so/SKILL.md
status: completed
type: feature
priority: normal
created_at: 2026-07-06T13:39:27Z
updated_at: 2026-07-06T14:09:37Z
---

Produce a multi-file SKILL.md system served from the landing page:

- public/SKILL.md — compact entry point (what Tributary is, quickstart, links)
- public/SKILL-cli.md — CLI reference (expand existing)
- public/SKILL-sdk.md — SDK integration guide (sdk, sdk-react, sdk-x402, payments)
- public/SKILL-composables.md — composable policies deep-dive (from test patterns)
- Update ~/.config/opencode/skills/tributary/SKILL.md to reference these docs

Both AI agents and human developers are the audience. Hub model: SKILL.md links to sub-guides, agents follow links via webfetch.



## Design Decisions

- **Structure**: Flat files in public/ — SKILL.md (hub), SKILL-cli.md, SKILL-sdk.md, SKILL-composables.md
- **Agent skill**: Update ~/.config/opencode/skills/tributary/SKILL.md to reference landing page docs
- **SDK guide**: Architecture (package relationships, data flow) + recipes per use case
- **Composables guide**: Anatomy-of-a-composable (create → execute → settle), then variant configs
- **Code examples**: SDK-level (Tributary class, lighthouse facade), not raw Anchor program calls
- **Lighthouse**: Full facade reference (all assertion families, operators, multi-variants)
- **Tone**: AWS docs style — dry, precise, no personality
- **No Vite config needed**: public/ files served at root automatically

## TODO

- [ ] Write SKILL.md (hub entry point)
- [ ] Write SKILL-cli.md (expand existing CLI reference)
- [ ] Write SKILL-sdk.md (architecture + recipes)
- [ ] Write SKILL-composables.md (anatomy + Lighthouse full reference)
- [ ] Update ~/.config/opencode/skills/tributary/SKILL.md
- [ ] Verify all internal links resolve



## Summary of Changes

- **apps/landing/public/SKILL.md** — compact hub entry point (66 lines): overview, quickstart, sub-guide links, package index
- **apps/landing/public/SKILL-cli.md** — CLI reference (1008 lines): all 11 topics, 40+ subcommands with parameters and examples
- **apps/landing/public/SKILL-sdk.md** — SDK guide (1196 lines): architecture, package map, Tributary class API, React hooks, x402 middleware, payments client, recipes
- **apps/landing/public/SKILL-composables.md** — composable guide (973 lines): anatomy walkthrough, ForwardConfig, ValidationSpec, full Lighthouse facade reference, PolicyType variants, remaining accounts layout
- **~/.config/opencode/skills/tributary/SKILL.md** — added Hosted Documentation section with links to all 4 guides
