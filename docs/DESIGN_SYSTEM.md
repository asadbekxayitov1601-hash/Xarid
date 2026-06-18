# Xarid Design System v2 — Immersive 3D

> Single source of truth for visual + motion direction. Every agent (landing,
> customer, deliver/supplier, logistics, admin) MUST follow this document.
> The other agents do not get to invent their own palette, fonts, or shadows.
> If something is missing here, extend this doc first, then build.

---

## 1. Design philosophy

Xarid is a B2B marketplace where Tashkent restaurant owners order tomorrow's
inventory while their sous-chef closes the kitchen. The mood is **fresh,
warm, trustworthy** — a sunlit grocery aisle rather than a generic e-commerce
dashboard. Surfaces feel like real glass plates resting on a cream counter:
tactile depth, slow ambient motion, vivid green highlights that read as "supply
confirmed / fresh". **Light mode is the default** — cream background with green
accents, the room with the curtains open. Dark mode is the same room at night:
a green-tinted near-black with the same green accents. Everything must remain
readable on a 5-inch phone inside the Telegram mini-app webview.

---

## 2. Color system

> **Brand re-palette (current).** The brand is a **cream + green, light-first**
> system. Primary accent is `#59C749` (fresh green); secondary accent is
> `#3DA233` (a darker green); the light-mode background is `#FFFDF1` (cream) and
> the dark-mode background is `#0B100A` (green-tinted near-black). Text on a
> green fill uses a near-black green ink (`#07260A`, the `--on-accent` token) —
> cream/white text fails WCAG AA on mid-green, so never put light text on a
> green button. The historic emerald/amber Tailwind utility ramps are remapped
> to green hues in the `@theme` block of `app/globals.css`, so legacy
> `emerald-*` / `amber-*` classes now render as the brand green. **Functional
> status colors stay functional** (teal = delivered, amber = placed/pending,
> red = cancelled, blue/sky = confirmed/in-transit) — success uses a cool teal
> so it stays distinct from the warmer brand green. See §2.2.

### 2.1 Core tokens (do not remove)

`app/globals.css` defines these — they stay (values are the brand re-palette):

| Token                  | Dark                       | Light                  | Use                              |
|------------------------|----------------------------|------------------------|----------------------------------|
| `--accent`             | `#59C749` brand green      | `#3DA233` (deepened)   | Primary action, brand            |
| `--accent-glow`        | `rgba(89,199,73,.15)`      | `rgba(89,199,73,.12)`  | Halo behind primary surfaces     |
| `--on-accent`          | `#07260A` dark green ink   | `#07260A` dark green ink| Text/icon on a green accent fill (AA) |
| `--bg-primary`         | `#0b100a` green near-black | `#fffdf1` cream         | Page background                 |
| `--bg-secondary`       | `#121a10` green near-black | `#f5efdf` warm cream   | Section / card base              |
| `--text-primary`       | `#f7f6fb` near-white       | `#17210f` green-ink    | Headlines, body                  |
| `--text-secondary`     | `#c9d6c3` green-grey       | `#5a6150` green-grey   | Captions, meta                   |
| `--border-color`       | `rgba(255,255,255,.08)`    | `rgba(23,33,15,.1)`    | Hairline borders                 |
| `--glass-bg`           | `rgba(18,26,16,.65)`       | `rgba(255,253,241,.78)`| Glass card fill                  |
| `--glass-hover-border` | `rgba(89,199,73,.3)`       | `rgba(61,162,51,.4)`   | Card hover edge                  |
| `--glass-glow`         | `rgba(89,199,73,.15)`      | `rgba(89,199,73,.1)`   | Card hover halo                  |

### 2.2 NEW tokens (added in section 11 below)

| Token                  | Dark                       | Light                  | Use                              |
|------------------------|----------------------------|------------------------|----------------------------------|
| `--accent-2`           | `#3DA233` darker green     | `#59C749` brighter green| Secondary accent (charts, gradients) |
| `--accent-2-glow`      | `rgba(61,162,51,.18)`      | `rgba(89,199,73,.12)`  | Halo for secondary-green surfaces |
| `--accent-3`           | `#38bdf8` sky-400          | `#0284c7` sky-600      | Tertiary accent (links, info, in-motion) — kept cool so chart slices stay distinct from the green brand |
| `--status-success`     | `#14b8a6` teal (functional)| `#0d9488`              | Delivered, paid, healthy (cool teal, distinct from brand green) |
| `--status-success-bg`  | `rgba(20,184,166,.12)`     | `rgba(20,184,166,.1)`  | Badge fill                       |
| `--status-warning`     | `#f59e0b` (functional)     | `#d97706`              | Placed, pending, partial         |
| `--status-warning-bg`  | `rgba(245,158,11,.12)`     | `rgba(245,158,11,.1)`  | Badge fill                       |
| `--status-danger`      | `#ef4444` (functional)     | `#dc2626`              | Cancelled, failed                |
| `--status-danger-bg`   | `rgba(239,68,68,.12)`      | `rgba(239,68,68,.1)`   | Badge fill                       |
| `--status-info`        | `#38bdf8` (functional)     | `#0284c7`              | Confirmed, in-transit            |
| `--status-info-bg`     | `rgba(56,189,248,.12)`     | `rgba(56,189,248,.1)`  | Badge fill                       |
| `--shadow-xs`          | `0 1px 2px rgba(0,0,0,.4)` | `0 1px 2px rgba(0,0,0,.05)` | UI chrome (buttons, inputs)  |
| `--shadow-sm`          | `0 4px 12px -2px rgba(0,0,0,.5)` | `0 4px 12px -2px rgba(0,0,0,.08)` | Hovered chip / toggle |
| `--shadow-md`          | `0 12px 28px -8px rgba(0,0,0,.55)` | `0 12px 28px -8px rgba(0,0,0,.1)` | Resting card           |
| `--shadow-lg`          | `0 24px 48px -16px rgba(0,0,0,.6)` | `0 24px 48px -16px rgba(0,0,0,.12)` | Hovered card / modal |
| `--shadow-xl`          | `0 36px 72px -24px rgba(0,0,0,.7)` | `0 36px 72px -24px rgba(0,0,0,.16)` | Hero focal element  |
| `--shadow-glow-accent` | `0 0 32px rgba(89,199,73,.3)` | `0 0 32px rgba(89,199,73,.18)` | Accent halo (CTAs)      |

### 2.3 Usage rules

- **Never inline a hex value in JSX.** Use `var(--accent)` or `text-accent` /
  semantic Tailwind classes referencing the tokens above. Raw brand hex only
  lives in `app/globals.css` (token definitions) and in a handful of
  non-CSS contexts that cannot read CSS vars (Leaflet map polylines, the
  standalone `global-error.tsx` and `app/icon.svg`).
- **Brand green (`--accent`) = Xarid identity** — primary CTAs, brand marks,
  active nav, selected chips, the hero. **Text/icons on a green fill use the
  dark green ink `--on-accent` (`#07260A`)** — the green fill is mid-luminance, so
  cream/white text fails WCAG AA. Never set button text to `var(--bg-primary)`
  on a green fill: in light mode that is cream-on-green (unreadable).
- **Secondary green (`--accent-2`) = secondary brand** — gradient partner for
  the primary green, chart secondary series, sub-highlights, satellite accents.
- **Status colors are FUNCTIONAL and never brand-tinted:**
  teal = delivered/paid/healthy, amber = placed/pending/partial,
  red = cancelled/failed, sky/blue = confirmed/in-transit. Use the
  `--status-*` tokens (or `glow-status-*` utilities) for these — do NOT use the
  brand accent for a "delivered" pill. Success is a cool teal precisely so it
  never gets confused with the warmer brand green.
- Sky (`--accent-3`) doubles as "in motion" (delivering) and the third chart
  hue; it is deliberately kept cool so chart slices and in-transit states stay
  distinguishable from the green brand.

---

## 3. Typography

### 3.1 Pairing — `Manrope` (display) + `Inter` (body)

Why: Manrope is a geometric semi-condensed sans with very tall x-height — it
reads as "modern infrastructure" without the brittleness of Inter Display, and
it shapes Cyrillic + Latin well (critical because every screen renders in
uz/ru/en). Inter is already loaded and stays for body. The two pair because
Manrope's geometry is slightly tighter than Inter's, giving headlines a
distinct, weightier voice without a font-style clash.

### 3.2 Implementation

Update `app/layout.tsx`:

```tsx
import { Inter, Manrope } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-body",
});
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["600", "700", "800"],
  variable: "--font-display",
});

// <body className={`${inter.variable} ${manrope.variable} font-body ...`}>
```

Add to `globals.css` `@theme`:

```css
--font-body: var(--font-body), "Inter", system-ui, sans-serif;
--font-display: var(--font-display), "Manrope", "Inter", system-ui, sans-serif;
```

Tailwind utilities: `font-body` (default), `font-display` (headlines + stat
numbers).

### 3.3 Type scale (mobile-first, rem)

| Token        | Size / line-height          | Weight | Tracking  | Use                            |
|--------------|-----------------------------|--------|-----------|--------------------------------|
| `display-xl` | 3rem / 1.05                 | 800    | -0.03em   | Hero headline                  |
| `display-lg` | 2.25rem / 1.1               | 800    | -0.025em  | Section headline               |
| `display-md` | 1.5rem / 1.2                | 700    | -0.02em   | Card title, stat number        |
| `display-sm` | 1.125rem / 1.3              | 700    | -0.01em   | Sub-section                    |
| `body-lg`    | 1.0625rem / 1.55            | 400    | 0         | Lead paragraph                 |
| `body-md`    | 0.9375rem / 1.55            | 400    | 0         | Default body                   |
| `body-sm`    | 0.8125rem / 1.5             | 500    | 0         | Caption, meta                  |
| `mono-sm`    | 0.8125rem / 1.4             | 600    | 0         | Numbers in tables (use Inter   |
|              |                             |        |           | with `tabular-nums`)           |

All numeric columns (prices, weights, totals) use `font-display tabular-nums`
so columns align in tables and stat tiles.

---

## 4. Depth language

We have a real 3D scene (`scene-perspective` + `scene-3d` + `depth-*`) — not
faked layering. Use it deliberately. Treat the page as three planes:

| Layer       | Class          | translateZ | When to use                                                  |
|-------------|----------------|------------|--------------------------------------------------------------|
| Background  | `depth-neg-1`  | `-30px`    | Blob ambient, decorative orbits, ghost stats behind content. |
| Resting     | (no class)     | `0`        | Default content surface.                                     |
| Hovered     | `depth-1`      | `35px`     | Card on pointer enter, satellite tile in hero.               |
| Floating    | `depth-2`      | `75px`     | Tooltip, popover, dropdown, central hero card.               |
| Focal       | `depth-3`      | `120px`    | Hero focal element, modal, image lightbox.                   |

**Rule:** any element using `depth-2` or `depth-3` must live inside a parent
with `scene-perspective` — otherwise translateZ silently collapses to zero.

### Shadow scale ↔ depth pairing

| Depth class | Shadow token             |
|-------------|--------------------------|
| resting     | `--shadow-md`            |
| `depth-1`   | `--shadow-lg`            |
| `depth-2`   | `--shadow-lg` + glow     |
| `depth-3`   | `--shadow-xl` + glow     |

Use Tailwind: `shadow-[var(--shadow-md)]` until we expose them as theme
tokens.

---

## 5. Motion language

Motion is the second axis of depth. It must always (a) signal state change,
(b) feel like physics, (c) respect `prefers-reduced-motion`.

### 5.1 Easings (named, reusable)

| Name           | Curve                                | Use                            |
|----------------|--------------------------------------|--------------------------------|
| `ease-glide`   | `cubic-bezier(0.25, 0.8, 0.25, 1)`   | Default UI transitions         |
| `ease-spring`  | `cubic-bezier(0.215, 0.61, 0.355, 1)`| Scroll reveal, modal in        |
| `ease-snap`    | `cubic-bezier(0.4, 0, 0.2, 1)`       | Toggle, tab switch             |

### 5.2 Durations

| Token          | ms   | Use                                                  |
|----------------|------|------------------------------------------------------|
| `dur-fast`     | 150  | Hover state, focus ring                              |
| `dur-base`     | 300  | Default UI transition                                |
| `dur-slow`     | 600  | Card lift, reveal                                    |
| `dur-ambient`  | 6–24s| Floats and blob drifts — keep already-defined values |

### 5.3 When to use which utility

| Utility           | Trigger                                    | Notes                        |
|-------------------|--------------------------------------------|------------------------------|
| `float-a`         | Hero central card, marketing focal items   | 6s y-axis                    |
| `float-b`         | Satellite tiles top-left/bottom-right      | 8s, slightly larger drift    |
| `float-c`         | Satellite tiles top-right/bottom-left      | 5s, smallest drift           |
| `blob` `blob-2/3` | Marketing pages, role picker, auth         | Always behind content        |
| `ring-spin`       | Hero, role picker, stat hub                | Decorative; pair with `-reverse` |
| `scroll-reveal`   | Section entry on marketing + dashboard     | Stagger by 80–120ms          |
| `scroll-parallax` | Marketing hero / role picker only          | NEVER inside data tables     |
| `tilt-card`       | Stat tiles, product cards, ChartCards      | Tilt range ≤ 8°              |

### 5.4 Reduced motion

The existing media query in `globals.css` disables `float-*`, `blob`,
`ring-spin*`, and `reveal` transition. **Do not add motion utilities that
bypass it.** If you create a new keyframe animation, add its class to the
existing `prefers-reduced-motion` block in the same change.

---

## 6. 3D surfaces — when "real" vs "fake"

### 6.1 Real 3D (Three.js / Spline)

Reserve real 3D for two surfaces only. Anything else is overkill and bloats
the Telegram webview.

1. **Marketing hero on `/`** — currently CSS-3D (`components/hero-3d.tsx`).
   Leave it CSS-3D. Reason: it runs 60fps inside the Telegram webview where
   WebGL context creation is expensive. The current "floating order card +
   orbiting tiles" is already the right idiom.
2. **Logistics map card (Agent 5)** — `react-map-gl` with a pitched view
   (45° tilt, terrain on). The map IS the 3D — do not also render a Three.js
   scene on top of it. Driver pin = animated `<motion.div>` over the map.

### 6.2 Fake 3D (CSS transforms — default)

Everything else uses `scene-perspective` + `scene-3d` + `depth-*`:

- **Product cards** — `tilt-card` on hover, `depth-1` on focus.
- **Stat tiles (analytics)** — `scene-perspective` parent, `tilt-card` on each
  tile, number rendered at `depth-1` so it visually lifts off the gradient.
- **Chart cards** — flat panel, but the title + delta badge live at `depth-1`.
- **Role picker (auth)** — two large cards in a `scene-perspective` row;
  hovered card raises to `depth-2` and the other settles to `depth-neg-1`.
- **Order timeline (orders, driver)** — vertical rail; the current step's
  bubble lifts to `depth-1` with `--shadow-glow-accent`.

---

## 7. Component catalog

Each agent builds against this catalog. If a component is missing, propose it
in this doc before creating it. One-line spec each — implementation details
are the agent's call as long as they reuse the tokens above.

### 7.1 Surfaces

- **GlassCard** — `glass-card` + slot. Default container. Already exists as a CSS class.
- **ImmersiveCard** — `GlassCard` inside `scene-perspective`, content uses
  `depth-*` to layer. For marketing + analytics focal cards.
- **StatTile** — `ImmersiveCard`, big number at `depth-1` with
  `font-display tabular-nums`, delta badge at top-right, mini sparkline at
  bottom. Used in supplier analytics and admin dashboard.
- **ChartCard** — `GlassCard` wrapping a Recharts area/line/bar chart, title
  + legend + period toggle in a header row. Charts use `--accent` as primary
  series and `--accent-2` as secondary.
- **MapCard** — `GlassCard` wrapping `react-map-gl`. Always with a
  fixed-aspect 16:9 frame on mobile, pitched 45°, dark-style basemap that
  matches `--bg-secondary`.
- **OrderTimeline** — vertical rail of `TimelineStep`s; current step elevated.
- **EmptyState** — centered illustration (from `/public/hero/*.svg`) + title
  + body + single CTA. All copy via `t()`.

### 7.2 Controls

- **GlowButton** — primary CTA. Uses existing `.glow-button` class. Variants:
  `primary` (brand purple), `secondary` (brand indigo), `ghost` (border only).
- **ToolbarButton** — square 40×40 icon button with `glass-card` background,
  used in admin / driver surfaces.
- **GlassInput** — uses existing `.glass-input` class. Always paired with a
  visible label (no placeholder-only labels).
- **SegmentedControl** — pill row of mutually-exclusive toggles
  (uz/ru/en, day/week/month). Active item: `--accent` fill.
- **StatusBadge** — pill with one of the 4 status colors and matching `-bg`.
  Maps to existing `glow-status-*` classes; extend to cover all order
  statuses.

### 7.3 Layout

- **PageHeader** — title + subtitle + optional action row. Subtitle is
  `body-sm text-text-secondary`.
- **SectionStack** — vertical stack with `gap-12` desktop, `gap-8` mobile.
- **RolePicker** — two ImmersiveCards (Customer / Deliver) side-by-side
  desktop, stacked mobile. Used on `/auth`.
- **Toast** — bottom-center, glass background, auto-dismiss 3s, swipe to
  dismiss on mobile.

### 7.4 Domain

- **ProductCard** — image + name + cheapest-offer price + `add_to_basket`
  GlowButton. `tilt-card` on hover.
- **OrderCard** — status badge + items count + total + delivery window +
  reorder action.
- **OfferRow** — supplier name + price + lead time + accept/reject for buyers
  comparing multiple offers (Agent 5 / Agent 2 shared).
- **DriverPin** — `react-map-gl` marker; animated pulse using `float-a`
  scaled down.

---

## 8. i18n discipline

> Every visible string lives in `lib/i18n.ts` and resolves via `t(locale,
> key, params?)`. Languages: uz, ru. English is a future addition — if you
> add `en`, add it to ALL keys at once. Adding a new key requires editing both
> `uz` and `ru` in the same change.

### 8.1 Example — adding a StatTile to supplier analytics

```ts
// lib/i18n.ts — add to BOTH uz and ru:
stat_revenue_30d: "30 kunlik daromad", // uz
stat_revenue_30d: "Выручка за 30 дней", // ru
stat_revenue_delta: "{delta}% o'tgan oyga nisbatan", // uz
stat_revenue_delta: "{delta}% к прошлому месяцу",     // ru
```

```tsx
// component
<StatTile
  label={t(locale, "stat_revenue_30d")}
  value={uzs(locale, revenue)}
  delta={t(locale, "stat_revenue_delta", { delta: deltaPct })}
/>
```

### 8.2 Lint rule (manual until codified)

Before opening a PR: `grep -rE '"[A-Z][a-z]+ [a-z]'` your new files — any
hit that's not a `t()` argument is a violation. No raw English/Uzbek strings
in JSX, no `"TODO translate"` placeholders.

---

## 9. Anti-patterns

These are blocking review comments. Do not ship any of them.

1. **Flat shadow-less cards.** Every surface gets at least `--shadow-md`. If
   you find yourself using `bg-bg-secondary border` and nothing else, wrap it
   in `glass-card` or `ImmersiveCard` instead.
2. **Raw hex in JSX/Tailwind.** `bg-[#10b981]` is forbidden. Use the token.
   This is enforced by reading `globals.css` first.
3. **English-only strings.** Including the obvious ones: button labels,
   `aria-label`, toast messages, validation errors.
4. **Motion that bypasses `prefers-reduced-motion`.** Every new keyframe
   class goes into the existing `@media (prefers-reduced-motion: reduce)`
   block in the SAME commit.
5. **Light mode as an afterthought.** Every component must be checked with
   `<html class="light">` before merging. The semantic tokens make this
   automatic — the violation is hardcoding a color that only works dark.
6. **`<img>` as a button.** Tap targets ≥ 40px, always with an `aria-label`
   that resolves through `t()`.
7. **WebGL on non-hero/non-map surfaces.** Heavy 3D libraries are banned in
   product, basket, orders, supplier, and admin flows.
8. **Replacing `components/hero-3d.tsx`, `tilt-card.tsx`, `scroll-*` with a
   new version.** Edit in place.
9. **Mixing motion libraries.** We use `motion` (framer-motion). Do not
   introduce GSAP, react-spring, or anemone.
10. **Layouts that break in Telegram's webview at 360px width.** Test on
    iPhone SE viewport before opening a PR.

---

## 10. Per-surface playbook (quick reference)

| Surface                           | Lead motif                                   | Real 3D? |
|-----------------------------------|----------------------------------------------|----------|
| Landing `/`                       | CSS-3D hero with orbiting tiles              | No       |
| Auth `/auth` + RolePicker         | Two ImmersiveCards over blob ambient         | No       |
| Customer catalog `/catalog`       | ProductCard grid with `tilt-card`            | No       |
| Customer basket `/basket`         | Order summary as ImmersiveCard `depth-2`     | No       |
| Customer orders `/orders`         | OrderTimeline; current step `depth-1`        | No       |
| Deliver/Supplier `/supplier`      | Stat hub: StatTile + ChartCard grid          | No       |
| Driver `/driver/orders/[id]`      | MapCard with pitched basemap + driver pin    | Yes      |
| Admin `/admin/*`                  | Dense glass tables; StatTile row on top      | No       |

---

## 11. CSS variable additions (appended to `app/globals.css`)

A `/* --- design-system v2 additions --- */` block is appended to
`app/globals.css` containing every token in section 2.2. Both `:root` (dark)
and `html.light` (light) blocks are extended in parallel. Do not duplicate
existing tokens — only add what's new.

---

*End of design direction. Build against this; do not improvise color or
typography decisions in agent prompts.*
