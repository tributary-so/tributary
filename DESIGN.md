---
version: alpha
name: Tributary-landing-design-analysis
description: A developer-first protocol landing page that treats code as the hero. Monospace body type (Roboto Mono as the default sans), a dual-accent system of vivid purple (#9333ea) for brand action and emerald green (#059669) for live-status/success, and a deliberately sharp (0px radius) surface aesthetic punctuated by code-terminal cards that are always dark regardless of theme. Section dividers are literal code-comment tokens (`//`), every section opens with a purple uppercase eyebrow label, and every headline splits into two tones — foreground for the setup, purple→green gradient text for the punchline.

colors:
  primary: "#9333ea"
  primary-dark: "#6d28d9"
  primary-foreground: "#ffffff"
  accent: "#059669"
  accent-foreground: "#ffffff"
  ink: "#0f172a"
  ink-dark: "#f8fafc"
  body: "#0f172a"
  body-dark: "#f8fafc"
  body-muted: "#64748b"
  body-muted-dark: "#94a3b8"
  divider-soft: "#e2e8f0"
  divider-dark: "#1e293b"
  canvas: "#ffffff"
  canvas-dark: "#020817"
  surface-muted: "#f1f5f9"
  surface-muted-dark: "#1e293b"
  destructive: "#ef4444"
  destructive-dark: "#7f1d1d"
  terminal-bg: "#171717"
  terminal-bar: "#262626"
  terminal-border: "#404040"
  terminal-text: "#e5e5e5"
  terminal-text-muted: "#737373"
  traffic-red: "#ef444466"
  traffic-yellow: "#eab30866"
  traffic-green: "#22c55e66"

typography:
  hero-display:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: tight (tracking-tighter)
  section-head:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: tight (leading-tight)
  section-head-mobile:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.25
  card-title:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.4
  step-title:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.4
  body-lead:
    fontFamily: "Roboto Mono, Inter, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.6
  body:
    fontFamily: "Roboto Mono, Inter, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.7
  body-small:
    fontFamily: "Roboto Mono, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  eyebrow:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: 0.15em
    textTransform: uppercase
  nav-link:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.12em
    textTransform: uppercase
  brand-label:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 0.3em
    textTransform: uppercase
  button:
    fontFamily: "Roboto Mono, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
  tag:
    fontFamily: "Roboto Mono, Inter, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  status-badge:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 9px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: wider
  fine-print:
    fontFamily: "Roboto Mono, Inter, sans-serif"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.3
  terminal-caption:
    fontFamily: "Roboto Mono, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    fontStyle: italic

rounded:
  none: 0px
  md: 6px
  lg: 8px
  xl: 16px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  section: 64px
  hero: 80px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 11px 24px
    height: 44px
    shadow: 2xs
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    opacity: 90
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    border: 1px solid {colors.divider-soft}50
    height: 44px
    padding: 11px 24px
  button-accent:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    height: 44px
    padding: 11px 24px
  button-header:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    border: 1px solid {colors.primary}
    padding: 6px 12px
  theme-toggle:
    backgroundColor: transparent
    textColor: inherit
    rounded: "{rounded.md}"
    padding: 8px
  eyebrow-label:
    textColor: "{colors.primary}"
    typography: "{typography.eyebrow}"
  section-heading:
    textColor: "{colors.body}"
    typography: "{typography.section-head}"
  gradient-text:
    background: linear-gradient(135deg, {colors.primary}, {colors.accent})
    textFill: transparent
  card-info:
    backgroundColor: "{colors.surface-muted}10"
    textColor: "{colors.body}"
    rounded: "{rounded.none}"
    border: 1px solid {colors.divider-soft}50
    padding: 24px
  card-info-hover:
    border: 1px solid {colors.primary}30
  card-payment:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    rounded: "{rounded.none}"
    border: 1px solid {colors.divider-soft}50
    padding: 20px
  card-payment-hover:
    border: 1px solid {colors.primary}30
  card-marquee:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    rounded: "{rounded.xl}"
    border: 1px solid {colors.divider-soft}
    padding: 20px
  card-marquee-hover:
    border: 1px solid {colors.primary}25
    backgroundColor: "{colors.surface-muted}30
  status-badge-live:
    textColor: "{colors.accent}"
    border: 1px solid {colors.accent}30
    typography: "{typography.status-badge}"
  status-badge-next:
    textColor: "{colors.body-muted}60"
    border: 1px solid {colors.divider-soft}
    typography: "{typography.status-badge}"
  terminal-card:
    backgroundColor: "{colors.terminal-bg}"
    textColor: "{colors.terminal-text}"
    rounded: "{rounded.none}"
    border: 1px solid {colors.divider-soft}50
  terminal-bar:
    backgroundColor: "{colors.terminal-bar}"
    textColor: "{colors.terminal-text-muted}"
    borderBottom: 1px solid {colors.terminal-border}
    padding: 16px 20px
  traffic-light:
    backgroundColor: see traffic-* colors
    rounded: "{rounded.full}"
    size: 10px
  process-node:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    border: 1px solid {colors.primary}25
    size: 64px
  process-node-hover:
    border: 1px solid {colors.primary}60
  process-connector:
    background: linear-gradient(to right, {colors.primary}10, {colors.primary}40, {colors.accent}40)
    height: 1px
  knob-column:
    textColor: see per-knob color
    rounded: "{rounded.none}"
    border: 1px solid {colors.divider-soft}50
    padding: 24px
  comment-divider:
    textColor: "{colors.body-muted}30"
    typography: "{typography.body-small}"
    content: //
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-muted}"
    typography: "{typography.body-small}"
    borderTop: 1px solid {colors.divider-soft}50
    padding: 48px 24px
---

## Overview

Tributary's landing page is a **developer-first protocol pitch dressed as a
terminal session**. The entire visual identity leans into code: monospace
type as the _default body font_ (not just for code blocks), literal code-comment
tokens (`//`) as section dividers, terminal-window cards with traffic-light dots,
and Shiki-highlighted code snippets as first-class content — not decoration.

The color system runs on **two accents at equal weight** rather than one.
Vivid purple (`{colors.primary}` — #9333ea) is the brand action color — nav
links, CTAs, eyebrow labels, the logo. Emerald green (`{colors.accent}` —
#059669) is the status/confirmation color — "● LIVE" badges, checkmarks in
feature lists, pulse-dot indicators. The signature `.gradient-text` class
blends them (`135deg, primary → accent`) and is applied to the **punchline
half** of nearly every headline, creating a consistent two-tone split: setup in
foreground ink, payoff in purple→green gradient.

The surface aesthetic is **deliberately sharp** — `--radius: 0` in `:root`
means the base design language is square corners. Cards, buttons, inputs, and
containers default to 0px radius. Selective exceptions exist (marquee cards at
`{rounded.xl}`, the header CTA at `{rounded.lg}`, status dots at
`{rounded.full}`) but the dominant grammar is rectangular. Borders are
hairlines at 50% opacity (`border-border/50`), never full-strength lines.
Elevation is minimal — `{component.button-primary}` carries a `shadow-2xs`
and nothing else does. The page breathes through whitespace and surface-color
shifts, not through drop-shadows or gradients on chrome.

**Key Characteristics:**

- Monospace-first typography: Roboto Mono is the `--font-sans` default, used for
  body copy, headings, nav, and labels. Inter is the fallback, not the primary.
- Dual-accent system: purple (brand/action) + emerald (status/live/success).
  Both are full-saturation; hierarchy comes from opacity, not hue shifts.
- Sharp-cornered surface language (`--radius: 0`) with selective soft exceptions
  on marquee/social cards and the header CTA.
- Code-comment dividers (`//`) between every section — the page reads like a
  source file with section comments.
- Two-tone headline pattern: foreground text for the clause, `.gradient-text`
  for the resolution. Repeated on every section heading as a structural motif.
- Terminal cards are **always dark** (bg-neutral-900) regardless of theme —
  they are the visual anchor of the "developer" identity.
- Eyebrow labels (`{component.eyebrow-label}`) open every section: 12px,
  uppercase, 0.15em tracking, primary purple, font-weight 700.
- Process diagrams use numbered icon nodes connected by a 1px purple→green
  gradient line — the same gradient as `.gradient-text`, unifying the motif.
- Marquee walls (Tweets, integrations) use seamless infinite scroll with
  drag-to-scroll, pause-on-hover, and edge-fade gradients masking the loop.

## Colors

> **Source:** `apps/landing/src/globals.css` — all colors are HSL CSS variables
> in `:root` (light) and `.dark`, mapped to Tailwind v4 `@theme` tokens. Hex
> values below are the computed equivalents.

### Brand & Accent (dual-accent system)

- **Purple** (`{colors.primary}` — #9333ea light / #6d28d9 dark): The brand
  action color. Nav links, CTAs, eyebrow labels, logo text, focus ring,
  `.gradient-text` start point. Dark mode shifts to a deeper violet (#6d28d9)
  — the only color that changes _hue_ between themes (not just lightness).
- **Emerald** (`{colors.accent}` — #059669): The status/confirmation color.
  Identical in both themes. "● LIVE" badges, feature-list checkmarks, the
  pulse-dot in the hero status pill, the `.gradient-text` end point. Never used
  for navigation or primary CTAs — it is always the _secondary_ accent.
- **Gradient Text** (`.gradient-text` — `linear-gradient(135deg, primary,
accent)`): Applied to the second clause of every section heading. The blend
  from purple to green IS the brand's visual signature on text.

### Surface

- **Canvas** (`{colors.canvas}` — #ffffff light / #020817 dark): The page
  background. The dark variant is a near-black blue (#020817) — not pure black,
  not zinc. It has a perceptible blue undertone that pairs with the purple
  primary.
- **Surface Muted** (`{colors.surface-muted}` — #f1f5f9 light / #1e293b dark):
  Used at 10–30% opacity as card backgrounds (`bg-muted/10`, `bg-muted/30`)
  and as the hover state for secondary buttons (`hover:bg-muted/50`).
- **Card** (`{colors.canvas}` — same as background): Cards share the page
  background color. Separation comes from the hairline border, not from a
  surface-color shift. In dark mode, cards are identical to the background
  (#020817) — the border is the only separator.

### Text

- **Ink** (`{colors.ink}` — #0f172a light / #f8fafc dark): Headlines, body
  emphasis, the "setup" clause of two-tone headings. A near-black with slight
  blue undertone in light mode (matches the canvas-dark blue bias).
- **Body Muted** (`{colors.body-muted}` — #64748b light / #94a3b8 dark):
  Paragraph text, descriptions, nav items, card body. The workhorse secondary
  text color. Used at full strength for default muted text; at `/60` for
  tertiary/legal; at `/30` for decorative (comment dividers, code-section
  separators).

### Hairlines & Borders

- **Divider** (`{colors.divider-soft}` — #e2e8f0 light / #1e293b dark): The
  1px border on cards, containers, and the footer top edge. **Always applied at
  50% opacity** (`border-border/50`) — the full-strength border is never used
  directly. This produces the whisper-soft hairline that defines the surface
  language.

### Terminal Surface (theme-independent)

- **Terminal Background** (`{colors.terminal-bg}` — #171717): The
  `bg-neutral-900` used on TerminalCard and CodeBlock. **Does not change with
  theme** — terminal cards are always dark, even in light mode. This is a
  deliberate choice: code is always shown on a dark canvas.
- **Terminal Bar** (`{colors.terminal-bar}` — #262626): `bg-neutral-800`, the
  title/traffic-light strip atop code cards.
- **Traffic Lights**: Red `#ef444466`, Yellow `#eab30866`, Green `#22c55e66` —
  all at ~40% opacity, 10px circles (`rounded-full`). These are the _only_
  consistently rounded elements in the terminal card grammar.

### Theme Behavior

The dark/light toggle is a `.dark` class on `<html>`, persisted in
`localStorage`. All theme-aware colors shift via the HSL CSS variables. The
two exceptions that **do not** participate in theming:

1. Terminal cards (always #171717).
2. The `{colors.accent}` green (identical hex in both themes — it already has
   enough contrast on both canvases).

## Typography

### Font Family

- **Primary** (`Roboto Mono, monospace`): The signature face. Set as
  `--font-sans` in the Tailwind `@theme`, meaning **Roboto Mono is the default
  body font** — not just the code font. This is the single most distinctive
  typographic decision: a monospace face running headlines, nav, eyebrows,
  paragraphs, and labels. Inter is listed as a fallback but the mono face is
  what ships.
- **Mono utility** (`@utility font-mono`): An explicit `font-family: "Roboto
Mono", monospace` utility for cases where the mono face needs to be forced.
- **Google Fonts loaded** (via `vite-plugin-webfont-dl`): Inter (400, 500, 700)
  and Roboto Mono (400, 500, 600, 700).

### Hierarchy

| Token                           | Size                                | Weight | Line Height   | Tracking          | Use                                                    |
| ------------------------------- | ----------------------------------- | ------ | ------------- | ----------------- | ------------------------------------------------------ |
| `{typography.hero-display}`     | 48px (lg) / 36px (md) / 30px (base) | 700    | 1.2           | tighter           | Hero headline ("If This / Then Money.")                |
| `{typography.section-head}`     | 36px (md) / 30px (base)             | 700    | 1.25 (tight)  | default           | Every section h2                                       |
| `{typography.card-title}`       | 18px                                | 700    | 1.4           | default           | Payment-type card names, integration names             |
| `{typography.step-title}`       | 14px                                | 700    | 1.4           | default           | Process-node titles (PULL, SETTLE, etc.)               |
| `{typography.body-lead}`        | 18px                                | 500    | 1.6           | default           | Hero sub-paragraphs, emphasized body                   |
| `{typography.body}`             | 15px                                | 400    | 1.7 (relaxed) | default           | Default paragraph — note the custom 15px, not 14 or 16 |
| `{typography.body-small}`       | 14px                                | 400    | 1.5           | default           | Card descriptions, FAQ answers, step descriptions      |
| `{typography.eyebrow}`          | 12px                                | 700    | 1.0           | 0.15em, uppercase | Section eyebrow label (always in `{colors.primary}`)   |
| `{typography.nav-link}`         | 12px                                | 400    | 1.0           | 0.12em, uppercase | Header nav items, dropdown items                       |
| `{typography.brand-label}`      | 12px                                | 600    | 1.0           | 0.3em, uppercase  | "TRIBUTARY" in header and footer                       |
| `{typography.button}`           | 14px                                | 500    | 1.0           | default           | All button labels                                      |
| `{typography.tag}`              | 12px                                | 400    | 1.5           | default           | Payment-type tag chips (`bg-muted/30`)                 |
| `{typography.status-badge}`     | 9px                                 | 700    | 1.0           | wider             | "● LIVE", "NEW", "NEXT" badges                         |
| `{typography.fine-print}`       | 10px                                | 400    | 1.3           | default           | Dropdown descriptions, footer copyright                |
| `{typography.terminal-caption}` | 12px                                | 400    | 1.4           | default, italic   | Terminal card captions                                 |

### Principles

- **Monospace is the default, not the exception.** The entire site runs on
  Roboto Mono. This signals "protocol infrastructure for developers" before a
  single word is read. Inter exists only as a sans-serif fallback if the mono
  face fails to load.
- **Body copy at 15px, not 16px.** The custom `text-[15px]` is used for
  paragraph blocks — a deliberate nudge between Tailwind's `text-sm` (14px) and
  `text-base` (16px). At monospace, 15px reads denser than a proportional face
  at the same size.
- **Eyebrow labels are mandatory section openers.** Every `<section>` begins
  with a `{typography.eyebrow}` label in `{colors.primary}` — 12px, 700 weight,
  uppercase, 0.15em tracking. This is the structural backbone: eyebrow →
  two-tone heading → body paragraph → content grid.
- **Two-tone headline split.** Section headings consistently split into two
  `<span>` elements: the first in `text-foreground`, the second in
  `.gradient-text`. Example: `<span class="text-foreground">Three knobs. </span>
<span class="gradient-text">Infinite compositions.</span>`. This is not
  occasional — it is on nearly every section heading.
- **The `//` comment divider.** Between every section, a standalone `<div>`
  renders `//` in `{colors.body-muted}` at 30% opacity, `font-mono`, `select-none`,
  `aria-hidden`. This is the code-as-structure motif: the page reads like a
  source file with section-break comments.
- **Weight ladder: 400 / 500 / 600 / 700.** No 300, no 800+. Body is 400,
  emphasized body is 500, brand labels are 600, eyebrows/headlines/badges are 700.

## Layout

### Spacing System

- **Base unit:** 4px (Tailwind default). Structural layout snaps to 8/12/16/20/24.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px ·
  `{spacing.md}` 16px · `{spacing.lg}` 20px · `{spacing.xl}` 24px ·
  `{spacing.xxl}` 32px · `{spacing.section}` 64px · `{spacing.hero}` 80px.
- **Section vertical padding:** `{spacing.section}` (64px / `py-16`) for content
  sections; `{spacing.hero}` (80px / `py-20`) for the hero only.
- **Card padding:** `{spacing.lg}` (20px / `p-5`) for payment-type cards;
  `{spacing.xl}` (24px / `p-6`) for info cards; 48px (`p-12`) for the final CTA.
- **Container:** `max-w-6xl` (1152px) with `px-4` (16px) on the main content
  wrapper; `px-6` (24px) in header/footer.
- **Prose blocks:** `max-w-3xl` (768px) for section intros — text never exceeds
  ~60ch in paragraph blocks.

### Grid & Container

- **Max content width:** `max-w-6xl` (1152px) globally. Some prose blocks cap
  at `max-w-3xl` (768px); social-proof centers at `max-w-6xl`.
- **Column patterns:** 2-column (`md:grid-cols-2`) for payment-type cards and
  composable-example; 3-column (`sm:grid-cols-3` / `md:grid-cols-3`) for the
  WHEN/PULL/ROUTE knob grid and process diagrams; 4-column
  (`md:grid-cols-4`) for stats and footer.
- **The three-knob grid:** `gap-0` — the three columns share borders, creating
  a single unified panel with internal dividers (`border-r border-border/30
last:border-r-0`). This is the only place `gap-0` is used; everywhere else
  uses `gap-4` (16px) or `gap-6` (24px).

### Whitespace Philosophy

The page uses generous vertical air (`py-16` between sections) with no
horizontal chrome — content runs edge-to-edge inside the `max-w-6xl` container
with no sidebar, no card frames around sections, no background-color section
bands (except the final CTA at `bg-muted/20`). Whitespace IS the section
divider; the `//` comment token reinforces it. The only structural enclosure
is the hairline border on cards.

## Elevation & Depth

| Level      | Treatment              | Use                                         |
| ---------- | ---------------------- | ------------------------------------------- |
| Flat       | No shadow, no border   | Page background, section bodies             |
| Hairline   | 1px `border-border/50` | Cards, containers, footer top               |
| 2xs shadow | `shadow-2xs`           | Primary CTA buttons only                    |
| lg shadow  | `shadow-lg`            | Header dropdown menu, CodeBlock copy button |

**Shadow philosophy.** Elevation is nearly absent. The primary CTA carries a
`shadow-2xs` — the smallest possible shadow — and that is the only shadow on
an interactive element in the main page grammar. The header dropdown and the
CodeBlock copy button use `shadow-lg` but these are edge cases. Cards, inputs,
and content containers rely entirely on the `{colors.divider-soft}` hairline
at 50% opacity. There are **no card shadows** in the standard card grammar —
hover changes the _border color_ (`hover:border-primary/30`), not the
elevation.

### Decorative Depth

- **Edge-fade gradients** on marquee walls mask the infinite-loop seam. Left
  and right 128px-wide gradient overlays fade from `{colors.canvas}` to
  transparent.
- **Gradient connector line** in process diagrams: a 1px horizontal line from
  `primary/10` → `primary/40` → `accent/40` connecting numbered nodes. The same
  purple→green gradient as `.gradient-text`, applied as a structural connector.
- **The `.gradient-text` class** is the primary decorative depth mechanism —
  it creates visual emphasis on text without bolding, shadows, or background
  highlights.

## Shapes

### Border Radius Scale

| Token            | Value  | Use                                                                 |
| ---------------- | ------ | ------------------------------------------------------------------- |
| `{rounded.none}` | 0px    | **The default.** Cards, buttons, containers, the CTA panel          |
| `{rounded.md}`   | 6px    | Theme toggle button only                                            |
| `{rounded.lg}`   | 8px    | Header "OPEN APP" button only                                       |
| `{rounded.xl}`   | 16px   | Marquee cards (TwitterWall, IntegrationsWall) — the major exception |
| `{rounded.full}` | 9999px | Status pulse-dots, traffic-light dots, avatar circles, bullet dots  |

**The `--radius: 0` decision.** The root `@theme` sets `--radius: 0`, which
cascades into `--radius-lg`, `--radius-md`, `--radius-sm` all resolving to 0
(or negative, clamped to 0). This means Tailwind's `rounded-lg`,
`rounded-md`, `rounded-sm` classes produce **sharp corners** by default. The
sharp aesthetic is the design system's baseline; rounded elements
(`rounded-xl`, `rounded-full`) are deliberate exceptions, not the norm.

### Photography & Imagery

- **Logos/avatars:** circular (`rounded-full`), 40px (`w-10 h-10`) for
  integration cards, `w-10 h-10` for Twitter avatars (with dicebear fallback).
- **No hero photography or product renders.** The page is text-and-code-first;
  the only images are integration logos and Twitter avatars in the marquee
  walls.

## Components

### Top Navigation

**Header** — Not sticky/fixed; scrolls with the page. `py-6` (24px) padding.
Left: logo image (`h-4 w-4`) + "TRIBUTARY" in `{typography.brand-label}` (12px,
600, 0.3em tracking, uppercase) in `{colors.primary}`. Center/right: nav items
in `{typography.nav-link}` (12px, 400, 0.12em tracking, uppercase) in
`{colors.body-muted}`, hover → `text-foreground`. A "DEVELOPERS" dropdown with
`ChevronDown` icon (rotates 180° on group-hover) reveals a `min-w-48` dropdown
panel (`bg-background border border-border shadow-lg`). Rightmost:
`{component.theme-toggle}` and a `{component.button-header}` ("OPEN APP").
Mobile: nav wraps to column (`flex-col` → `md:flex-row`).

### Buttons

**`{component.button-primary}`** — The main CTA. Background `{colors.primary}`,
text `{colors.primary-foreground}`, `{typography.button}` (14px / 500),
`{rounded.none}` (0 — sharp), height 44px (`h-11`), `px-6`, `shadow-2xs`.
Hover: `bg-primary/90` (10% darker via opacity). Contains an inline icon
(`h-4 w-4`, e.g. Code2) + label. Used for "Read the Docs" and similar.

**`{component.button-secondary}`** — Ghost/outline CTA. Background
`{colors.canvas}`, text `{colors.body-muted}` → `hover:text-foreground`, 1px
solid `border-border/50`, `hover:bg-muted/50`. Same height/padding as primary.
Used for "See it running" and "Get in touch".

**`{component.button-accent}`** — Variant that hovers into the accent color:
`hover:bg-accent hover:text-accent-foreground`. Used in the final CTA row.

**`{component.button-header}`** — The "OPEN APP" nav button. Transparent
background, `text-sm`, 1px solid `border-primary`, `{rounded.lg}` (8px — one
of the few rounded elements), `px-3 py-1.5`. Hover: fills with primary.

**`{component.theme-toggle}`** — `p-2 rounded-md hover:bg-muted`. Moon/Sun
icons from lucide-react at `h-4 w-4`.

### Eyebrow + Two-Tone Heading

Every section follows this structural pattern:

```
<p class="eyebrow">SECTION LABEL</p>     ← primary, 12px, 700, uppercase, 0.15em
<h2>
  <span class="text-foreground">Setup clause. </span>
  <span class="gradient-text">Punchline.</span>
</<h2>
<p class="body-muted">Description paragraph.</p>
```

This is the **structural backbone** of the page — it appears on every section
without exception.

### Cards

**`{component.card-info}`** — Info/pain-point card. Background
`bg-muted/10` (surface-muted at 10%), 1px `border-border/50`, `{rounded.none}`,
`p-6` / `space-y-3`. Used for conflict/pain-point scenarios.

**`{component.card-payment}`** — Payment-type card. Background `{colors.canvas}`,
1px `border-border/50` → `hover:border-primary/30 transition-all`, `{rounded.none}`,
`p-5 / space-y-4`. Contains: icon (`h-6 w-6`), tag chips, title
(`{typography.card-title}`), description, feature list with `{colors.accent}`
Check icons.

**`{component.card-marquee}`** — Twitter/integration card. Background
`{colors.canvas}`, 1px `border-border` → `hover:border-primary/25
hover:bg-muted/30`, **`{rounded.xl}`** (16px — the major radius exception),
`p-5`. Fixed widths: `w-80` (320px) for tweets, `w-120` (480px) for integrations.

**FAQ item** — Native `<details>` / `<summary>` element. 1px
`border-border/50` → `hover:border-primary/30`. Summary row: HelpCircle icon
(`h-4 w-4 text-primary`) + question (`font-medium hover:text-primary`) +
ChevronDown (rotates 180° on `group-open`). Body: `px-4 pb-4 text-sm
text-muted-foreground`.

### Terminal / Code Cards

**`{component.terminal-card}`** — The developer-identity anchor. Always dark
(`bg-neutral-900` / #171717) regardless of theme. Top bar (`bg-neutral-800`):
three traffic-light dots (`w-2.5 h-2.5 rounded-full` at 40% opacity) + filename
(`text-xs text-neutral-500 font-mono`). Optional tag chip (`bg-primary/10
text-primary border-primary/20`). Copy button (Copy/Check icons,
`text-neutral-500 hover:text-neutral-300`). Body: Shiki-highlighted code
(`github-dark` theme) in `font-mono text-sm text-neutral-200`. Optional caption
footer with attribution. **Sharp corners** (`{rounded.none}`) — the terminal
card is rectangular, matching the page grammar.

**CodeBlock** — A tabbed variant with rounded corners (`rounded-2xl` — an
inconsistency vs TerminalCard). Same dark palette. Tabs with active state in
`text-purple-400 border-b-2 border-purple-400`. Copy button in `bg-primary`.

### Process Diagrams

**`{component.process-node}`** — 64×64px (`w-16 h-16`), background
`{colors.canvas}` (`bg-card`), 1px border (`border-primary/25` →
`group-hover:border-primary/60 group-hover:bg-secondary`), `{rounded.none}`.
Contains an SVG icon (`w-7 h-7`, `strokeWidth={1.5}`) in `{colors.primary}` or
`{colors.accent}`. Numbered badge: 20×20px (`w-5 h-5`) at `-top-2 -right-2`,
`bg-primary text-white text-xs font-bold`.

**`{component.process-connector}`** — A 1px horizontal line behind the nodes:
`bg-gradient-to-r from-primary/10 via-primary/40 to-accent/40`. Hidden on
mobile (`hidden md:block`). Positioned absolutely at `top-8`.

### Three-Knob Grid

**`{component.knob-column}`** — A 3-column grid with `gap-0` (columns share
borders). Each column: color-coded background tint (`bg-{color}/5`), large knob
name (`text-3xl font-bold` in the knob's color), status badge
(`{component.status-badge-live}`), and an item list with colored bullet dots
(`w-1 h-1 rounded-full`). The three knob colors are:

- WHEN: `{colors.primary}` (purple)
- PULL: `text-amber-400` (amber — a third ad-hoc accent)
- ROUTE: `text-purple-400` (lighter purple)

### Marquee Walls

**`{component.card-marquee}`** in a seamless infinite-scroll track.
Implementation: `requestAnimationFrame` incrementing `scrollLeft += 1` per
frame; track content duplicated 2×; reset to 0 when first half consumed.
Pause on hover; drag-to-scroll with `cursor: grab` / `cursor: grabbing`.
Edge fades: 128px-wide gradient overlays (`linear-gradient(to right,
var(--color-background), transparent)`) on left and right, `pointer-events-none`.

### Status Badges

**`{component.status-badge-live}`** — "● LIVE". `{typography.status-badge}`
(9px, 700, wider tracking). Text `{colors.accent}`, 1px border
`border-accent/30`. Used on knob status, payment-type "NEW" tags, use-case
cards.

**`{component.status-badge-next}`** — "NEXT" or disabled state. Text
`{colors.body-muted}` at 60%, 1px border `border-border`.

### Footer

**`{component.footer}`** — 4-column grid (`md:grid-cols-4`). Background
`{colors.canvas}`, top border 1px `border-border/50`, padding `py-12`.
Brand column: Code2 icon + "TRIBUTARY" in `{typography.brand-label}`. Link
columns: `{typography.body-small}` (14px) in `{colors.body-muted}` →
`hover:text-foreground`. Bottom bar: copyright + social icons (Twitter,
Telegram SVG, GitHub, Mail) at `h-4 w-4`, in `{colors.body-muted}` at 60%.

## Do's and Don'ts

### Do

- Use `{colors.primary}` (purple) for eyebrow labels, nav links, CTAs, and the
  `.gradient-text` start point — it is the brand action color.
- Use `{colors.accent}` (emerald) exclusively for status/confirmation signals
  ("● LIVE", checkmarks, pulse dots) — never for navigation or primary CTAs.
- Split every section heading into two tones: foreground for the setup clause,
  `.gradient-text` for the punchline. This is the structural motif.
- Open every section with a `{typography.eyebrow}` label (12px, 700, uppercase,
  0.15em tracking, in `{colors.primary}`).
- Separate sections with the `//` comment divider (`{component.comment-divider}`)
  — it reinforces the code-as-structure identity.
- Keep borders at 50% opacity (`border-border/50`) — the whisper-soft hairline
  is the surface language. Full-strength borders are never used.
- Run body copy in Roboto Mono at `text-[15px]` — the monospace default IS the
  brand. Do not switch to Inter for body text.
- Keep terminal cards always dark (`bg-neutral-900`) regardless of theme — code
  lives on a dark canvas.
- Use `hover:border-primary/30 transition-all` as the card hover pattern —
  border color shift, not elevation or scale.

### Don't

- Don't round corners by default — `--radius: 0` is the baseline. Reserve
  `{rounded.xl}` for marquee cards and `{rounded.full}` for dots/avatars only.
- Don't use card shadows for hover elevation — the hover signal is the border
  color shifting to `primary/30`, not a drop-shadow.
- Don't introduce a third accent color for brand purposes. Amber (`amber-400`)
  appears on the PULL knob column as a functional color-code, not a brand
  accent — do not propagate it.
- Don't use Inter as the primary body font — it is the fallback. Roboto Mono
  carries the entire page.
- Don't apply `.gradient-text` to full headlines — it is always the _second
  clause_ (the punchline), paired with a foreground-colored setup clause.
- Don't use full-opacity borders (`border-border`) — always dilute to `/50`.
  The hairline must whisper.
- Don't add section background-color bands (except the final CTA at
  `bg-muted/20`) — sections separate via whitespace + `//` dividers, not color
  blocks.
- Don't animate with framer-motion for page-level interactions — CSS
  transitions (`transition-colors`, `transition-all`, `transition-transform`)
  are the standard. The marquee is `requestAnimationFrame`-driven, not
  framer-motion.

## Responsive Behavior

### Breakpoints

| Name          | Width    | Key Changes                                                                                                                                           |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base (mobile) | < 640px  | Single-column stack; nav wraps to column; hero text-center; `text-3xl` headlines                                                                      |
| `sm:`         | ≥ 640px  | Button row goes `flex-row`; knob grid still 1-col                                                                                                     |
| `md:`         | ≥ 768px  | 2-column grids (payment cards, composable example); nav goes `flex-row`; headlines → `text-4xl` (36px); process connectors appear (`hidden md:block`) |
| `lg:`         | ≥ 1024px | Hero text-left (`lg:text-left lg:items-start`); hero headline → `text-5xl` (48px)                                                                     |

The page is **mobile-first** — base classes target mobile, `sm:`/`md:`/`lg:`
layer in structure. There are no `xl:` or `2xl:` breakpoints; `max-w-6xl`
(1152px) is the content ceiling.

### Touch Targets

- Primary/secondary CTAs: `h-11` (44px) — meets the 44px minimum.
- Header "OPEN APP": ~32px (`py-1.5 text-sm`) — below minimum, but it is a
  desktop nav action (mobile gets the wrapped column layout).
- Theme toggle: `p-2` with `h-4 w-4` icon ≈ 32px — also a desktop-only control.

### Collapsing Strategy

- **Nav**: `flex-col gap-4` on mobile → `md:flex-row md:items-center
md:justify-between`. The DEVELOPERS dropdown is hover-based (`group-hover`) —
  no mobile hamburger; the nav items wrap.
- **Grids**: `grid-cols-1` → `md:grid-cols-2` (cards) / `sm:grid-cols-3`
  (knobs) / `md:grid-cols-4` (stats, footer).
- **Hero**: `text-center` on mobile → `lg:text-left lg:items-start`. CTA row:
  `flex-col` → `sm:flex-row`.
- **Headlines**: `text-3xl` (30px) → `md:text-4xl` (36px) → `lg:text-5xl`
  (48px) for the hero. Section headings: `text-3xl` → `md:text-4xl`.

## Iteration Guide

1. Every new section follows the eyebrow → two-tone-heading → body → content
   pattern. Do not skip the eyebrow.
2. Terminal cards (`{component.terminal-card}`) are the preferred code-display
   component — always dark, sharp corners, Shiki `github-dark` theme.
3. Card hover is always `hover:border-primary/30 transition-all` — never add
   shadows or scale transforms to cards.
4. Status indicators use `{component.status-badge-live}` (accent green) or
   `{component.status-badge-next}` (muted) — do not invent new badge colors.
5. When adding a new accent color for functional color-coding (like the knob
   grid's amber/purple), use it only within that component — do not propagate it
   into the global palette.
6. The `//` comment divider goes between every section without exception.
7. `.gradient-text` is applied via the CSS class, not inlined — it reads the
   theme-aware HSL variables automatically.

## Known Gaps

- **Radius inconsistency:** `--radius: 0` is the declared baseline, but
  CodeBlock uses `rounded-2xl` (16px), IntegrationsWall/TwitterWall cards use
  `rounded-2xl`, the header CTA uses `rounded-lg`, and the theme toggle uses
  `rounded-md`. These are ad-hoc exceptions, not documented tokens. A future
  pass should either reconcile them to the sharp baseline or formalize the
  exceptions.
- **framer-motion dependency is unused.** The package is in `dependencies`
  (`framer-motion: ^12.38.0`) but no component imports it. All animations are
  CSS transitions or `requestAnimationFrame`. The dependency can likely be
  removed.
- **Ad-hoc functional colors.** The three-knob grid uses `text-amber-400` and
  `text-purple-400` (for PULL and ROUTE respectively) and payment-type icons
  use `text-${type.color}` with values like `blue-500`, `amber-500`,
  `purple-500`. These bypass the theme system and are not dark-mode-aware.
- **CodeBlock vs TerminalCard divergence.** Two code-display components exist
  with different styling: TerminalCard (sharp corners, `github-dark` Shiki
  theme, no tabs) and CodeBlock (rounded-2xl corners, `github-light` Shiki
  theme despite dark background, tabbed). These should likely be unified.
- **Header is not sticky.** The header scrolls away with the page. No
  scroll-based show/hide or backdrop-blur sticky behavior is implemented.
- **No form inputs documented.** The landing page has no form components
  (no search, no email input, no contact form). Input styling is inherited
  from the Tailwind base and is not part of the documented design system.
- **No error/validation states.** No error states, toast notifications, or
  form validation patterns exist in the landing page codebase.
