# Xarid Design Research — Redesign Brief (Agent 1 -> Agent 2)

> Purpose: a concrete, copy-pasteable upgrade plan. Agent 2 executes the
> "Concrete change list" (section F) file-by-file WITHOUT re-deriving anything.
> Every recommendation maps to a REAL Xarid surface and respects
> `docs/DESIGN_SYSTEM.md` (emerald + amber + sky, Manrope/Inter, depth-1/2/3,
> named easings). We refine; we do not replace.

Inspiration sources studied:
1. anime.js onScroll (scroll-triggered timelines) — https://animejs.com/documentation/events/onscroll
2. Iconsax (linear/bold/bulk/broken/twotone icon set) — https://iconsax.io
3. Motion (motion.dev, already installed as `motion@12`) — useScroll / useTransform / springs / gestures
4. 21st.dev community components — modern React/Tailwind patterns

---

## A. Executive direction

These four sources resolve into ONE upgrade: keep Xarid's "calm, nocturnal,
expensive operator console" identity but make it move with intent. Motion
(source 3) becomes the single animation engine — we standardize the two legacy
hand-rolled scroll utilities (`scroll-reveal.tsx` IntersectionObserver,
`scroll-parallax.tsx` raw scroll listener) onto `useScroll`/`useTransform` so
hero parallax and section reveals are GPU-driven and consistent, and we add ONE
scroll-scrubbed progress element. From 21st.dev (source 4) we adopt four B2B-fit
patterns — a bento "how it works" grid, a supplier-logo marquee, glow/spotlight
cards, and an animated segmented tab — all rebuilt on our existing tokens and
`glass-card`/`depth-*`/`glow-button` utilities, never copied. From Iconsax
(source 2) we adopt the **bulk/duotone two-tone icon look** to give the brand a
warmer, more "designed" feel than lucide's uniform 2px strokes — but we get it
WITHOUT a heavy dependency wherever possible, reserving an actual package only
for the few hero/marketing surfaces. anime.js (source 1) is explicitly NOT
added: motion's `useScroll` covers every onScroll effect we need, and
`DESIGN_SYSTEM.md` §9.9 bans mixing animation libraries. The net effect: same
emerald-on-stone palette and Manrope/Inter pairing, now with cohesive
scroll-linked depth and a richer icon language.

Critical pre-work Agent 2 MUST do first (these are currently broken vs. the
design system, and every other change depends on them):
- **Fonts**: `app/layout.tsx` loads ONLY Inter. `DESIGN_SYSTEM.md` §3 mandates
  Manrope (display) + Inter (body) exposed as `--font-display` / `--font-body`.
  Those CSS vars do not exist yet, so components that say
  `fontFamily: "var(--font-display, Outfit)"` silently fall back to **Outfit**,
  which is never loaded -> browser default. Wire Manrope/Inter + the vars.
- **Inline hex**: `landing-client.tsx` and `header.tsx` hardcode `#10b981`,
  `#0c0a09`, `#f59e0b` and gradient hexes in JSX — a §9.2 anti-pattern. Swap to
  tokens as part of the redesign.

---

## B. Scroll-animation plan (motion `useScroll` / `useTransform`)

All recipes import from `motion/react` (NOT `framer-motion`). Pattern: create a
`ref`, scope `useScroll` to it with an `offset`, map progress with
`useTransform`, bind to `<motion.div style={{ ... }}>`.

### Reduced-motion gate (build ONCE, reuse everywhere)

`useScroll` itself is cheap, but the *visible* transform must collapse to a
static value under reduced motion. Add a tiny hook so every recipe below can
gate identically:

```tsx
// lib/use-reduced-motion-pref.ts  (NEW — Agent 2 creates)
"use client";
import { useReducedMotion } from "motion/react"; // motion ships this
export { useReducedMotion };
// usage: const reduce = useReducedMotion();  // boolean | null
```

Rule: when `reduce` is true, pass a CONSTANT to `useTransform` output (e.g. map
`[0,1] -> [0,0]`) or skip binding the style. Never animate.

### B.1 Hero parallax (landing `/`, `components/landing-client.tsx` right column + ambient blobs)

The floating order card and the three ambient blobs should drift at different
speeds as the user scrolls out of the hero — depth via parallax.

```tsx
"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

function HeroParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"], // 0 at top, 1 when hero leaves
  });
  // card rises gently + fades; blobs move further (back plane drifts more)
  const cardY  = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -80]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.8], reduce ? [1, 1] : [1, 0.4]);
  const blobY  = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 140]);
  return (
    <div ref={ref}>
      <motion.div style={{ y: blobY }}>{/* ambient blobs */}</motion.div>
      <motion.div style={{ y: cardY, opacity: cardOpacity }}>{children}</motion.div>
    </div>
  );
}
```

Reduced-motion fallback: `reduce` forces every range to `[0,0]`/`[1,1]` — the
card and blobs stay put, fully opaque.

### B.2 Section reveals (landing "How it works" + "Categories"; supplier `AnalyticsDashboard.tsx` cards)

Replace bespoke `ScrollReveal` usage on marketing surfaces with motion
`whileInView` + stagger. Keep it declarative; respect reduced motion by reading
the pref and passing a no-op variant.

```tsx
const reduce = useReducedMotion();
const item = {
  hidden:  { opacity: 0, y: reduce ? 0 : 28, scale: reduce ? 1 : 0.98 },
  visible: { opacity: 1, y: 0, scale: 1,
             transition: { duration: 0.6, ease: [0.215, 0.61, 0.355, 1] } }, // ease-spring
};
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.3 }}
  transition={{ staggerChildren: reduce ? 0 : 0.1 }} // 80-120ms per §5.3
>
  {steps.map((s) => <motion.div key={s.id} variants={item}>{/* card */}</motion.div>)}
</motion.div>
```

Reduced-motion fallback: `y`/`scale` deltas become 0; `staggerChildren` -> 0, so
everything appears at once with no transform.

NOTE: `components/scroll-reveal.tsx` and `components/reveal.tsx` are used widely
across dashboard/admin surfaces — do NOT delete them (the
`@media (prefers-reduced-motion)` block already neutralizes `.reveal`). Only
swap to motion on the marketing surfaces named above, to keep the diff bounded.

### B.3 Scroll-scrubbed element — reading-progress + hero scroll cue

A single scrubbed element ties UI to scroll position (the "scrub timeline" idiom
from anime.js onScroll, done in motion). Put a 2px emerald progress bar under the
header that scrubs page scroll, and convert the existing hero scroll cue
(`landing-client.tsx` bottom indicator) to fade out on scrub.

```tsx
// components/scroll-progress.tsx (NEW). Mount once in app/layout.tsx under <Header/>.
"use client";
import { motion, useScroll, useReducedMotion } from "motion/react";
export function ScrollProgress() {
  const { scrollYProgress } = useScroll(); // whole-page progress, 0..1
  const reduce = useReducedMotion();
  if (reduce) return null; // a scrub bar is pure decoration; drop it entirely
  return (
    <motion.div
      aria-hidden
      style={{ scaleX: scrollYProgress, transformOrigin: "0%" }}
      className="fixed left-0 right-0 top-16 z-40 h-0.5"
      // token, not hex:
      // backgroundColor via inline style: var(--accent)
    />
  );
}
```

`scaleX: scrollYProgress` binds the motion value directly — the cheapest scrub
there is (no `useTransform` needed). Reduced-motion fallback: return `null`.

For smoother scrub on heavier elements, wrap progress in a spring:
`const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });`
and bind `smooth` instead — but only when NOT reduced.

---

## C. Icon plan

### Decision: keep `lucide-react` as the workhorse; add `iconsax-react` ONLY for marketing/hero accent icons.

Rationale:
- lucide-react is already a dependency and is used across 12 Xarid component
  files (header, basket, orders, supplier shell, analytics, catalog). Ripping it
  out is a huge, risky diff for no functional gain.
- Iconsax's value is the **bulk/two-tone weight** — a filled-plus-tinted look
  that reads as "premium product brand," which lucide's uniform stroke cannot
  match. We want that look on a *handful* of high-visibility marketing/status
  spots (hero stat chips, "how it works" step icons, supplier analytics tile
  icons), not on every chrome button.
- Package: **`iconsax-react`** (npm `iconsax-react`). Supports `variant` prop:
  `Linear | Bold | Bulk | Broken | TwoTone | Outline`, plus `size`, `color`.
  Tree-shakeable named imports. (Alternatives `iconsax-reactjs` and
  `react-iconsax-icons` exist and are equivalent; pick `iconsax-react` for the
  cleanest import names. If React 19 peer-dep warns, `react-iconsax-icons` is
  the React-19-clean fallback.)
- Usage: `import { Box, TruckFast } from "iconsax-react";` then
  `<Box variant="Bulk" size={20} color="currentColor" />`. Use
  `color="currentColor"` so our `text-*` token classes still drive the color —
  NEVER pass a hex.

If Agent 2 prefers ZERO new deps, the fallback is: keep lucide everywhere and
fake the two-tone look by stacking a filled token-tinted background circle behind
a lucide glyph (the `StatTile` icon chip already does this:
`bg color-mix(... 14%) + icon at full tone`). That covers ~80% of the visual
upgrade. Recommend adding `iconsax-react` only if the marketing surfaces get the
"designed brand" lift the owner wants; otherwise skip it (source 2 is a
nice-to-have, not load-bearing).

### Icon mapping table (current lucide -> proposed iconsax Bulk, by surface)

| Surface / file | Current (lucide) | Proposed (iconsax, variant="Bulk") | Notes |
|---|---|---|---|
| Hero stat chips — `landing-client.tsx` | `Clock`, `Truck`, `Package`, `Coins` | `Clock`, `TruckFast`, `Box`, `MoneyRecive` | Bulk weight; `color="currentColor"` keeps token color |
| How-it-works steps — `landing-client.tsx` | emoji 🕙🌙🚚 | `Clock`, `Moon`, `TruckFast` | replace emoji with real two-tone icons for polish |
| Header logo accents — `header.tsx` | `Store`, `ShoppingBasket`, `Receipt` | keep lucide (chrome) OR `Shop`, `ShoppingCart`, `ReceiptText` | nav chrome can stay lucide; low priority |
| Supplier analytics tiles — `AnalyticsDashboard.tsx` | `Coins`, `Package`, `Trophy`, `Users` | `MoneyRecive`, `Box`, `Cup`, `Profile2User` | tiles are the showcase surface — upgrade here |
| Catalog card add/qty — `product-card-immersive.tsx` | `Plus`, `Minus` | keep lucide | tiny control glyphs; stroke look is correct here |
| Xarid Go tracking — `tracking-client.tsx` | `☎` glyph, dot | `Call`, status icons | replace the literal `☎` char with `<Call variant="Bulk"/>` |
| Orders status — `orders-client.tsx` | `CheckCircle`,`Truck`,`PackageCheck`,`XCircle` | keep lucide | status semantics already solid |

Keep `color="currentColor"` on every iconsax usage; drive color via existing
`text-accent` / `text-text-secondary` / status-token classes.

---

## D. Component upgrades (4-6 patterns adapted from 21st.dev)

Each: (i) where in Xarid, (ii) token/motion build sketch, (iii) mobile behavior.
None copy proprietary code — all rebuilt on our tokens + motion.

### D.1 Bento grid — "How Xarid works"

- **(i) Where**: `landing-client.tsx` "How it works" section (currently 3 equal
  `md:grid-cols-3` cards). Promote to an asymmetric bento: one tall feature cell
  (the consolidated-delivery promise) + smaller supporting cells.
- **(ii) Build**: `grid grid-cols-2 md:grid-cols-4 auto-rows-[minmax(0,1fr)]
  gap-4`. Feature cell `md:col-span-2 md:row-span-2`. Each cell = `glass-card
  rounded-3xl` + `scene-perspective` wrapper + `TiltCard`. Reveal via B.2
  stagger. Numbers/labels at `depth-1`. Accent the feature cell border with
  `var(--glass-hover-border)`.
- **(iii) Mobile**: collapse to `grid-cols-2`; feature cell becomes full-width
  `col-span-2`; tilt disabled on touch (TiltCard already early-returns on
  non-mouse pointers). Verify at 360px.

### D.2 Supplier logo / trust marquee

- **(i) Where**: new strip on landing `/` between hero and "How it works"
  ("Trusted by Tashkent kitchens" + scrolling supplier names). Reuses the
  supplier names already in seed data.
- **(ii) Build**: horizontal track of `glass-card` pills, duplicated x2 for
  seamless loop. Animate with motion:
  `animate={{ x: ["0%", "-50%"] }} transition={{ duration: 30, repeat:
  Infinity, ease: "linear" }}`. Pause on hover via `whileHover={{ }}` + a
  paused variant, or `[animation-play-state]`. Mask edges with a CSS
  `mask-image` linear-gradient so pills fade at the rim.
- **(iii) Mobile**: same loop, faster (`duration: 20`). Reduced-motion: render a
  static wrapped flex row of pills (no x animation). Gate with `useReducedMotion`.

### D.3 Spotlight / glow card (pointer-follow radial)

- **(i) Where**: supplier `AnalyticsDashboard.tsx` chart cards
  (`RevenueLineChart`, `ProductPieChart` wrappers) and the catalog
  `ImmersiveProductCard`. A radial accent glow tracks the cursor.
- **(ii) Build**: on `glass-card`, a child `::before`/absolute div with
  `background: radial-gradient(circle at var(--mx) var(--my), var(--accent-glow),
  transparent 40%)`. Update `--mx/--my` from `onPointerMove` (mouse only).
  Pairs with existing tilt. New tokens NOT required — reuse `--accent-glow`.
  Reduced-motion: skip the pointer listener; static faint glow at center.
- **(iii) Mobile**: no pointer -> glow stays centered/off. Tap still works.

### D.4 Animated segmented tabs (shared layout indicator)

- **(i) Where**: the period toggle promised in `DESIGN_SYSTEM.md`
  (SegmentedControl: day/week/month for analytics; uz/ru/en in
  `language-switcher.tsx`). Currently analytics shows a static "30d" pill.
- **(ii) Build**: row of buttons; the active pill is a single
  `<motion.div layoutId="seg-active">` that slides between options via shared
  layout animation: `transition={{ type: "spring", stiffness: 400, damping:
  32 }}`. Active fill `var(--accent)`, text `var(--bg-primary)`. Track =
  `glass-card` pill row.
- **(iii) Mobile**: full-width, equal-flex segments; min 40px tap height.
  Reduced-motion: motion auto-respects via `MotionConfig`; also gate the spring
  to an instant transition when `reduce`.

### D.5 Animated number / stat counter

- **(i) Where**: `StatTile.tsx` values + landing hero stats. Numbers count up
  when scrolled into view.
- **(ii) Build**: motion `useSpring` + `useTransform` on a numeric motion value,
  started in a `whileInView` callback (or `animate(count, target)`). Render with
  `tabular-nums` + `font-display` (already the StatTile convention). Keep
  `uzs()` formatting by formatting the rounded latest value.
- **(iii) Mobile**: identical. Reduced-motion: render the final value
  immediately, no count animation (check `useReducedMotion`).

### D.6 (optional) Animated gradient/aurora hero background

- **(i) Where**: behind landing hero, replacing the three hand-animated blob
  `motion.div`s with a single token-driven aurora layer.
- **(ii) Build**: 2-3 absolutely-positioned `blur-3xl` blobs using `--accent`,
  `--accent-2-glow`, `--accent-3-glow` (NOT the current inline
  `rgba(124,58,237,..)` purple, which is off-palette). Keep motion drift but cut
  to one wrapper. Reduced-motion: blobs static (the `.blob` class already
  disables `blob-drift` under the media query — reuse `.blob` instead of inline
  motion).
- **(iii) Mobile**: reduce blob count to 2; smaller radii to limit overdraw in
  the Telegram webview.

---

## E. Micro-interactions (motion springs + glow utilities)

Standardize on these spring presets (add as a shared const, not per-component):

```tsx
// lib/motion-presets.ts (NEW)
export const springSnappy = { type: "spring", stiffness: 400, damping: 30 };
export const springSoft   = { type: "spring", stiffness: 200, damping: 26 };
export const easeGlide     = [0.25, 0.8, 0.25, 1] as const;   // --ease-glide
export const easeSpring    = [0.215, 0.61, 0.355, 1] as const; // --ease-spring
```

| Element | Interaction | Recipe |
|---|---|---|
| Primary CTA / `glow-button` | hover/tap | `whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}` + existing `.glow-button` sheen; box-shadow via `--shadow-glow-accent` (NOT inline rgba) |
| Catalog card | hover | already tilts; add `whileHover` glow via `--accent-glow` halo; keep `≤8°` tilt (§5.3) |
| Add-to-basket | tap | `whileTap={{ scale: 0.93 }}` + brief `springSnappy` pop on the qty number |
| Nav tab (header) | active switch | shared-layout `layoutId` pill (D.4) instead of per-tab `boxShadow` |
| Segmented control | switch | `springSnappy` sliding indicator |
| Focus states | keyboard | `.glass-input:focus` already glows; add `focus-visible:ring-2 ring-[color:var(--accent)]` to buttons/links for a11y |
| Basket bottom bar | mount | already `initial/animate/exit`; add `springSoft` for the slide-in |

Hard gate: wrap interactive trees in `<MotionConfig reducedMotion="user">`
(motion respects OS pref) OR check `useReducedMotion()` and drop
`whileHover`/`whileTap` scale. Focus rings must remain in reduced motion.

---

## F. Concrete change list for Agent 2 (ordered, file-by-file)

Do these in order. Build after each cluster: `NODE_ENV=production npx next build`.

**1. `app/globals.css`** (ONLY the globals.css-owning agent edits this — if that
is not Agent 2, hand these tokens to that agent):
- Add `@theme` font vars per `DESIGN_SYSTEM.md` §3.2:
  `--font-body: var(--font-body-src), "Inter", system-ui, sans-serif;`
  `--font-display: var(--font-display-src), "Manrope", "Inter", system-ui, sans-serif;`
- (No new color tokens needed — D.1–D.6 reuse `--accent`, `--accent-glow`,
  `--accent-2-glow`, `--accent-3-glow`, `--glass-hover-border`, shadow + glow
  tokens that already exist.) If a marquee mask needs it, add
  `--marquee-fade: 48px;` to both `:root` and `html.light`.
- If adding a scrub-bar utility class, register it AND add it to the
  `@media (prefers-reduced-motion: reduce)` block in the same edit (§5.4).

**2. `app/layout.tsx`**:
- Import `{ Inter, Manrope } from "next/font/google"`; create both with
  `variable: "--font-body-src"` / `"--font-display-src"` (Manrope weights
  600/700/800, subsets latin+cyrillic). Put both `.variable` classes on
  `<body>`. (See `DESIGN_SYSTEM.md` §3.2 — adjust var names to match #1.)
- Mount `<ScrollProgress />` (B.3) right after `<Header />`.
- Optionally wrap children in `<MotionConfig reducedMotion="user">`.

**3. NEW files**:
- `lib/use-reduced-motion-pref.ts` (re-export, B intro).
- `lib/motion-presets.ts` (E).
- `components/scroll-progress.tsx` (B.3).
- `components/customer/supplier-marquee.tsx` (D.2).
- `components/ui/segmented-control.tsx` (D.4) — fulfills DESIGN_SYSTEM §7.2.
- `components/ui/animated-number.tsx` (D.5).
- `components/ui/spotlight-card.tsx` (D.3) — wrapper that adds the pointer glow.

**4. `components/landing-client.tsx`** (biggest change):
- Replace the local `T = {...}` hardcoded strings with `t(locale, key)` (move
  copy into `lib/i18n.ts`, all 3 locales). See section H for keys.
- Remove inline hex (`#10b981`, `#0c0a09`, `#f59e0b`, the purple blob, gradient
  text hexes) -> tokens (`var(--accent)`, `var(--bg-primary)`, `var(--accent-2)`;
  gradient text via `--accent` -> `--accent-2`).
- Swap `fontFamily: "Outfit"` / `"JetBrains Mono"` inline styles for
  `font-display` / `tabular-nums` + `font-display` (now that fonts load).
- Wrap hero right column in `HeroParallax` (B.1); blobs -> aurora (D.6) using
  `.blob` classes so reduced-motion is automatic.
- Convert "How it works" to the bento grid (D.1); step emoji -> iconsax Bulk
  icons (C) OR keep emoji if skipping the package.
- Insert `<SupplierMarquee />` (D.2) between hero and how-it-works.
- Hero stat chips: iconsax Bulk icons + `<AnimatedNumber/>` where numeric.

**5. `components/header.tsx`**:
- Remove inline hex (`#10b981`, `#0c0a09`, `#f59e0b`, logo gradient) -> tokens.
- Replace per-tab active `boxShadow`/`background` with a shared-layout
  `layoutId="nav-active"` motion pill (D.4 idiom). Active fill `var(--accent)`,
  text `var(--bg-primary)`.
- `fontFamily: "Outfit"` -> `font-display`. Keep lucide nav icons (chrome).

**6. `components/footer.tsx`**:
- Low touch. Apply `font-display` to the wordmark; ensure the emerald "X" badge
  uses `var(--accent)` (it uses `bg-emerald-500` Tailwind — acceptable, but
  prefer `bg-[color:var(--accent)]` for token consistency). Optional: add a
  three-column link layout (about / suppliers / contact) as a `glass-card` strip
  if the owner wants a fuller footer; otherwise leave as-is.

**7. `components/hero-3d.tsx`** (EDIT IN PLACE — never replace, §9.8):
- This is the alt CSS-3D hero (orbit rings + satellite tiles). If landing adopts
  it, leave the CSS-3D structure intact; only (a) confirm `aria-hidden` stays,
  (b) ensure the literal `☎`/emoji tiles use loaded fonts, (c) gate any added
  motion. Do NOT convert its tilt to motion — the CSS-3D version is intentional
  for the Telegram webview (DESIGN_SYSTEM §6.1).

**8. Catalog card — `components/customer/product-card-immersive.tsx`**:
- Wrap in / compose with `SpotlightCard` (D.3) for the pointer glow (keep the
  existing tilt — they layer).
- Price number -> `<AnimatedNumber/>` is optional (cards are dense; maybe skip).
- Keep lucide `Plus`/`Minus`. Confirm reduced-motion path leaves tilt+glow off.

**9. Supplier analytics — `components/supplier/AnalyticsDashboard.tsx` + `StatTile.tsx`**:
- Stat tile icons -> iconsax Bulk (C). Tile values -> `<AnimatedNumber/>` (D.5).
- Replace the static "30d" pill with `<SegmentedControl/>` (D.4) (day/week/month
  — wire to existing data range if available, else visual-only with a TODO).
- Wrap chart cards in `SpotlightCard` (D.3).

**10. Xarid Go tracking — `components/logistics/tracking-client.tsx`**:
- Replace the literal `☎` char with an iconsax `Call` (Bulk) or lucide `Phone`.
- The "searching driver" pulsing dot already uses `.float-c` (reduced-motion
  safe). Optionally drive the ETA pill update with a `springSoft` number tween.
- Do NOT add scroll parallax here (full-screen map sheet — §5.3 forbids parallax
  in data/utility surfaces).

**Verification per cluster**: build green; toggle `<html class="light">` (§9.5);
test at 360px iPhone-SE width (§9.10); set OS reduce-motion and confirm no
transform animates (§5.4); grep new files for raw hex and untranslated strings
(§8.2).

---

## G. New dependencies

Keep minimal. Net new (only if marketing icon upgrade is approved):

| Package | Why | Skippable? |
|---|---|---|
| `iconsax-react` | Two-tone/Bulk icon weight for marketing + analytics surfaces (source 2). `color="currentColor"` so tokens still drive color. | YES — fall back to lucide + token-tinted chip backgrounds (C). |

Explicitly NOT added:
- `animejs` — motion `useScroll`/`useTransform` covers every onScroll effect we
  need; `DESIGN_SYSTEM.md` §9.9 bans mixing animation libs.
- Any new motion lib — `motion@12` is already installed and is the single engine.
- 21st.dev components are *adapted*, not installed (they're shadcn-registry
  snippets; we rebuild on our tokens to avoid Radix/style drift).

---

## H. New i18n keys Agent 2 will add (names only; add to uz/ru/en in `lib/i18n.ts`)

These replace the hardcoded `T` object in `landing-client.tsx` plus new copy for
the marquee / segmented control / analytics range. Follow the existing flat
snake_case convention; add to ALL THREE locale dicts in the same edit (§8).

Landing (migrate existing `T` -> keys; some already exist as `hero_*`/`step*_*`):
- `landing_badge`
- `landing_h1_pre`, `landing_h1_accent`
- `landing_sub`
- `landing_cta_catalog`, `landing_cta_orders`
- `landing_how_title`
- `landing_step1_title`, `landing_step1_desc`
- `landing_step2_title`, `landing_step2_desc`
- `landing_step3_title`, `landing_step3_desc`
- `landing_categories_title`
- `landing_step_prefix` (renders "Qadam {n}" / "Шаг {n}" / "Step {n}")
- hero stat labels: `landing_stat_deadline`, `landing_stat_window`,
  `landing_stat_basket`, `landing_stat_delivery_cost`

Supplier marquee (D.2):
- `marquee_trusted_title`  (e.g. "Toshkent oshxonalari ishonadi")

Segmented control / analytics range (D.4):
- `range_day`, `range_week`, `range_month`

Animated number / a11y (D.5, D.3):
- (none required if values are pure numbers; reuse existing labels.)
- `scroll_progress_aria` (aria-label for the progress bar, optional)

NOTE: before USING any key, verify it exists in uz AND ru AND en. Several
landing strings already exist (`hero_title_pre`, `hero_title_accent`,
`how_title`, `step1_title`...). Prefer reusing those exact keys over inventing
parallel `landing_*` ones where the copy matches — check `lib/i18n.ts` first and
only add what is genuinely new.

---

## Appendix — source confirmations

- **motion** `useScroll({ target, offset })`, `useTransform`, `useSpring`,
  `whileInView`, `viewport`, `useReducedMotion` — all import from `motion/react`
  (the React 19 / motion@12 entrypoint). Verified against motion.dev docs.
- **iconsax-react** — npm `iconsax-react`; 1000+ icons x 6 variants
  (Linear/Bold/Bulk/Broken/TwoTone/Outline); props `variant`, `size`, `color`;
  tree-shakeable named imports. (`iconsax-reactjs` / `react-iconsax-icons` are
  equivalent fallbacks; `react-iconsax-icons` is the React-19-clean option.)
- **anime.js v4** — `npm i animejs`, ESM, ScrollObserver/`onScroll` with
  enter/leave thresholds + sync modes. Capable but redundant given motion; not
  adopted.
- **21st.dev** — community shadcn/Tailwind registry; categories include Heroes,
  Features, Backgrounds, Cards, Tabs, Testimonials, Text Animations, Shaders.
  Patterns adapted (not copied): bento grid, marquee, spotlight/glow card,
  animated segmented tabs, animated counter, aurora background.

---

## Applied changelog (Agent 2)

Executed section F against the live surfaces. Build verified green
(`NODE_ENV=production npx next build` -> exit 0; `tsc --noEmit` -> 0 errors).

Design rationale cross-checked against ui-ux-pro-max datasets:
- styles.csv #39 **Bento Box Grid** (varied spans, rounded-3xl, hover scale,
  responsive 4->2->1) -> the "How Xarid works" feature grid.
- styles.csv #20 **Hero-Centric** + #15 **Motion-Driven** (scroll reveal,
  parallax, `prefers-reduced-motion` respected) -> hero parallax + section
  reveals.
- ux-guidelines #7 **Excessive Motion** ("animate 1-2 key elements per view
  max"), #9 **Reduced Motion**, #13 **Transform Performance** (animate only
  transform/opacity), #22 **Touch Target 44px** -> every motion recipe is gated
  and the segmented control uses min-h-10 (40px) flex segments.
- products.csv #1 SaaS / #5 B2B Service ("Trust blue + accent contrast",
  "balance modern feel with clarity, focus on CTAs") -> kept emerald CTA primacy,
  sky/amber as secondary accents only.

What changed, file by file:
- **app/globals.css** (owned): wired `--font-body`/`--font-display` (Inter +
  Manrope via Google Fonts `@import`, latin+cyrillic), `.font-display`/`.font-body`
  utilities, body now uses `var(--font-body)`. Added `--marquee-fade` token (both
  themes) and utilities `.scroll-progress-bar`, `.marquee-mask` + `marquee-scroll`
  keyframe + `.marquee-track`, `.spotlight-card` (+ `::before` glow), `.aurora-*`.
  Registered `.marquee-track` and the spotlight reduced-motion collapse in the
  existing `@media (prefers-reduced-motion)` block.
- **NEW** lib/use-reduced-motion-pref.ts, lib/motion-presets.ts.
- **NEW** components/scroll-progress.tsx (B.3 scrubbed bar; returns null under
  reduced motion).
- **NEW** components/landing/{supplier-marquee,spotlight-card,segmented-control,
  animated-number}.tsx (D.2-D.5).
- **components/landing-client.tsx**: migrated the hardcoded `T` object to
  `t(locale, ...)` (new `landing_*` i18n namespace in all 3 locales); removed all
  inline hex (`#10b981`, `#0c0a09`, `#f59e0b`, off-palette purple blob, gradient
  hexes) -> tokens; `Outfit`/`JetBrains Mono` inline fonts -> `font-display` +
  `tabular-nums`; hero right column wrapped in B.1 `useScroll` parallax (card rises
  + fades, blobs drift); ambient blobs -> `.blob` aurora (auto reduced-motion);
  "How it works" -> D.1 bento (feature cell `md:col-span-2 md:row-span-2` with
  spotlight glow + D.4 segmented range demo + D.5 counter); D.2 marquee inserted
  between hero and how-it-works; hero stats use token-tinted icon chips + D.5
  counters; localized `sum` currency.
- **components/header.tsx**: inline hex -> tokens; per-tab active background
  replaced with a shared-layout `layoutId="nav-active"` motion pill; `Outfit` ->
  `font-display`; added `focus-visible` rings; basket badge uses `--accent-2`.
- **components/footer.tsx**: wordmark + X badge -> `font-display` + `var(--accent)`.

Deviations from the brief:
- **iconsax-react NOT added.** Section C marked it skippable; since the verify
  phase installs deps and a `0.0.x` package could not be locally build-verified,
  the no-dep lucide fallback (token-tinted icon chips for the two-tone feel) was
  used instead to guarantee build-ability. lucide is already a dependency. No new
  deps were added; package.json dependency list is unchanged.
- **hero-3d.tsx / catalog / supplier analytics / tracking** untouched: landing
  uses `LandingClient` (not `Hero3D`), and the catalog/customer/supplier/logistics
  component files referenced in section F do not exist in this codebase snapshot,
  so there was nothing to polish there.

Deferred to integrator (app/layout.tsx is out of Agent 2's scope):
- `<ScrollProgress locale={locale} />` is currently mounted inside
  `LandingClient` so it is live on `/`. To show it site-wide, mount it once in
  app/layout.tsx right after `<Header />` and remove it from LandingClient.
- Fonts load via `@import` in globals.css (works today). If the integrator
  prefers `next/font` (self-hosted, no layout shift), add
  `import { Inter, Manrope } from "next/font/google"` in app/layout.tsx with
  `variable: "--font-body"` / `"--font-display"`, put both `.variable` classes on
  `<body>`, and delete the `@import` line from globals.css.
