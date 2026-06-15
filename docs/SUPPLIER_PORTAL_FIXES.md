# XARID — Supplier Portal Fixes

This document maps each reported supplier-portal complaint to the change that
resolved it, with the exact files touched. All work landed on branch
`claude/supplier-portal-improvements` and was completed by three parallel agents
plus a verifier.

## At a glance

| # | User ask | Status | Primary file(s) |
|---|----------|--------|-----------------|
| 1 | Company logo upload | Done | `components/supplier/AboutCompanyForm.tsx` |
| 2 | Pages open very slowly | Improved (+ infra note) | `app/supplier/loading.tsx`, `lib/supplier.ts` |
| 3 | Dashboard / Mahsulotlar redundancy | Resolved | `components/supplier-client.tsx`, `app/supplier/page.tsx` |
| 4 | "Sizga to'lanadigan narx" label | Renamed to "Narxi" | `lib/i18n.ts` |
| 5 | Typeable price (no steppers/toggles) | Done | `components/supplier/ProductUploadForm.tsx` |
| 6 | Account button won't open | Real dropdown menu | `components/header.tsx` |
| 7 | Card-style add product | Done | `components/supplier/ProductUploadForm.tsx`, `components/supplier/NewProductImagePicker.tsx`, `app/supplier/actions.ts` |

---

## 1. Company logo upload

The URL-only text input in the "About company" profile form was replaced with a
real in-browser image upload. An "Upload / Replace logo" button opens a hidden
file picker; the picked image is compressed client-side to a 320px-max JPEG data
URL (~20–40KB) using the identical technique as
`components/product-image-upload.tsx` (`createImageBitmap` → 320px canvas →
`toDataURL("image/jpeg", 0.78)`). That compressed data URL is bound into a
hidden `name="logoUrl"` field, so it saves through the **unchanged**
`updateMyProfile` server action into `Organization.logoUrl`. The form shows a
live preview (image when set, a branded initial tile when empty) plus per-upload
busy and error states.

`ProductImageUpload` could not be imported and reused directly — it requires a
`productId` and POSTs to `/api/products/:id/image` with no data-URL callback — so
its compression algorithm was reused inline (~10 lines) rather than rewriting
that component.

**Files:**
- `components/supplier/AboutCompanyForm.tsx` — logo image upload with in-browser
  compression, hidden `logoUrl` field, live preview, busy/error states, and
  translated `co_logo_*` labels.

**Known blocker (out of agent scope — needs the `actions.ts` owner):**
`app/supplier/actions.ts` has `const LOGO_MAX = 512` and does
`logoUrl.slice(0, LOGO_MAX)` in `updateMyProfile`. A compressed logo data URL is
~20–40KB, so this slice **truncates and corrupts** the saved logo. The uploaded
value will not persist intact until `LOGO_MAX` is raised (e.g. to ~60000) or
logos are stored as a hosted URL instead of a data URL. The form already feeds
the full data URL into the existing `name="logoUrl"` field; only the server-side
cap blocks it.

---

## 2. Slow supplier pages

Two changes plus an infrastructure note.

**Route-level skeleton (perceived speed).** A new `app/supplier/loading.tsx`
renders an on-brand fallback that mirrors the `SupplierShell` chrome (background
blobs, brand header card, 4-tab strip, content cards) with token-colored
shimmering placeholders, so tab switches give instant feedback. It is a server
component (resolves locale like `app/loading.tsx`), uses pure-CSS shimmer, and
disables animation under `prefers-reduced-motion`. Includes `role="status"`,
`aria-busy`, and an sr-only label.

**Query tightening (real bytes).** In `lib/supplier.ts`,
`getSupplierAnalytics`'s 30-day `orderItem.findMany` was switched from `include`
to a column-precise `select`, fetching only the fields the JS aggregation loop
reads (`qty`, `qtyActual`, `costPrice`, `order.createdAt`,
`order.buyerUserId`, `offer.product.{id,nameUz,nameRu}`). Previously `include`
pulled every `OrderItem` column plus `order.id/status` for every row in the
window. The returned `SupplierAnalytics` shape is byte-for-byte unchanged, so
there is no downstream behavior change.

**Files:**
- `app/supplier/loading.tsx` — NEW reduced-motion-safe route skeleton mirroring
  `SupplierShell`.
- `lib/supplier.ts` — narrowed `getSupplierAnalytics` `findMany` from `include`
  to a precise `select` on the hot analytics path.

**Infra note — first-hit latency is real, not just perceived.** The supplier
pages are `dynamic = "force-dynamic"` and hit the live Neon DB on every load. If
the Railway/host instance is on a free/idle tier it cold-starts when idle,
adding seconds before the first byte. The new skeleton masks this perceptually
but does not remove it. Keeping the server warm (paid/always-on tier or a cron
ping) is the real fix for the "opens very slowly" first hit.

---

## 3. Dashboard / Mahsulotlar redundancy

Product management was duplicated: the dashboard had inline price-edit and
"add offer from catalog" forms, and the **Mahsulotlar** tab also added products.
That redundancy is resolved.

In `components/supplier-client.tsx`, the inline price-edit form (cost-price
input, available checkbox, Save button) and the entire "Add offer from catalog"
form were removed from the dashboard. The **Prices** tab is now a **read-only**
list (photo/emoji, name + unit, payout price, and an *In stock / Out of stock*
badge) with a single CTA link to `/supplier/products/new`. Adding and managing
products now lives **only** under the Mahsulotlar tab. All four supplier tabs are
kept. The now-unused `otherProducts` prop, the `WebProduct` type, and unused
imports (`updateMyOffer`, `addMyOffer`, `ProductImageUpload`, `Save`) were
dropped; `Link` was added. `app/supplier/page.tsx` was updated to stop
querying and passing `otherProducts`.

**Files:**
- `components/supplier-client.tsx` — removed the redundant dashboard
  add-product/price-edit UI; Prices tab is now a read-only product/price list
  with a stock badge and a CTA to `/supplier/products/new`. Dropped unused
  prop/imports, added `Link`.
- `app/supplier/page.tsx` — stopped computing/passing `otherProducts` to
  `SupplierClient`.

---

## 4. "Sizga to'lanadigan narx" → "Narxi"

The add-product price label was overly long. In `lib/i18n.ts`,
`product_new_cost` was renamed across all three locales:
- uz: "Sizga to'lanadigan narx (so'mda)" → **"Narxi"**
- ru: "Ваша цена (сум)" → **"Цена"**
- en: → **"Price"**

`sp_my_products_header` was also simplified to
"Mahsulotlarim" / "Мои товары" / "My products".

`sp_you_get` was **intentionally left unchanged**: it labels a whole-order
payout total in the order panel, not a unit price, so renaming it to "Narxi"
would be a regression.

**Files:**
- `lib/i18n.ts` — renamed `product_new_cost`, simplified `sp_my_products_header`.

---

## 5. Typeable price (no steppers / toggles / delete)

The price field in the add-product form is `type="text"` with
`inputMode="numeric"` and `pattern="[0-9]*"`, an `onInput` that strips non-digit
characters, and a non-interactive so'm/UZS suffix. There are no +/- steppers
(those only exist on `type="number"`), no toggles, and no clear/delete button.

**Files:**
- `components/supplier/ProductUploadForm.tsx` — typeable plain-text numeric
  price field with non-digit stripping and a static currency suffix.

---

## 6. Account dropdown menu

The "account button won't open" complaint was fixed by turning the static
logged-in name pill into a real dropdown menu in `components/header.tsx`
(logged-in branch only — nav tabs, logo, theme/language switchers untouched).

**Trigger:** a single `<button>` showing an accent avatar (first initial of
`userName`) + truncated name + a `ChevronDown` that rotates when open. It has
`aria-haspopup="menu"`, `aria-expanded`, and an `aria-label`, and stays tappable
on mobile (avatar always visible; name/chevron hidden below `sm`).

**Menu:** an `AnimatePresence` + `motion.div` with `role="menu"`, glass-card
styling (`var(--glass-bg)` + backdrop blur, `rounded-2xl`, border, shadow),
containing: (1) a header row with avatar + full `userName`
(`role="presentation"`), (2) a `role="separator"` divider, (3) a "My orders"
`Link` → `/orders` (`role="menuitem"`, `Receipt` icon), and (4) a "Log out"
button (`role="menuitem"`, `LogOut` icon) calling the existing `logout()`.

**Behavior / a11y:** closes on outside `pointerdown`, on `Escape`, on route
change (pathname effect), and after logout / menu-item click. Motion is subtle
(`springSnappy`, opacity+y+scale) and fully respects `prefers-reduced-motion`
(reduce → opacity-only, short duration). All colors use semantic tokens; only
the pre-existing red-400/red-500 destructive accents on logout were kept. The
not-logged-in `/auth` branch and `logout()` are unchanged. The now-unused `User`
lucide import was removed.

**Files:**
- `components/header.tsx` — replaced the static name pill + separate logout icon
  with an accessible click-to-open account dropdown; added `menuOpen` state,
  `accountRef`, outside-click/Escape/route-change close handlers, and a
  reduced-motion fallback. Removed unused `User` import.
- `lib/i18n.ts` — appended `acct_menu_label`, `acct_menu_my_orders`,
  `acct_menu_logout` to all three locales.

---

## 7. Card-style add product

`components/supplier/ProductUploadForm.tsx` was fully rewritten as a clean glass
card: image at the top, then product name (+ optional Russian name), category +
unit selects, a price field, and a full-width purple submit. It now **creates a
brand-new `Product`** (matching the request to "upload an image, give a name,
enter a price") rather than only picking from a fixed catalog. It is mobile-first
and uses semantic tokens only (`var(--accent)`, `var(--accent-glow)`, `status-*`
tokens, `glass-*` utilities) with no raw hex; the spinner respects
`prefers-reduced-motion`.

A new helper, `components/supplier/NewProductImagePicker.tsx`, is a pre-creation
image picker that downscales the chosen photo to a ~320px JPEG data URL and hands
it to the form via `onChange` with no network call. This is necessary because
`components/product-image-upload.tsx` POSTs to an **existing** product's
endpoint and cannot serve a not-yet-created product; that file was not touched.

The new server action `createMyProduct()` (in `app/supplier/actions.ts`)
validates `name` (required) and a positive integer `price` (returning stable
error codes `"name"`/`"price"` mapped to `product_new_err_*` on the client),
whitelists category + unit, accepts an optional compressed image data URL (regex
+ 200KB cap, same format the `/api/products/[id]/image` route enforces), creates
the `Product` + a `SupplierOffer` with `price = sellPrice(costPrice)`,
revalidates `/supplier`, and returns `{ ok, productId }`. The form redirects to
`/supplier` on success. The existing `addMyOffer`/`updateMyOffer` actions remain
intact and exported (just no longer referenced from the UI).
`app/supplier/products/new/page.tsx` was simplified to stop querying/passing the
catalog products prop and just render `ProductUploadForm`.

**Files:**
- `components/supplier/ProductUploadForm.tsx` — rewritten mobile-first glass card
  that creates a brand-new product (image at top, name + optional Russian name,
  category + unit selects, typeable price with so'm suffix, purple submit); calls
  `createMyProduct` and redirects to `/supplier`.
- `components/supplier/NewProductImagePicker.tsx` — NEW pre-creation image
  picker that downscales to a compact JPEG data URL and passes it to the form (no
  network call); distinct from `product-image-upload.tsx`.
- `app/supplier/actions.ts` — added `createMyProduct()` (validation, stable error
  codes, category/unit whitelist, bounded optional image data URL, creates
  `Product` + `SupplierOffer`, revalidates, returns `{ ok, productId }`).
- `app/supplier/products/new/page.tsx` — simplified to just render
  `ProductUploadForm`; no longer queries/passes the catalog products prop.

---

## Build status

- **Green.** `npm run build` exits 0 (no errors, no warnings) and
  `npx tsc --noEmit` exits 0 (zero type errors), both with **no Clerk env keys
  set**. 17/17 pages generated, including the new supplier skeleton.
- **No Clerk dependency.** No Clerk keys in `.env`, `.env.example`,
  `package.json` deps, or shell env. The only Clerk mentions are historical docs
  markdown, not source.
- **No source fixes needed.** The three agents' work integrated cleanly on the
  first build pass.
- The only build failures observed were transient Windows filesystem races
  during the post-compile "build traces" / webpack-cache rename steps
  (`middleware-manifest.json` / `route.js.nft.json` ENOENT) — environment /
  antivirus artifacts on files outside the changed scope, not code issues. A
  clean `rm -rf .next` build on CI/Linux is worth running to confirm a fully
  green end-to-end run.

## i18n parity

- **Exact parity at 393 keys per locale** across `uz` / `ru` / `en`
  (uz = 393, ru = 393, en = 393) with zero cross-locale diffs.
- All new keys exist in all three locales: `acct_menu_*`, `co_logo_*`,
  `product_new_*`, and `sp_*` namespaces.
- `product_new_cost` is now "Narxi" (uz) / "Price" (en); the old payout-style
  label has zero matches anywhere.
- New/changed key groups: `acct_menu_label`, `acct_menu_my_orders`,
  `acct_menu_logout` (Agent 1); `co_logo_upload`, `co_logo_replace`,
  `co_logo_uploading`, `co_logo_preview_alt`, `co_logo_help`, `co_logo_error`
  (Agent 3); `product_new_*` (image/name/category/unit/price/error),
  `sp_manage_products_cta`, `sp_unavailable`, and reworded
  `product_new_subtitle` / `sp_no_offers` (Agent 2).

---

## Follow-ups (de-duplicated)

**Logo persistence (blocker for ask #1).** Raise `LOGO_MAX` in
`app/supplier/actions.ts` (e.g. to ~60000) or store logos as a hosted URL — the
current `512`-char slice corrupts the ~20–40KB compressed logo data URL.

**Price editing of existing offers.** Price editing is no longer reachable from
the UI: the dashboard list is read-only and the Mahsulotlar card only *creates*
products. `updateMyOffer`/`addMyOffer` remain exported server actions. If sellers
need to change a price or toggle availability after creation, add an edit
affordance under Mahsulotlar (e.g. a per-product edit row calling
`updateMyOffer`).

**Catalog fragmentation.** The add-product card creates a fresh `Product` row
each time with no de-duplication, so two suppliers (or the same one twice) can
create separate "Olma" SKUs. Consider matching against existing catalog
`Product`s by name/category, or reintroducing an optional "pick from catalog"
path.

**Dashboard payout query (biggest remaining perf win).**
`app/supplier/page.tsx` calls `payoutStatement(start, end)` from `lib/payouts.ts`,
which `findMany`s **every** supplier's DELIVERED order items for the whole week
and filters in JS (using `include` that pulls full offer + supplier rows). For a
single-supplier dashboard this should be scoped with
`where: { offer: { supplierId: org.id } }` and a narrowed `select`.

**Account menu — phone line.** The dropdown header row shows only `userName`. If
a user phone is available server-side, pass a `userPhone` prop to `Header` and
render it as a secondary line (a new `acct_menu_*` phone key in all three
locales would be needed).

**Account menu — keyboard polish (optional).** Arrow-key roving focus between
menuitems and auto-focusing the first item on open. The current implementation
supports Tab + Escape, which satisfies the requirements.

**Docs.** `docs/SUPPLIER_DASHBOARD.md` (~line 187) still describes the old
`addMyOffer`-based flow and should be updated to reflect `createMyProduct` + the
read-only dashboard list. Historical Clerk mentions in docs markdown are
optional cleanup (docs only, not source).

**Unused translation.** `product_new_added` is translated in all three locales
but currently unused (the form redirects instead of toasting); wire it into a
success toast or drop it.

**Price field guard (minor).** The price field has no client max-length guard
beyond server validation — acceptable, but worth noting.
