# `@tributary-so/ui` — single token source, layered subpath boundary

Seven frontend apps (`app`, `landing`, `checkout`, `lando`,
`showcase-payment-policies`, `showcase-payments`, `showcase-topup-sol`) had
drifted into 7 different headers, 7 different footers, 3 different `hero.ts`
HeroUI theme configs, byte-identical Solana provider stacks copied across 4
apps, and two brand palettes (product blue 221°, landing purple 271°). This
ADR locks in the extraction of `packages/ui` (`@tributary-so/ui`) as the
single UI authority. Full evidence and migration waves: `UI-KIT-PLAN.md`.

## Decision

### 1. Layered subpath boundary

One package, three consumption tiers, enforced by `exports`:

| Subpath | Contains | Coupling |
|---|---|---|
| `.` + `./styles` + `./styles/fonts` | tokens.css, cn(), ThemeToggle/Provider, TerminalCard, Navbar, Footer, Backdrop | react, lucide, next-themes, shiki only |
| `./solana` | SolanaProvider, WalletButton, cluster data-access/ui, ReactQueryProvider | + web3.js, wallet-adapter, heroui, jotai, react-query |
| `./tributary` | PublicKey, PaymentDetails, TokenAutocomplete + jotai token atoms, TokenMetadataProvider, GatewaySelect, QRCode, BorderedContainer | + sdk, payments, tokens-client |

Marketing apps (landing, lando) import root + styles only; HeroUI and
wallet-adapter never enter their module graph. All widget-library deps are
`peerDependencies` — the kit bundles nothing but `clsx`/`tailwind-merge`.

**Out of scope (deliberately):** unifying HeroUI vs shadcn vs Radix Themes.
The kit unifies *tokens and chrome*, not screen templates. Widget-library
consolidation remains a per-app decision.

### 2. Tokens: canonical palette, kit-owned

`src/styles/tokens.css` is the only place colors/fonts/radii/motion are
defined. Canonical values = the audited product set: primary blue
`221.2 83.2% 53.3%` (light) / `217.2 91.2% 59.8%` (dark); sharp corners
(`--radius: 0`); GT Cinetype primary / Denim secondary fonts. The Tributary
domain scales (policy/subscription/milestone/payasyougo/onetime/upto +
status.active/paused/cancelled/completed/overdue) moved from `apps/app`'s
`tailwind.config.js` into `@theme` — camelCase keys normalized
(`oneTime` → `--color-onetime-*`, `upTo` → `--color-upto-*`).

Landing's purple anchor converges to canonical blue during its migration;
its green gradient partner survives as the kit token `--marketing`
(`161.4 93.5% 30.4%`) used by `gradient-text` — a kit token, not an app
override. App stylesheets shrink to four canonical lines
(see `apps/showcase-payments/src/globals.css`).

### 3. Fonts: JS-side CSS import

Tailwind v4 does **not** rebase `url()` in CSS it inlines via `@import`, so
`@font-face` lives in a separate `./styles/fonts` entry that apps import
from `main.tsx` — Vite's CSS pipeline then resolves, hashes and emits the
`.ttf` assets. Importing `./styles` (tokens) via CSS `@import` after
`tailwindcss` is correct; importing fonts that way is not.

### 4. Storybook v10

`storybook@10` + `@storybook/react-vite`, addons: `addon-docs`,
`addon-a11y`, `addon-themes`. Note: `@storybook/addon-essentials` does not
exist at v10 (actions/controls/viewport are core; docs is separate) — do not
re-add it. Tailwind runs in Storybook via `@tailwindcss/vite` in `viteFinal`.

## Rejected alternatives

- **Per-app token overrides** (landing keeps purple): rejected — measured
  drift is the problem; overrides are how the 7-way header/footers happened.
- **Publishing to npm**: internal workspace package; semantic-release
  versioning like siblings, no public surface to stabilize.
- **Merging widget libraries now**: rewrite of every screen; not a
  refactor. Revisit after all apps consume the kit.

## Consequences

- Canonical version of every shared component lives in the kit; improvements
  flow kit-ward, never fork-ward.
- `components.json` (shadcn) aliases should point at `packages/ui/src` so
  generated components land in the kit.
- App PRs adding local `:root` token blocks or raw hex colors get pushed
  back — tokens are added in the kit.
