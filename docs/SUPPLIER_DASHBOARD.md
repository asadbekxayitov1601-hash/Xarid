# Xarid Supplier ("Deliver") Dashboard (Agent 4)

Status: build spec + delivered surface. Single source of truth for the
SUPPLIER account's web surfaces: analytics, company profile, product
management, and order management. Cross-links into Agent 1 (design system),
Agent 2 (accounts/role guard), and Agent 5 (logistics — driver app).

The Deliver account is the existing `Organization.type = SUPPLIER` /
`User.role = OWNER|STAFF` pair (see `docs/ACCOUNTS.md`). The router lands a
SUPPLIER user on `/supplier` immediately after sign-in.

---

## 1. Surface map

| Route                        | Purpose                                          | Status   |
|------------------------------|--------------------------------------------------|----------|
| `/supplier`                  | Order management (PO inbox + price list edit)    | Refit    |
| `/supplier/analytics`        | Live revenue/units charts + stat tiles           | NEW      |
| `/supplier/profile`          | About-company editor (name, district, about, logo) | NEW    |
| `/supplier/products/new`     | Add a catalog SKU to the supplier's offers       | NEW      |

"Refit" = the page logic predates Agent 4 but its body
(`components/supplier-client.tsx`) was refactored into the shared shell:
the duplicated page chrome (own header card, ambient blob, full-page
wrapper) moved into `SupplierShell`, every hardcoded Uzbek string now goes
through `t()` (`sp_*` namespace), and raw hex / emerald utility colors were
replaced with `var(--accent)` + `var(--status-*)` tokens.

Every page renders inside `components/supplier/SupplierShell.tsx`, a client
component that adds:

- A glass header card with the org name and logo initial.
- A four-tab nav strip (Dashboard / Analytics / Products / Profile), keyboard
  reachable, current tab highlighted via `--accent`.
- Two ambient blobs (one emerald, one amber) wired through the existing
  `.blob` / `.blob-2` classes — they're disabled automatically by
  `prefers-reduced-motion` (see `app/globals.css`).

All visible strings resolve through `lib/i18n.ts` with `t(locale, key)`. The
`supplier_*`, `analytics_*`, `chart_*`, `stat_*`, `profile_*`, and
`product_new_*` namespaces are added to `uz`, `ru`, and `en` in the same
change. Missing-key behaviour falls back to `uz` (see the updated `t()`
helper).

---

## 2. Analytics dashboard (`/supplier/analytics`)

### 2.1 Data source

`lib/supplier.ts` gains two helpers:

- `getSupplierAnalytics(supplierId, { days })` — single Prisma query that
  joins `OrderItem → SupplierOffer → Order` filtered to:
  - `Order.status IN (CONFIRMED, PARTIAL, DELIVERING, DELIVERED)` — these
    are the "recognised revenue" statuses. `PLACED` orders aren't earned
    yet, `CANCELLED` orders never will be.
  - `Order.createdAt` inside the rolling window (default 30 days).
  - The supplier owns the offer (`offer.supplierId = $orgId`).

  Revenue per line is `(qtyActual ?? qty) * costPrice`. `qtyActual` is the
  weighed-at-delivery quantity (see `prisma/schema.prisma:182`), so partial
  deliveries are reflected correctly. `costPrice` is the supplier-facing
  number — never the buyer-facing `price`, which would inflate the chart by
  the platform's take rate.

- `topShareWithOther(slices, n)` — collapses the long tail to "top N +
  Other" so a supplier with 40 SKUs gets a readable pie.

The helper returns: `totalRevenue`, `totalUnits`, `activeCustomers` (distinct
`buyerUserId`), `topProduct`, daily series (one point per day in the window,
zero-filled), and a sorted product share list.

### 2.2 Layout

```
+----------------------------------------------------------+
| Analytics                                [Last 30 days] |
| Your sales, revenue and best-selling products            |
+----------------------------------------------------------+
| Revenue (30d) | Units sold | Top product | Active custs |  4 StatTiles
+----------------------------------------------------------+
| Revenue over time                | Revenue share by     |
|  (line chart, 30 points)         |  product (donut)     |
+----------------------------------------------------------+
```

- Stat tiles use `components/supplier/StatTile.tsx` — `scene-perspective`
  parent, `tilt-card` body, big number rendered at `depth-1`. Each tile gets
  a token-coloured icon halo (`--accent`, `--accent-2`, `--accent-3`).
- Line chart: `RevenueLineChart.tsx` (Recharts `<LineChart>`). Single series
  in `--accent`; grid / axes / tooltip all token-driven. Date labels go
  through `Intl.DateTimeFormat` with the locale (`uz-UZ`, `ru-RU`, `en-GB`).
- Donut chart: `ProductPieChart.tsx`. Palette is emerald → amber → sky →
  three `color-mix(...)` tints → `--text-secondary` for "Other". The
  collapsed slice label comes from `t(locale, "chart_share_other")`.

### 2.3 Empty state

If `totalRevenue === 0` and `totalUnits === 0`, the page renders a single
`glass-card` empty state instead of the tile/chart grid:

> Analytics will appear here.
> Once your first order is delivered, daily revenue, units sold and top
> sellers will show up on this dashboard.
> [Fill in your price list] -> `/supplier`

Translated keys: `analytics_empty_title`, `analytics_empty_body`,
`analytics_empty_cta`.

### 2.4 Performance

One `findMany` per page render. `dynamic = "force-dynamic"` so analytics are
always fresh — no stale ISR shows up after a 22:00 PO confirmation. If this
ever exceeds 200ms on prod Postgres, the right move is a per-day cache table
populated by the existing cron worker, not adding indexes (the Prisma client
already query-plans this with the FK indexes Prisma generates).

---

## 3. Company profile (`/supplier/profile`)

### 3.1 Schema additions (already applied in this PR)

```prisma
model Organization {
  // ... existing fields ...
  about     String?  // NEW — public "about the company" text
  logoUrl   String?  // NEW — optional external logo URL
}
```

Both are nullable so `prisma db push` is additive — no backfill needed on
dev sqlite or prod Postgres. Existing buyer orgs (`type = BUYER`) keep both
fields `null` and never see this surface.

### 3.2 Form (`components/supplier/AboutCompanyForm.tsx`)

Three glass-card sections:

1. **Basic info** — name (required), district (required), phone (required).
2. **About the company** — multi-line textarea, capped at 2000 chars.
3. **Logo** — preview tile + URL input. Empty logo falls back to a gradient
   tile with the org initial.

The form posts to `updateMyProfile(formData)` in `app/supplier/actions.ts`,
a Server Action that:

- Calls `requireSupplier()` first.
- Trims + length-caps every field (defence-in-depth — UI already enforces).
- Writes the row, `revalidatePath("/supplier")` + `/supplier/profile`.
- Returns `{ ok: true }` on success so the client can flip the "Saved" toast.

Toast messages: `profile_saved`, `profile_save_error`.

### 3.3 Customer-facing display

Out of scope for Agent 4 — Agent 3 (customer surface) will surface the
supplier's `about` / `logoUrl` on the catalog's offer rows. The data shape
is documented here so Agent 3 doesn't have to invent a contract.

---

## 4. Product management

### 4.1 Existing surface: `/supplier`

`app/supplier/page.tsx` renders `components/supplier-client.tsx` — the tabs
"Orders" + "Prices" already let the supplier edit costPrice / availability
on every offer and upload product photos via the existing
`components/product-image-upload.tsx` (which posts to
`/api/products/[id]/image`). Agent 4 does **not** rewrite this. The "Add
product" form embedded inside the prices tab still works.

### 4.2 New focused page: `/supplier/products/new`

Reason: the existing add-form is a one-line select inside the prices tab.
For first-time onboarding ("I want to add my first SKU"), a dedicated page
is much friendlier and is reachable from the shell's "Products" nav tab.

The new page:

- Fetches all `Product` rows the supplier hasn't already offered.
- Renders `components/supplier/ProductUploadForm.tsx` with a labelled select
  and a "Your payout per unit" number input.
- Submits to the existing `addMyOffer` server action, then `router.push`es
  back to `/supplier`.

If the supplier already offers every catalog SKU, the page renders an empty
state ("You've already added every product available in the catalog.")
instead of an empty `<select>`.

### 4.3 Photo uploads

Existing `components/product-image-upload.tsx` continues to handle photo
uploads (in-browser downscale to 320px JPEG, POSTed as a data URL). It's
embedded in the prices tab of the existing supplier page. No changes
needed.

---

## 5. Order management

Already shipped: `app/supplier/page.tsx` + `components/supplier-client.tsx`
provide the PO inbox (accordion of incoming PurchaseOrder rows) and the
"Confirm" / "Reject" buttons (Server Action `resolvePoWeb`). Cross-link
target: the "Dashboard" tab in the shell.

Agent 4 refit (this PR):

- The page now renders inside `SupplierShell`, so the dashboard tab links to
  Analytics / Products / Profile like every other supplier surface.
- All visible strings moved to the `sp_*` i18n namespace (uz/ru/en), incl.
  payout summary, tab labels, PO status pills, confirm/reject buttons and
  the empty states. Product names localise via the shared
  nameUz/nameRu pattern; units via `unitLabel()`; money via `uzs()`.
- `resolvePoWeb` now returns stable error codes (`forbidden`,
  `already_resolved`) which the client maps to `sp_err_*` keys — no more
  hardcoded Uzbek strings travelling over the wire.
- Raw hex (`#10b981`) and emerald utility classes were replaced with
  `var(--accent)` / `var(--status-*)` tokens per DESIGN_SYSTEM v2; delivery
  dates format with the active locale instead of hardcoded `uz-UZ`.

Future work (out of scope here):

- Per-order map preview pulled from Agent 5's logistics surface.
- Filterable status pills (PLACED / CONFIRMED / DELIVERED) — currently the
  list shows everything.

---

## 6. Component catalog (NEW in `components/supplier/`)

| File                        | Role                                             |
|-----------------------------|--------------------------------------------------|
| `SupplierShell.tsx`         | Header + 4-tab nav, ambient blobs                |
| `StatTile.tsx`              | ImmersiveCard wrapper around a single KPI        |
| `RevenueLineChart.tsx`      | Recharts `<LineChart>` with token-driven theme   |
| `ProductPieChart.tsx`       | Recharts `<PieChart>` (donut) with 7-step palette|
| `AnalyticsDashboard.tsx`    | Composes the four StatTiles + two charts         |
| `AboutCompanyForm.tsx`      | Company profile editor + Save toast              |
| `ProductUploadForm.tsx`     | Pick a catalog SKU + set payout price            |

All client components. Server pages stay thin — they fetch data, resolve the
locale, hand it to the client.

---

## 7. Dependencies

- **Recharts** — added to `package.json` (`"recharts": "^2.15.0"`). The user
  must run `npm install` once before `npm run build` or `next dev`. This is
  the only new runtime dependency.

No new dev dependencies. No new env vars.

---

## 8. i18n keys added

All three locales (`uz`, `ru`, `en`) get the same set in the same commit.
The full list lives in `lib/i18n.ts` — search for the `// === Supplier
dashboard (Agent 4) ===` markers. Highlights:

- `supplier_nav_dashboard|analytics|orders|products|profile`
- `analytics_title|subtitle|range_30d`
- `stat_revenue_30d|units_sold|top_product|active_customers|no_top_product`
- `chart_income_title|subtitle|yaxis|xaxis`
- `chart_share_title|subtitle|other`
- `chart_legend_revenue`
- `analytics_empty_title|body|cta`
- `profile_title|subtitle`
- `profile_section_basic|about|logo`
- `profile_field_name|district|phone|about|about_help|logo|logo_help`
- `profile_save|saved|save_error`
- `products_title|subtitle`
- `product_new_title|subtitle|pick|cost|submit|back|empty|help`
- `common_back|loading`
- `sp_payout_week_title|summary|none|note` (dashboard payout card)
- `sp_tab_orders|prices`, `sp_delivery_label`
- `sp_po_new|confirmed|rejected|resolved`, `sp_status_label`, `sp_value_label`
- `sp_you_get`, `sp_confirm_btn`, `sp_reject_btn`, `sp_no_pos`
- `sp_err_forbidden|already` (mapped from `resolvePoWeb` error codes)
- `sp_my_products_header`, `sp_available`, `sp_no_offers`, `sp_add_from_catalog`

The robust `t()` helper falls back to `uz` if a locale is missing a key —
keeps the UI rendering even if a future feature lands keys in `uz` only.

---

## 9. Anti-patterns avoided

Per `docs/DESIGN_SYSTEM.md` section 9:

- No raw hex in JSX. Every colour comes from a `var(--*)` token. The pie
  palette uses `color-mix(in oklab, ...)` to derive accent tints, which
  also tracks light/dark mode automatically.
- No motion that bypasses `prefers-reduced-motion` — the only new keyframe
  pull is via the existing `.blob` class, which is already in the
  reduced-motion media query.
- No mixed motion libraries — everything is `motion` (framer-motion) or
  pure CSS.
- No hardcoded English. Every string is `t(locale, ...)`.
- No `<img>` as a button. Logo uploads continue to live in
  `ProductImageUpload`.

---

## 10. Manual checklist before opening a PR

1. `npm install` (Recharts).
2. `npx prisma db push` (picks up Organization.about + Organization.logoUrl).
3. `npx prisma generate`.
4. `npm run build` — should succeed with no type errors.
5. Sign in as a SUPPLIER and check:
   - `/supplier/analytics` renders charts (or empty state on a fresh org).
   - `/supplier/profile` round-trips name/district/phone/about/logoUrl.
   - `/supplier/products/new` lists unoffered SKUs only.
   - Tab navigation in the SupplierShell highlights the active surface.
6. Toggle `<html class="light">` — every surface stays readable, no hex
   peeks through.
7. Switch locale `uz`/`ru`/`en` — every string updates.

---

*End of Agent 4 spec.*
