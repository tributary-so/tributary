# UI Kit Plan — `@tributary-so/ui`

**Status:** v2 ✅ **DONE** (2026-08-22) — all waves landed, milestone bean `tributary-wiv6` completed. ADR-0034 records the boundary.
**Date:** 2026-08-22
**Scope:** `apps/{app, landing, checkout, lando, showcase-payment-policies, showcase-payments, showcase-topup-sol}` → `packages/ui`

---

## 1. Current state (measured, not guessed)

7 frontend apps (incl. `apps/checkout` — Radix Themes + HeroUI + sonner mix).

**Byte-identical duplication** (md5-verified):

| File | Copies | Drift |
|---|---|---|
| `src/components/solana/solana-provider.tsx` | 4 | topup-sol: 46 diff lines |
| `src/components/cluster/cluster-data-access.tsx` | 4 | none |
| `src/components/cluster/cluster-ui.tsx` | 4 | none |
| `src/components/react-query-provider.tsx` | 3 | topup-sol differs |
| `src/components/ThemeToggle.tsx` | 3 + 1 inline copy in `app-header.tsx` | none |
| `public/denim.ttf` + `public/gt-cinetype.ttf` | 5 each | same md5 |
| `PaymentDetails` (showcase-payments ↔ showcase-payment-policies) | 2 | 19 diff lines / ~242 |

**Drifted chrome — the consistency killer:**

- **7 headers + 7 footers, every single one a different md5.** Each app hand-rolls its navbar.
- `src/hero.ts` (HeroUI Tailwind plugin): **3 different md5s** — HeroUI theme config silently diverging.
- `TerminalCard.tsx` app↔landing: 72 diff lines.
- Landing anchors hue purple 271°, app blue 221° — same brand, two palettes.

**Stack fragmentation:** HeroUI (5 apps), shadcn/radix+CVA (3), Radix Themes (checkout), plain Tailwind (landing, lando). All Tailwind **v4.2.2**, React 19, framer-motion 12. Existing `packages/*` build with tsup → `dist/`, released via semantic-release-monorepo. Landing has **no dedicated backdrop** — just a one-line gradient utility (`globals.css:173`).

---

## 2. Scope

The kit is three layers under one package, `@tributary-so/ui` at `packages/ui`:

1. **Tokens (single source of truth).** ALL colors, fonts, radii, spacing semantics live in the kit. Apps import `@tributary-so/ui/styles` and define **zero** local tokens. One canonical palette — landing's purple anchor converges to it (visual review during landing migration). Token names keep the existing shadcn HSL contract (`--background`, `--primary`, …) mapped to Tailwind v4 utilities via `@theme`.
2. **Layout + primitives (stack-neutral).** `Navbar`, `Footer`, `Backdrop`, `ThemeToggle`, `ThemeProvider`, `TerminalCard`, `cn()`. No HeroUI, no Solana — usable by every app incl. landing/lando.
3. **Domain components (Tributary-specific).** `PublicKey`, `PaymentDetails`, `TokenAutocomplete`, `TokenMetadataProvider`, `GatewaySelect`, `QRCode`, plus the Solana/wallet infra (`solana-provider`, `cluster-*`, `react-query-provider`). HeroUI/jotai/web3 coupled → isolated behind subpath exports.

**Still out of scope:** re-templating apps onto one widget library (HeroUI vs shadcn vs Radix Themes stays per-app in v1; §9 Q2 covers the endgame). Navbar/Footer unify *chrome*, not screen content — feature components (`gateway/`, `dashboard/`, showcase step flows) stay app-local.

## 3. Cut from the generic proposal (and why)

| Proposal | Verdict | Reason |
|---|---|---|
| Turborepo/Nx | **cut** | pnpm workspace + Makefile already work |
| Changesets | **cut** | semantic-release-monorepo already in every app |
| Tokens Studio / Figma sync | **cut** | no Figma workflow in evidence; CSS vars in the kit are the source |
| Chromatic | **defer** | paid SaaS; revisit when kit exceeds ~20 components |
| Prefixed internal breakpoints | **cut** | internal kit, Tailwind v4 `@source` handles discovery |
| tsup build | **keep** | matches `packages/sdk-react` |

## 4. Package design

```
packages/ui                              @tributary-so/ui
├── src/
│   ├── styles/tokens.css                @font-face (GT Cinetype, Denim via relative url()),
│   │                                    :root + .dark token blocks (shadcn HSL names),
│   │                                    @theme mapping → bg-primary/text-primary/…
│   ├── styles/theme-heroui.ts           the ONE hero.ts (kills 3-way drift)
│   ├── fonts/                           gt-cinetype.ttf, denim.ttf (single copy, Vite-bundled)
│   ├── lib/utils.ts                     cn() (clsx + tailwind-merge)
│   ├── layout/navbar.tsx                slot-based: brand / items / actions; sticky+blur variant
│   ├── layout/footer.tsx                links + tagline + version slot
│   ├── backdrop/backdrop.tsx            see §4.1
│   ├── theme/theme-toggle.tsx           lucide-only (replaces 4 copies)
│   ├── theme/theme-provider.tsx         class-on-<html>, localStorage, prefers-color-scheme
│   ├── terminal-card.tsx                merged app/landing versions
│   ├── solana/solana-provider.tsx       + cluster-data-access, cluster-ui, WalletButton
│   ├── solana/react-query-provider.tsx
│   ├── tributary/public-key.tsx         HeroUI Button/addToast, web3 PublicKey
│   ├── tributary/payment-details.tsx    canonical merge of the 2 showcase versions
│   ├── tributary/token-autocomplete.tsx ADR-0028 assets proxy + jotai atoms (atoms move too)
│   ├── tributary/token-metadata-provider.tsx
│   ├── tributary/gateway-select.tsx
│   ├── tributary/qrcode.tsx             dfts-qrcode wrapper
│   └── index.ts
├── .storybook/                          v10, from day one (§6)
├── tsup.config.ts                       cjs+esm+dts, matches sdk-react
└── package.json                         peerDeps: react, framer-motion; peerDepsOptional-by-subpath:
                                         @heroui/react, jotai, @solana/*, @tributary-so/tokens-client
```

**Subpath exports** — landing/lando import root + styles only; HeroUI/wallet/jotai never enter their graph:

```jsonc
"exports": {
  ".":              { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./styles":       "./dist/styles/tokens.css",
  "./styles/heroui": "./dist/styles/theme-heroui.js",
  "./solana":       { "types": "./dist/solana/index.d.ts", "import": "./dist/solana/index.js" },
  "./tributary":    { "types": "./dist/tributary/index.d.ts", "import": "./dist/tributary/index.js" }
}
```

**App consumption (identical `index.css` shape in every app — this IS the consistency guarantee):**

```css
@import "tailwindcss";
@import "@tributary-so/ui/styles";
@source "../node_modules/@tributary-so/ui/dist";
/* HeroUI apps additionally: */
@plugin "…@tributary-so/ui/styles/heroui/theme-heroui.js";
```

Nothing else. No `:root` blocks, no `@font-face`, no config drift. Fonts resolve via relative `url()` inside the imported CSS → Vite hashes + bundles them (kills the 5× public/ copies; fallback if Tailwind's CSS pipeline fights it: kit exports `./fonts` subpath, apps symlink/copy — decided in scaffold PR).

### 4.1 `Backdrop` (new component, used on landing first)

Fixed, token-driven decorative background layer — the missing "stage" behind heroes:

```tsx
<Backdrop variant="grid" | "mesh" | "scanlines" intensity="subtle" | "normal" | "bold" />
```

- `grid` — blueprint grid lines fading via radial mask from `--primary`/`--accent`; the technical-terminal look matching GT Cinetype + TerminalCard.
- `mesh` — layered radial gradients (primary/accent/muted), dark-mode aware.
- `scanlines` — CRT texture for TerminalCard-heavy sections.
- CSS-only rendering, `pointer-events-none`, `aria-hidden`, sits behind content (`-z-10`), all colors from tokens — zero hardcoded hex.
- Ship in scaffold phase; **wired into the landing hero immediately** (replaces the bare `linear-gradient` at `globals.css:173`); roll to showcase heroes after.

## 5. Migration order (one app per PR, verify each)

1. **Scaffold `packages/ui`** — tokens, fonts, primitives, Backdrop, Navbar/Footer, Storybook v10, tsup. No app touched yet.
2. **showcase-payments** — smallest surface; proves package + Navbar swap.
3. **showcase-topup-sol** — re-syncs its drifted `solana-provider`/`react-query-provider` onto canonical (diff first, port real improvements kit-ward).
4. **showcase-payment-policies** — brings `TokenAutocomplete` + `PaymentDetails` home; dedupes `hero.ts`.
5. **app** — biggest; `PublicKey`, `BorderedContainer`, `QRCode`, `hero.ts` → kit.
6. **checkout** — tokens + chrome; Radix Themes widgets stay (v1).
7. **landing + lando** — tokens/chrome/Backdrop only. **Landing palette converges purple→canonical** — screenshot before/after, review in PR. Backdrop lands on the hero here.

**Definition of done per app:** `tsc -b && vite build` + lint clean; no local token definitions remain in app CSS; wallet connect + cluster switch + theme toggle + navbar verified in dev server; landing/lando bundle graphs contain no HeroUI/wallet-adapter modules.

## 6. Storybook v10 (from day one)

- `storybook@^10` + `@storybook/react-vite`. SB10 is **ESSM-only** — repo is `"type": "module"` throughout, no conflict. Config in `main.ts` ESM.
- Addons: `addon-essentials`, `addon-a11y`, `addon-themes` (light/dark via `.dark` class — same mechanism as production `ThemeProvider`).
- The kit's whole surface gets stories as components land (not after migration): every primitive, Backdrop variants × intensity × dark mode, Navbar slot permutations, PublicKey copy states, PaymentDetails with mock policy data, TokenAutocomplete against a stubbed assets proxy.
- Solana-provider stories use a mock wallet (no validator dependency).
- Static build (`storybook build`) published as CI artifact / docs-adjacent. Chromatic deferred (§3).

## 7. Governance — "maximize consistency" made enforceable

- **One `index.css` shape** (§4) — any app CSS beyond the 4 canonical lines needs a reason in review.
- **Token additions happen in the kit only.** App PRs adding raw hex/HSL in JSX or CSS get pushed back.
- **shadcn:** point `components.json` aliases at the kit so `shadcn add` output lands in `packages/ui/src` — per-app `ui/` folders stop growing.
- **Drift rule:** canonical version lives in the kit; improvements flow kit-ward, never fork-ward.
- **Versioning:** private workspace package + semantic-release like siblings.
- **ADR-0034** `@tributary-so/ui — single token source + layered subpath boundary`: records §2, the subpath/peer contract, and the landing palette convergence.
- **Beans on sign-off:** milestone `@tributary-so/ui extraction` → epics: Scaffold / Migrate (waves per §5) / Storybook / Governance → tasks per app with §5 DoD as acceptance criteria.

## 8. Risks

- **Landing palette convergence** is a visible brand change (purple → canonical blue). Screenshot diff in the PR; if the purple tone is a keeper, it becomes a kit token (e.g. `--accent-landing` semantics decided in review) — not an app-local override.
- **Font bundling via imported-CSS `url()`** through Tailwind v4's pipeline — verified in scaffold PR; fallback documented (§4).
- **HeroUI `@plugin` resolution from `node_modules`** — verified in scaffold; fallback is a 2-line re-export per app.
- **Wallet-adapter peer range** pinned differently across apps (0.15.35–0.15.39) — kit pins one range, apps align in their migration PR.
- **jotai atoms for TokenAutocomplete** move into the kit — app code importing those atoms updates to `@tributary-so/ui/tributary`.

## 9. Open questions

1. Widget-library endgame: keep HeroUI + Radix Themes + plain-Tailwind mix (v1 assumption), or schedule convergence on HeroUI for product apps after the kit lands?
2. Canonical palette: product blue 221° wins and landing converges — confirmed? (§8 risk 1 offers the escape hatch)
3. Navbar scope: single `Navbar` + `Footer` for ALL seven apps incl. marketing landing (slot-driven), or product apps only with landing keeping bespoke hero chrome?
