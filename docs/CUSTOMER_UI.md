# Xarid Customer Surface — UI Plan (Agent 3)

> Concrete implementation plan for the Customer (BUYER) account surfaces:
> `/catalog`, `/basket`, `/orders`. Builds on top of the canonical
> `docs/DESIGN_SYSTEM.md` (Agent 1) and `docs/ACCOUNTS.md` (Agent 2). Do not
> re-derive palette, typography, or routing here — only consume them.

The Customer is the restaurant / cafe / chaikhana / market owner. They open
the app at 22:00, pick tomorrow's inventory in three minutes, and expect the
truck before 10:00. Every visible string lives in `lib/i18n.ts` under the
three locale blocks (uz, ru, en).

---

## 1. Information architecture

The buyer touches exactly three pages plus a public landing. Each page is
small, single-purpose, and finishes the buyer's job before the next step.

```
/                ← public landing (Agent 1 surface, untouched here)
/auth            ← sign-in / sign-up (Agent 2)
/auth/role       ← role picker (Agent 2)
/catalog         ← browse + add to basket           ← (Agent 3)
/basket          ← review + checkout                 ← (Agent 3)
/orders          ← order history + reorder          ← (Agent 3)
/orders/[id]     ← (deferred — see §7) live tracking lives in Agent 5's surface
```

Per Agent 2's plan, the long-term layout uses route groups:

```
app/(customer)/(public)/catalog/page.tsx   ← anonymous-readable
app/(customer)/(private)/basket/page.tsx   ← requireBuyer() in inner layout
app/(customer)/(private)/orders/page.tsx   ← requireBuyer() in inner layout
```

Agent 3 does NOT execute that move in this pass — see "Deferred" below. The
current `app/catalog`, `app/basket`, `app/orders` continue to work, and the
visual refinements done here transfer 1:1 once the folder move lands.

### Page-level intent

| Page       | Goal in one sentence                                                  |
|------------|-----------------------------------------------------------------------|
| `/catalog` | Find tomorrow's ingredients faster than scrolling Telegram channels.  |
| `/basket`  | Confirm the full order across multiple suppliers, in one transaction. |
| `/orders`  | See yesterday's order status; rebuild tomorrow's basket in one tap.   |

---

## 2. Component checklist (Customer scope)

Reuses the design-system catalog from `DESIGN_SYSTEM.md §7`. New components
live in `components/customer/*` so they don't pollute the global namespace
shared with Supplier and Driver surfaces.

| Component                              | Path                                              | Source       | Status         |
|----------------------------------------|---------------------------------------------------|--------------|----------------|
| `ImmersiveProductCard`                 | `components/customer/product-card-immersive.tsx`  | new (this PR)| implemented    |
| `CategoryStrip` (with subtle parallax) | `components/customer/category-strip.tsx`          | new (this PR)| implemented    |
| `CatalogClient` (refined)              | `components/catalog-client.tsx`                   | existing     | refined        |
| `BasketClient` (i18n-cleaned)          | `components/basket-client.tsx`                    | existing     | refined        |
| `OrdersClient` (i18n-cleaned)          | `components/orders-client.tsx`                    | existing     | refined        |
| `QtyInput`                             | `components/qty-input.tsx`                        | existing     | localized      |
| `ReorderButton`                        | `components/reorder-button.tsx`                   | existing     | keep           |
| `OrderTimeline` (customer-side)        | `components/customer/order-timeline.tsx`          | new          | deferred (§7)  |
| `BasketSummaryCard` (immersive depth-2)| inline inside `BasketClient`                      | inline       | inline-applied |

### What "immersive" means here, concretely

1. **`ImmersiveProductCard`** wraps content in `scene-perspective` and uses a
   pointer-driven CSS-3D tilt (≤ 8° per design system §5.3). The thumbnail
   + name layer rests; the price/CTA layer lifts to ~`depth-1` (≈ 35px
   translateZ) on hover. Resting shadow is `var(--shadow-md)`; hovered shadow
   is `var(--shadow-lg)` + `var(--accent-glow)`. Touch devices get a flat
   card (the `pointerType !== "mouse"` guard skips the tilt). Reduced motion
   is honoured because the keyframe-bound floats/blobs that already exist in
   `globals.css` are not used here — only `transition` which is fine.
2. **`CategoryStrip`** translates ±6px on scroll. It's a parallax in spirit,
   not a `position: sticky` reparent — that keeps hit-areas reliable for
   touch. The component reads `prefers-reduced-motion` via `matchMedia` and
   disables the translation entirely if reduced.

---

## 3. 3D / immersion patterns lifted from Agent 1's design system

Mapping each design-system idiom (DS §6) to a specific customer surface:

| DS idiom                                 | Where it applies in Customer                                  |
|------------------------------------------|---------------------------------------------------------------|
| `scene-perspective` parent + `depth-*`   | Each `ImmersiveProductCard`. Basket summary on `lg:` viewport.|
| `tilt-card` ≤ 8° tilt                    | `ImmersiveProductCard` pointer tilt; basket summary on hover. |
| `--shadow-md` resting / `-lg` hovered    | All product cards, basket supplier groups, order accordion.   |
| `--accent-glow` halo                     | "Add to basket" button, floating basket bar, "Place order".   |
| `font-display` + `tabular-nums`          | All prices, quantities, totals on every customer surface.     |
| `glass-card` + glass-input               | Search input, all form fields, basket supplier panels.        |
| `glow-status-*` set                      | Order status pills (PLACED → DELIVERED → CANCELLED).          |
| Ambient blob behind content (`depth-neg-1`) | Catalog page background tint, basket page hero blob.       |
| `prefers-reduced-motion` discipline      | `CategoryStrip` parallax disabled; tilt remains as transition.|

What we deliberately do NOT do on customer surfaces:

- **No real WebGL.** Per design system §6.1, real 3D is reserved for the hero
  + logistics map. The catalog never instantiates Three.js.
- **No `ring-spin` halos on product cards.** They were a marketing motif and
  break focus on dense grids.
- **No `float-a/b/c` floats on the basket totals.** Numbers must not move.
  Floats are reserved for the marketing hero and the role picker.

---

## 4. Per-screen wireframe-in-prose

### 4.1 `/catalog`

```
┌──────────────────────────────────────────────────────────────┐
│  [search input | placeholder: t("search_placeholder")    ]    │ ← glass-input
│                                                              │
│  ▼ Category Strip (CategoryStrip — parallax ±6px on scroll)   │
│  [All][Vegetables][Meat][Dairy][Dry goods][Beverages]…       │ ← active pill
│                                                                 has --accent
│                                                                 fill + halo
│                                                              │
│  ▼ Product Grid (1col / 2col sm / 3col lg)                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ 🥩 Mol go'shti│ │ 🥬 Pomidor   │ │ 🥛 Sut 3.2%  │           │ ← Immersive
│  │ Halol Meat    │ │ Yashil Bog'  │ │ Sof Sut LLC  │           │   ProductCard
│  │ best of 3 offer│ │              │ │              │           │   (tilt + lift
│  │  68 000 sum/kg│ │  9 500 sum/kg│ │ 14 000 sum/L │ ← tabular │   on hover)
│  │  [+ Add]      │ │  [+ Add]     │ │  [+ Add]     │   nums    │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                              │
│  (… more rows; the page never overflows horizontally)         │
└──────────────────────────────────────────────────────────────┘
                                            ┌────────────────────────────┐
                                            │ 🛒 Basket · 7 items 412k sum│ ← floating CTA
                                            └────────────────────────────┘   appears when
                                                                              count > 0
```

Empty-state copy:

- Title — `t(locale, "catalog_empty_search")` ("No products found")
- Hint — `t(locale, "catalog_empty_search_hint")` ("Shorten the query…")

### 4.2 `/basket`

```
┌──────────────────────────────────────────────────────────────┐
│ Basket                                                       │ ← font-display
│                                                              │
│ ┌──────────────────────────────────────┐ ┌────────────────┐  │
│ │ ● Halol Meat   [3 items]             │ │ Checkout       │  │
│ ├──────────────────────────────────────┤ │                │  │
│ │ 🥩 Mol go'shti  68 000/kg  [- 5kg +] │ │ Items   (7) ⃥… │  │
│ │                              340 000 │ │ Delivery   Free│  │
│ │ 🐔 Tovuq filesi 42 000/kg  [- 3kg +] │ │ ──────────────│  │
│ │                              126 000 │ │ Total   412 000│  │
│ ├──────────────────────────────────────┤ │                │  │
│                                                                  │
│ │ ● Yashil Bog'  [4 items]             │ │ Org name __    │  │
│ │ ...                                  │ │ Phone   __     │  │
│ └──────────────────────────────────────┘ │ Address __     │  │
│                                          │ ⓘ Cash or wire │  │
│                                          │ [Place order →]│  │ ← glow-button
│                                          └────────────────┘  │   --accent fill
│                                            sticky on lg      │   accent halo
└──────────────────────────────────────────────────────────────┘
```

Notes on the checkout column:

- Field labels: `basket_field_org`, `basket_field_phone`, `basket_field_address`.
- Placeholders: `ph_org`, `ph_phone`, `ph_address`.
- "Free" label uses `basket_delivery_free`.
- "Items" label uses `basket_items_label`.
- Supplier-group item-count label uses `basket_items_short` ("ta" / "поз." / "items").
- Empty-state copy: `basket_empty` + `basket_empty_hint`.
- The Info banner ("Cash on delivery") sits inside a glass card with
  `var(--status-warning-bg)` + `var(--status-warning)` text — amber to match
  the design system's "wait / partial / human attention" semantic.

### 4.3 `/orders`

```
┌──────────────────────────────────────────────────────────────┐
│ Orders                                                       │
│                                                              │
│ [✓] Order accepted! We'll deliver tomorrow 06:00–10:00.      │ ← success banner
│                                                                 with CheckCircle
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Order #ABC123                                            │ │ ← accordion
│ │ 14 March · Chilonzor, 7-tor                              │ │   click to expand
│ │                              [⏱ Placed]  ⌃               │ │   status pill
│ ├──────────────────────────────────────────────────────────┤ │   uses semantic
│ │ 🥩 Mol go'shti  Halol Meat · 5 kg          340 000       │ │   color
│ │ 🥬 Pomidor     Yashil Bog'  · 12 kg        114 000       │ │
│ │ …                                                        │ │
│ │ ──────────────────────────────────────────────────────   │ │
│ │ ⏰ Pay on delivery     412 000   [🔁 Reorder]            │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ (… older orders below)                                       │
└──────────────────────────────────────────────────────────────┘
```

Notes:

- The accordion uses `motion.div` with `height: auto` + `ease-snap` per
  DS §5.1.
- Status pill colour pulls from `STATUS_CONFIG` keyed by the order status
  string; the colour values come from `--status-*` tokens.
- The "Order #" prefix uses `order_number_prefix`.
- "Pay on delivery" uses `pay_on_delivery`.
- Reorder calls `/api/orders/:id/reorder?locale=…` (existing endpoint) and
  routes through `BasketProvider.setQty`.

---

## 5. i18n key additions (this PR)

All keys added to **uz, ru, AND en** (the dictionary in `lib/i18n.ts` now has
three blocks — `en` was introduced by Agent 5 and Agent 3 reuses it).

Customer-only:

- `catalog_empty_search`, `catalog_empty_search_hint`, `catalog_supplier_label`
- `qty_aria`
- `basket_empty_hint`, `basket_items_short`, `basket_checkout_title`,
  `basket_items_label`, `basket_delivery_free`, `basket_field_org`,
  `basket_field_phone`, `basket_field_address`
- `order_number_prefix`, `pay_on_delivery`

Coordinated with Agent 2 (role picker / signup — added here per the
orchestrator's "if Agent 2 already added them, do not duplicate" rule; at the
time of this PR Agent 2's role-picker keys were missing from `i18n.ts`, so
they are added here exactly as specified in `docs/ACCOUNTS.md §6`):

- `role_picker_title`, `role_picker_subtitle`
- `role_buyer_title`, `role_buyer_tagline`, `role_buyer_desc`
- `role_supplier_title`, `role_supplier_tagline`, `role_supplier_desc`
- `role_pick_cta`, `role_back`
- `signup_buyer_title`, `signup_supplier_title`
- `ph_company_name`, `ph_org_name`, `ph_about`
- `auth_signup_success`, `auth_wrong_surface`
- `signin_redirect_supplier`, `signin_redirect_buyer`

Strings removed from JSX (now resolved through `t()`):

- "Buyurtma rasmiylashtirish" / "Оформление заказа" → `basket_checkout_title`
- "Mahsulotlar" / "Товары" → `basket_items_label`
- "Bepul" / "Бесплатно" → `basket_delivery_free`
- "Tashkilot nomi" / "Название организации" → `basket_field_org`
- "Telefon raqami" / "Номер телефона" → `basket_field_phone`
- "Yetkazib berish manzili" / "Адрес доставки" → `basket_field_address`
- "Mahsulotlarni katalogdan qo'shing" / "Добавьте товары…" → `basket_empty_hint`
- "ta" / "поз." → `basket_items_short`
- "Buyurtma #" / "Заказ #" → `order_number_prefix`
- "Yetkazishda to'lov" / "Оплата при доставке" → `pay_on_delivery`
- `aria-label="Miqdor"` in `qty-input.tsx` → `t(locale, "qty_aria")` via a new
  optional `locale` prop (defaults to `uz`; the component currently has no
  call sites, so the prop is non-breaking).
- `app/orders/page.tsx` date formatting now maps `en → en-US` (it previously
  fell back to `uz-UZ`, rendering Uzbek month names to English users).

The `✅` and `→` characters in `order_placed_banner` / `go_catalog` were
moved out of the string. The checkmark is rendered as a `<CheckCircle/>`
icon next to the banner; the arrow is appended in JSX so the underlying
string reads naturally when an LLM-driven flow ever quotes it back.

---

## 6. Visible refinement landed in this PR (Catalog)

Per the orchestrator brief — one concrete, visible refinement to the catalog
that applies the immersive-3D direction:

1. **`ImmersiveProductCard`** — every product card on `/catalog` is now a
   tilt-card with two depth layers (`depth-1` for the name/thumbnail row,
   ~`depth-2` translateZ for the price/CTA row) and uses the design-system
   shadow tokens (`--shadow-md` resting, `--shadow-lg` + `--accent-glow`
   hovered). Inline hex colours are replaced with `var(--accent)`,
   `var(--bg-primary)`, `var(--status-success)`, etc. Touch devices stay
   flat (the pointer-tilt is gated by `pointerType === "mouse"`).
2. **`CategoryStrip`** — the category pill row now translates ±6px in
   response to page scroll. The strip respects `prefers-reduced-motion`
   (matchMedia check, falls back to a flat strip).
3. **`CatalogClient`** — extracted both components, removed every inline hex
   from the catalog (search input, basket-bar CTA, floating-bar shadow) in
   favour of CSS tokens. Search input switched to the shared `glass-input`
   class.

These three changes together produce a visible, measurable difference: the
catalog now has tactile depth on every card hover, and the category strip
shifts gently as the buyer scrolls — exactly the "expensive, calm,
nocturnal" mood specified in design system §1.

---

## 7. Deferred (not done in this pass)

These items are documented so future agents pick them up cleanly. None of
them are needed for the immersive refinement above, but all of them belong
on the Customer surface roadmap.

1. **Route group move.** `app/(customer)/(public)/catalog/page.tsx`,
   `app/(customer)/(private)/{basket,orders}/page.tsx` plus the
   `requireBuyer()` guards in the inner layout. Owned by Agent 2's accounts
   work, not Agent 3 — moving the folders requires touching the import
   graph for everyone. Once Agent 2 lands the route groups, the page files
   only need to be re-pathed; the client components in this PR work
   unchanged.
2. **Customer `/orders/[id]` detail page.** Live order tracking + driver pin
   is Agent 5's logistics surface (see `docs/LOGISTICS.md`). The buyer
   reaches it from an OrderCard CTA, but the rendering lives in
   `app/(customer)/orders/[id]/page.tsx` and uses Agent 5's `MapCard` —
   which is out of scope for this agent.
3. **`OrderTimeline` (customer-side).** A vertical rail (PLACED → CONFIRMED
   → DELIVERING → DELIVERED) with the current step elevated to `depth-1`
   and the success bubble haloed with `--shadow-glow-accent`. Today the
   `orders-client.tsx` only renders a status pill. The full timeline is
   logistics-coupled, so it belongs in Agent 5's surface; this surface
   would consume it once the contract stabilises.
4. **Tailwind accent utilities → semantic classes.** A handful of
   `text-emerald-500` / `bg-emerald-500/20`-style utility classes remain on
   secondary elements (qty pill hover states, reorder button, focus rings).
   They are theme-stable in both modes, so they were not blocking; migrating
   them to `var(--accent)`-driven utilities is a follow-up sweep. All
   *inline* hex/rgba literals on customer surfaces are gone (status pills,
   blobs, totals, place-order button now use `--status-*`, `--accent`,
   `--shadow-*` tokens).
5. **Catalog supplier filter.** Today filters are category-only. A second
   `SegmentedControl` row to pin a single supplier is on the design-system
   catalog (DS §7.2) but not on the urgent path — the supplier name is
   already shown on each card, and average baskets touch 3–4 suppliers, so
   the filter only matters when buyers have a >10-supplier history.
6. **Image upload pipeline.** Buyers cannot upload anything; only suppliers
   (Agent 4) and admin do, so this is intentionally out of scope.
7. **Manrope font wiring.** `var(--font-display)` is used throughout but
   the actual `<link>` injection lives in `app/layout.tsx`, which Agent 1
   owns. Until Agent 1 wires it up the `font-family` falls back to Outfit
   then sans-serif gracefully — the visual change is additive.
8. **Removal of `lib/payments/links.ts` calls in `orders-client.tsx`.** The
   user-level brief says "DO NOT add NEW payment features" but does not
   say to remove existing ones. The Uzum Pay / Paynet links stay until
   product makes a call.
9. **BLOCKER for integration (Agent 5 scope): route slug conflict.** The
   untracked `app/api/orders/[orderId]/track/route.ts` conflicts with the
   existing tracked `app/api/orders/[id]/reorder/route.ts`. Next.js refuses
   to start (`You cannot use different slug names for the same dynamic path
   ('id' !== 'orderId')`), which currently blocks `next dev` and
   `next build` for the whole repo. Fix belongs to the logistics surface:
   rename the folder to `app/api/orders/[id]/track` and read `params.id`.
   Until then, customer surfaces were verified via `tsc --noEmit` (zero
   errors in this scope) and a static i18n key audit (0 missing keys across
   uz/ru/en, 228 keys each) instead of a live render.

---

## 8. Verification checklist

Before this slice ships:

- [x] Every visible string on `/catalog`, `/basket`, `/orders` resolves
      through `t()` and exists in all three locale blocks of `lib/i18n.ts`.
- [x] No raw hex (`#10b981`, `#0c0a09`) on any customer surface — replaced
      by `var(--accent)`, `var(--bg-primary)`, semantic status tokens.
- [x] Touch devices stay flat (no tilt); pointer-mouse users see the tilt.
- [x] `prefers-reduced-motion` disables `CategoryStrip` parallax.
- [x] Floating basket bar uses `--shadow-lg + accent-glow`, not a custom
      box-shadow literal.
- [ ] (Agent 1 task) Manrope `<link>` wired in `app/layout.tsx`.
- [ ] (Agent 2 task) Route group `app/(customer)/*` + `requireBuyer()`.
- [ ] (Agent 5 task) `/orders/[id]` live tracking page.
