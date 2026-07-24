# Validation recipe layer — three-tier framework for standardized composable policies

Creating a `ComposablePolicy` with validation hooks requires assembling a
`{ spec: ValidationSpec, init: ValidationInit }` pair per phase (pre/post),
deriving the right target accounts, and applying the settlement-shape safety
posture from ADR-0026 / ADR-0031. That assembly was open-coded per integrator
(the scheduler, the CLI, tests, the showcase apps) — repeated, drift-prone,
and silently unsafe in the act-mode case (ADR-0031: no on-chain backstop).
This ADR locks in a **three-tier recipe layer** that standardizes it.

## Decision — three tiers

### Tier 1 — Forward builders (unchanged, ADR-0030)

The `ForwardBuilder` interface and concrete implementations
(`@tributary-so/forward-builders`: Meteora DLMM, Raydium CPMM, Raydium CLMM)
are unchanged. Tier 1 is the fire-time swap instruction producer.

### Tier 2 — Validation recipes (`packages/sdk/src/validation-recipes.ts`)

Pure functions returning `{ spec: ValidationSpec, init: ValidationInit }`.
No I/O, no side-effects. Each produces exactly what
`createComposablePolicy`'s `preValidation` / `postValidation` slots consume.

- **`balanceCheck({ target, threshold, op })`** — the generic: wraps
  `lighthouse.tokenAccount(target).amount(threshold, op).build()` and bridges
  via `lighthouseValidation`.
- **Site variants** derive the target ATA internally via
  `getAssociatedTokenAddressSync` (pure sync math), then delegate to
  `balanceCheck`:
  - `intermediateOutputBalanceCheck` → ATA(outputMint, composablePolicyPda, allowOwnerOffCurve=true)
  - `intermediateInputBalanceCheck` → ATA(inputMint, composablePolicyPda, allowOwnerOffCurve=true)
  - `recipientOutputBalanceCheck` → ATA(outputMint, recipient)
- **`lighthouseValidation(guard)`** — bridges any built `LighthouseAssertion`
  into `{ spec, init }`. **Also the escape hatch**: custom assertions not yet
  recipe'd (pool price, Pyth oracle, account delta) are built via the
  `lighthouse` facade and passed here.

### Tier 3 — Policy recipe + fire helper

- **`composablePolicyRecipe({ forwardConfig, pre?, post?, allowUnsafeActMode? })`**
  (`packages/sdk/src/composable-recipes.ts`) — takes a forward config + optional
  tier-2 recipe outputs and produces the complete `createComposablePolicy`
  argument bundle, applying the **enforcement posture** below. Missing pre/post
  slots are filled with a disabled spec + empty init.
- **`buildComposableExecutionPayload(...)`** (`packages/sdk/src/composable.ts`)
  — the fire-time orchestrator: composes the ADR-0030 primitives
  (`ForwardBuilder.build` → `resolveValidationTargets` pre/post →
  `assembleComposableRemainingAccounts`) into `{ instructionData, remainingAccounts }`.
  Caller resolves `face` explicitly; optional `forwardBuilder`. This is the
  orchestrator ADR-0030 §1 deferred — see that amendment.

### Named recipes per forward builder (`packages/forward-builders/src/`)

Each forward program ships a `createSwapWhenBalanceLow` that composes all three
tiers into one create bundle `{ create, forwardBuilder }`, so an integrator
provides only accounts + programId:

- `createSwapWhenBalanceLow` (Meteora DLMM)
- `createRaydiumCpmmSwapWhenBalanceLow` (Raydium CPMM)
- `createRaydiumClmmSwapWhenBalanceLow` (Raydium CLMM)

## Enforcement posture (throw security-critical, warn economic gaps)

`composablePolicyRecipe` derives the settlement shape from the forward config
and applies:

| Combo                                     | Behavior                                           |
| ----------------------------------------- | -------------------------------------------------- |
| act mode + no post-validation             | **THROW** (`allowUnsafeActMode: true` to override) |
| deliver-transform + no post-validation    | warn (redundant — program guards `>0`, ADR-0031)   |
| deliver-no-transform + no post-validation | silent (program sweeps `face`)                     |
| any forward + no pre-validation           | warn (economic, not security)                      |

**Why throw on act-mode-no-post:** ADR-0031 established that act mode has **no
on-chain backstop** (the forward delivers to an external account Tributary
cannot observe, and the program cannot enforce a target it doesn't know). The
recipe layer is the SDK setup boundary — the one place a footgun with zero
on-chain protection can be caught. The `allowUnsafeActMode` escape hatch
preserves the legitimate-use-case flexibility ADR-0031 required (owners who
knowingly accept unobservable delivery opt in explicitly). This does not
supersede ADR-0031 — that ADR governs **on-chain** posture (still: no
enforcement). Integrators bypassing the recipe and calling `createComposablePolicy`
primitives directly fall under ADR-0031's own-your-own-safety guidance; the
recipe is the recommended safe path.

## Day-one scope (7 SDK functions)

1. `lighthouseValidation(guard)` — bridge + escape hatch
2. `balanceCheck({ target, threshold, op })` — generic balance assertion
3. `intermediateOutputBalanceCheck(...)` — site: derives intermediate-output ATA
4. `intermediateInputBalanceCheck(...)` — site: derives intermediate-input ATA
5. `recipientOutputBalanceCheck(...)` — site: derives recipient output ATA
6. `composablePolicyRecipe(...)` — setup bundle + enforcement
7. `buildComposableExecutionPayload(...)` — fire helper (ADR-0030 orchestrator)

(plus the internal `programCallSpec(programId)` generic spec builder.)

## Site-recipe derivation pattern

Site recipes are thin: they exist only to fold a known ATA-derivation
(`getAssociatedTokenAddressSync`, deterministic owner+mint math) into the call
so the integrator never hand-derives a PDA-owned ATA with the wrong
`allowOwnerOffCurve` flag. The intermediate-output/input ATAs are owned by the
ComposablePolicy PDA (ADR-0008), so they require `allowOwnerOffCurve: true`;
the recipe bakes that in. Every site variant delegates to the generic
`balanceCheck`, so assertion semantics live in exactly one place.

## Rejected alternatives

1. **Inline assertion data in the policy recipe.** Rejected: assertion data is
   up to 512 bytes and belongs in the `ValidationPda`
   (`["composable_validation_{pre,post}", composablePolicy]`), not in the
   `ComposablePolicy` account (ADR-0022 fixed-size). Recipes produce the
   `{ spec, init }` pair; the SDK's existing `createComposablePolicy` writes
   `init` into the ValidationPda. Folding it into the recipe would duplicate
   that write site.

2. **A single `createTopupRecipe` god-function.** Rejected: couples validation
   choice to forward-program choice and forces every variant (balance vs price
   vs oracle) into one signature. The three-tier split lets a new validation
   recipe (tier 2) compose with any forward builder (tier 1) and any named
   recipe (tier 3) without touching the others. The named recipes
   (`createSwapWhenBalanceLow`) are the pre-baked compositions for the common
   case; tiers 2+3 are the escape hatch for the long tail.

3. **Enforce post-validation on-chain (program-level).** Rejected in ADR-0031:
   unenforceable for act mode (target is external/use-case-specific) and removes
   legitimate flexibility for deliver-transform. The recipe layer enforces at
   SDK setup time — the right layer, with an escape hatch the program cannot
   offer.

4. **Warn (not throw) on act-mode-no-post.** Rejected as the default: a warning
   is ignorable and act-mode-no-post has zero on-chain backstop. The throw +
   `allowUnsafeActMode` escape hatch is strictly safer as a default while
   preserving every legitimate use case. (ADR-0031's "warn" guidance applies to
   integrators on the raw primitive path; the recipe raises the bar.)

5. **Pool-price / oracle / delta recipes in day-one scope.** Deferred: pool
   layouts differ across forward programs (DLMM/CLMM/CPMM), Pyth oracle and
   account-delta assertions need their own derivation, and none blocks the
   canonical topup flow. Tracked as separate beans. Until they land, the
   `lighthouseValidation(guard)` escape hatch covers all three — build the
   assertion via the facade, pass it in.

## Rationale

The recipe layer collapses the most common composable-policy creation flow
("pull input, swap via a pinned pool, deliver output, but only when a balance
is low") into a single named function per forward program, while keeping every
compositional seam open for the long tail. The enforcement posture makes the
one genuinely dangerous shape (act mode with no observable delivery) fail
closed at setup time without removing the shape. The site-recipe pattern
removes the most common bug class (wrong ATA owner / `allowOwnerOffCurve` flag)
by centralizing the derivation.

Tier 2 and tier 3 live in the SDK (`packages/sdk/src/`) where every consumer
depends on them at zero added dependency cost; named recipes live alongside
their forward builder in `packages/forward-builders/src/` because they pin a
specific program's config and are opt-in with that program's peerDependency.

(bean tributary-ivi0; design decisions from milestone tributary-69jm grilling
2026-07-24)

## References

- ADR-0008 — Composable CPI privilege boundary (intermediate ATA PDA ownership;
  why site recipes set `allowOwnerOffCurve: true`).
- ADR-0022 — Fixed-size PDAs (assertion data lives in the ValidationPda, not
  the policy account — why recipes return `{ spec, init }`, not inline data).
- ADR-0026 — act/deliver settlement shapes (the shapes the enforcement posture
  keys off).
- ADR-0030 — Composable execution primitives (tier 1; §1 amended — the tier-3
  fire helper is the deferred orchestrator, now justified).
- ADR-0031 — Settlement output post_validation posture (on-chain `>0` guard
  stays; no program enforcement; the recipe layer is the SDK-side enforcement
  surface).
- `packages/sdk/src/validation-recipes.ts` — tier 2 (code is authority).
- `packages/sdk/src/composable-recipes.ts` — tier 3 setup recipe + enforcement.
- `packages/sdk/src/composable.ts` — tier 3 fire helper.
- `packages/forward-builders/src/{meteora-dlmm,raydium-cpmm,raydium-clmm}.ts` —
  named recipes.
