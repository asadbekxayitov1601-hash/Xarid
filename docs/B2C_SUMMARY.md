# XARID B2C Pivot — Synthesis Summary

Xarid has been pivoted from a B2B morning-procurement tool into a **Yandex-Eats-style
consumer grocery-delivery app for Kokand (Qo'qon)**. Browse a grocery catalog, add to a
cart, check out with a recipient name + address, get ASAP delivery (or schedule for later),
and pay cash on delivery. The seller / courier / admin / cron fulfillment backend was kept
intact and only de-emphasized in the consumer UI.

---

## 0. Build status

- **`npm run build` passes (exit 0) with NO Clerk keys set.** The Clerk gating path is
  intact: `isClerkEnabled()` -> `layout.tsx` -> `Header` -> `header.tsx`; `clerk-gate.tsx`,
  `lib/clerk.ts`, and `middleware.ts` are untouched.
- **`npx tsc --noEmit` passes (exit 0)** and **`npx prisma validate` reports the schema is
  valid** (additive `Order.deliverMode` present).
- **i18n parity is exact: 352 / 352 / 352 keys** across `uz` / `ru` / `en` with zero
  missing/extra and no duplicates, including **35 keys in the new `b2c_*` namespace** (3x).
- The one dynamic key (`status_${order.status}` in `orders-client.tsx`) is fully covered —
  all 6 `status_*` keys exist in all three locales.

---

## 1. What changed

### Positioning / onboarding (consumer-first) — Agent A
- **Hero / landing** (`components/landing-client.tsx`, `lib/i18n.ts`, `app/layout.tsx`):
  rewritten from B2B morning-supply to "Groceries to your door, fast." How-it-works reduced
  to a 3-step consumer flow (Browse -> Order -> Fast delivery). Hero stats/order card swapped
  to consumer values (30-60 min ETA, 40+ catalog, cash, a ~37k everyday basket from one
  fulfilling shop "Qo'qon Bozor"). Landing categories expanded to the 7-category grocery
  taxonomy. Root metadata title/description rewritten to fast grocery delivery in Kokand.
- **Auth** (`components/auth-client.tsx`): reframed as **open consumer signup** — person-name
  field (was "Cafe Gulbahor"), a consumer subtitle, and proper 3-locale phone/password labels.
- **Footer** (`components/footer.tsx`): consumer links (Catalog / Orders / Sign in) kept
  prominent; **business + courier entry demoted** to a small dimmed cluster linking to
  `/supplier` and `/driver`.

### Catalog / cart / checkout (Yandex-Eats UX) — Agent B
- **Storefront** (`components/catalog-client.tsx`): category rail + search + responsive
  product grid + floating sticky cart bar. `CATEGORY_MAP` covers every seeded category string
  (Mevalar, Sabzavotlar, Sut va tuxum, Non, Go'sht, Quruq mahsulotlar, Ichimliklar) via
  `b2c_cat_*` labels.
- **Product card** (`components/customer/product-card-immersive.tsx`): add affordance plus a
  +/- quantity stepper once an item is in the basket; **category strip**
  (`components/customer/category-strip.tsx`) is a scrollable pill rail with reduced-motion gating.
- **Consumer checkout** (`components/basket-client.tsx`): org field relabeled to **recipient
  name**, address with a flat/entrance/landmark hint, an **ASAP-default vs "deliver later"**
  toggle (the existing day+slot picker shows only when SCHEDULED), and a **cash-on-delivery**
  note. POSTs `deliverMode` and only sends a window when scheduled.
- **Delivery mode** (`lib/delivery.ts`): append-only ASAP helpers (`DeliverMode`,
  `DEFAULT_DELIVER_MODE='ASAP'`, `ASAP_ETA_MIN/MAX`, `asapDeliveryDate()`,
  `normalizeDeliverMode()`); existing slots + `resolveDeliveryWindow` untouched.
- **Order API** (`app/api/orders/route.ts`): accepts `deliverMode` (defaults ASAP when
  omitted), computes `deliveryDate = now + 60min` for ASAP (null slot) vs the validated window
  for SCHEDULED, keeps server-side price recompute, persists `Order.deliverMode`.

### Products (broad grocery catalog + categories) — Agent C
- **Seed** (`lib/seed.ts`): a **45-SKU everyday-grocery catalog across 7 categories**
  (Mevalar / Sabzavotlar / Sut va tuxum / Non / Go'sht / Quruq mahsulotlar / Ichimliklar) with
  localized `nameUz` / `nameRu`, units, sort keys, and >=1 `SupplierOffer` each. Suppliers
  renamed to consumer shop names (Qo'qon Bozor / Lavka Fresh / Oila Market) covering every
  category. Idempotent upserts by stable natural keys; `TAKE_RATE` / rounding math unchanged.
- **Emoji map** (`lib/product-emoji.ts`): keyword->emoji rows for all new SKUs plus a
  7-category fallback so cards always show an icon without photos.

### Orders / tracking — Agent C
- **Order history** (`components/orders-client.tsx`, `app/orders/page.tsx`): delivery-app tone
  with live relative **ASAP ETA** (e.g. "Bugun · ~45 daqiqada") vs a scheduled window, an
  "your order is on the way" banner + `/track/[id]` link for DELIVERING, cash-on-delivery
  status, and reorder kept. `page.tsx` reads `deliverMode` defensively and classifies ASAP
  (explicit or legacy no-slot) vs SCHEDULED.

---

## 2. What was deliberately KEPT (only de-emphasized)

The entire **fulfillment backend is intact** — git shows zero file deletions:
- **Supplier** pages (`app/supplier/*`: products, profile, analytics) — reachable via the
  demoted footer link `/supplier`.
- **Driver / courier** pages (`app/driver/*`) — reachable via the demoted footer link `/driver`.
- **Admin** pages (`app/admin/*`: dispatch, drivers, finance, orders, routes, suppliers).
- **Cron / scheduler**, the `SupplierOffer` model, price-recompute logic, and the Payment
  backend — all untouched.
- The **Clerk gating** path is unchanged and still builds with no keys.

These were only **de-emphasized in the consumer UI** (business/courier entry moved to a small
dimmed footer cluster), not removed.

---

## 3. *** ORCHESTRATOR ACTIONS — RUN THESE AGAINST LIVE NEON ***

> These were intentionally NOT run by the build agents. The app will not show the new catalog,
> and ASAP/scheduled order writes will fail on the new column, until these run.
> `DATABASE_URL` points at the **live Neon Postgres** — confirm this is intended before running.

Run from `C:\Users\user\Documents\GitHub\Xarid`, **in this order**:

```bash
# 1. Apply the additive Order.deliverMode column (nullable, default "ASAP" -> non-destructive)
npx prisma db push          # or: npm run db:push

# 2. Load the expanded 45-SKU B2C grocery catalog + consumer shops/offers
npm run db:seed             # == tsx prisma/seed.ts -> seedCatalog (idempotent upserts)

# 3. Redeploy the app (Vercel) so the new build/runtime is live
```

**Redeploy note:** push/merge to `main` and let Vercel rebuild, or trigger a manual redeploy,
so the consumer build and the `deliverMode`-aware order API go live. Do the **db push before
the deploy** so the runtime never queries a column that doesn't exist yet.

---

## 4. Pending schema migration (additive field)

Single Postgres schema `prisma/schema.prisma` — `model Order`:

```prisma
deliverMode  String?  @default("ASAP")
```

- **Nullable + defaulted -> additive and non-destructive.** Existing Neon rows backfill to
  `ASAP` on push.
- Only `prisma generate` / `prisma validate` were run locally; **`db push` is still pending**
  (see ORCHESTRATOR ACTIONS).
- Legacy null rows: the UI treats null-with-`deliverySlot` as **SCHEDULED** and null-without as
  **ASAP**, so no display break on pre-pivot orders.
- No second (sqlite) schema to sync — the project is Postgres-only.

---

## 5. How to view locally

```bash
npm run dev
```

Then open:
- **`/`** — consumer landing (hero, 3-step flow, grocery categories, demoted business/courier
  footer).
- **`/catalog`** — Yandex-Eats storefront (category rail, search, product grid, sticky cart).
- **`/basket`** — consumer checkout (recipient name + address, ASAP-default / deliver-later
  toggle, cash-on-delivery).
- `/orders` — consumer order history with live ASAP ETA vs scheduled window + track link.

> For the catalog to show the new SKUs locally you still need the seed loaded against whatever
> DB your local `DATABASE_URL` points at (live Neon, in this repo's `.env`).

---

## 6. Known gaps / follow-ups (de-duplicated)

- **DB push + seed not yet run** against live Neon — see Section 3 (the gating follow-up).
- **No real product images** — cards render emoji (keyword map + 7-category fallback); a real
  image pipeline is future work.
- **No map address picker** — checkout uses a free-text address + landmark hint; no geocoding /
  map UI.
- **Cash only** — no payment beyond cash on delivery; the Payment backend exists but no
  consumer online-payment flow is wired (env-gated Uzum/Paynet links left intact in orders).
- **Category deep-links are generic** — landing category pills and the "Browse the catalog" CTA
  route to `/catalog` without a preselected category; a query-param filter on the catalog page
  would be needed for true category deep-linking.
- **Orphan / unused i18n keys** — `b2c_co_cart_summary` exists in all 3 locales but is unwired
  (harmless); `ph_person_name` is now unused by auth but left in place — both safe to prune
  later once confirmed.
- **Build hygiene** — untracked `tsconfig.seedcheck.tsbuildinfo` (a build artifact) should be
  removed or gitignored before committing.
- **Dynamic status key** — any NEW order status added later must get a matching `status_*` key
  in all 3 locales, or `orders-client.tsx` will render the raw key (the typed-key check is
  bypassed there for the dynamic status).
