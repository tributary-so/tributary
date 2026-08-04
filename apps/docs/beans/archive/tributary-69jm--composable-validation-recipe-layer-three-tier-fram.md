---
# tributary-69jm
title: Composable validation recipe layer — three-tier framework for standardized policy creation
status: completed
type: milestone
priority: high
created_at: 2026-07-24T10:33:15Z
updated_at: 2026-08-04T19:31:20Z
---

Three-tier framework: (1) validation recipes (tier 2) — named site recipes that derive+delegate, pure functions returning {spec, init}; (2) policy recipe + fire helper (tier 3) — composablePolicyRecipe with enforcement (throw act-mode-no-post, warn economic gaps) + buildComposableExecutionPayload (ADR-0030 deferred orchestrator, now justified by 3rd+ caller); (3) named recipes per forward builder (createSwapWhenBalanceLow). All in packages/sdk/src/ except named recipes which live in packages/forward-builders/src/. Enforcement posture (s): throw for security-critical (act mode + no post-validation), warn for economic gaps. allowUnsafeActMode escape hatch. Day-one scope: 7 SDK functions + named recipes per forward program.


## Design decisions (grilling session 2026-07-24)

### Architecture: (β) three tiers
- **Tier 1** (unchanged): forward builders in \`packages/forward-builders/\`
- **Tier 2** (NEW): validation recipes in \`packages/sdk/src/\` — named site recipes, pure functions
- **Tier 3** (NEW): policy recipe + fire helper in \`packages/sdk/src/\` — enforcement + orchestrator

### Tier-2 shape: (q) named site recipes
- Generic \`balanceCheck({ target, threshold, op })\` → \`{ spec, init }\`
- Site variants derive ATA internally (pure sync math), delegate to generic:
  - \`intermediateOutputBalanceCheck({ composablePolicyPda, outputMint, threshold, op })\`
  - \`intermediateInputBalanceCheck({ composablePolicyPda, inputMint, threshold, op })\`
  - \`recipientOutputBalanceCheck({ recipient, outputMint, threshold, op })\`
- \`lighthouseValidation(guard)\` bridge: \`LighthouseAssertion → { spec, init }\`. Also escape hatch.
- All phase-agnostic. All return \`{ spec: ValidationSpec, init: ValidationInit }\`.

### Enforcement: (s) throw security-critical, warn economic gaps
| Combo | Recipe behavior |
|---|---|
| act mode + no post-validation | THROW (allowUnsafeActMode: true to override) |
| deliver-transform + no post-validation | warn (redundant — program guards >0) |
| deliver-no-transform + no post-validation | silent (program sweeps) |
| any forward + no pre-validation | warn (economic, not security) |

### Tier-3 scope: (v) setup recipe + fire companion, two functions
- \`composablePolicyRecipe({ forwardConfig, pre?, post?, allowUnsafeActMode? })\` → setup bundle
- \`buildComposableExecutionPayload({ connection, policy, composablePolicyPda, programId, forwardBuilder?, face })\` → \`{ instructionData, remainingAccounts }\`
- Fire helper takes face explicitly (caller-resolved). Optional forwardBuilder. Primitives stay alongside for CLI override path.

### Packaging: all in SDK except named recipes
- Validation recipes + policy recipe + fire helper → \`packages/sdk/src/\`
- Named recipes (\`createSwapWhenBalanceLow\`) → \`packages/forward-builders/src/<program>.ts\` alongside existing forward config + builder

### Named recipe produces complete create bundle
- Takes: policyType, memo, recipient, forward params, validation params, composablePolicyPda
- Returns: \`{ create: { policyType, memo, recipient, forwardConfig, pre/post spec+init }, forwardBuilder }\`
- Integrator provides only accounts + programId

## Day-one scope (7 SDK functions)

1. \`lighthouseValidation(guard)\` — bridge + escape hatch
2. \`balanceCheck({ target, threshold, op })\` — generic balance assertion
3. \`intermediateOutputBalanceCheck(...)\` — site: derives ATA(outputMint, composablePolicyPda)
4. \`intermediateInputBalanceCheck(...)\` — site: derives ATA(inputMint, composablePolicyPda)
5. \`recipientOutputBalanceCheck(...)\` — site: derives ATA(outputMint, recipient)
6. \`composablePolicyRecipe({ forwardConfig, pre?, post?, allowUnsafeActMode? })\` — setup bundle + enforcement
7. \`buildComposableExecutionPayload(...)\` — fire helper (ADR-0030 orchestrator)

## Deferred (tracked as separate beans — NOT forgotten)

- Pool price check (DLMM/CLMM/CPMM layouts differ)
- Pyth oracle price check
- Account delta check
- Interim: \`lighthouseValidation(guard)\` escape hatch covers all three

## ADR impact

- Amend ADR-0030 §1: third caller materialized (tests + external integrators); orchestrator justified
- New ADR-0033: validation recipe layer — three-tier model, enforcement posture, site-recipe pattern, deferral rationale

## Summary of Changes (2026-08-04)

Milestone day-one scope shipped. All 5 active children completed; code verified present.

**Tier 2 — validation recipes** (packages/sdk/src/validation-recipes.ts):
`lighthouseValidation`, `balanceCheck`, `intermediateOutputBalanceCheck`, `intermediateInputBalanceCheck`, `recipientOutputBalanceCheck` (+ bonus `programCallSpec`, `makeValidationInit`, `actModePostValidationWarning`).

**Tier 3 — policy recipe + fire helper** (`composable-recipes.ts` + `composable.ts`):
`composablePolicyRecipe` (enforcement: throw on act-mode-no-post, warn on economic gaps) + `buildComposableExecutionPayload` (ADR-0030 orchestrator).

**Named recipes** (`packages/forward-builders/src/`):
`createSwapWhenBalanceLow` in meteora-dlmm, raydium-cpmm, raydium-clmm (+ unit tests).

**Adoption**: scheduler `fire()` and both swap integration test suites migrated onto the recipe layer.

**Docs**: ADR-0030 amended (orchestrator justified), ADR-0033 written, AGENTS.md ADR map updated.

**Deferred (remain as separate draft beans, low priority)**: pool-price (`tributary-cuxz`), Pyth oracle (`tributary-xqzo`), account-delta (`tributary-5r2d`). Interim `lighthouseValidation` escape hatch covers all three.

**Gap noted outside milestone scope**: Whirlpool forward builder has no `createSwapWhenBalanceLow` named recipe despite being in `ALLOWED_FORWARD_PROGRAMS`. Day-one bean body scoped this out (DLMM/CPMM/CLMM only). Candidate for a follow-up bean if a Whirlpool integrator appears.
