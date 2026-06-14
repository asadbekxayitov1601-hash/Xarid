# Xarid B2C Pivot Plan — Yandex-Eats-style grocery delivery

Status: planning doc only. No code is changed in this phase. Three build agents
(A, B, C) execute this file-by-file. Read this whole doc before touching code.

## 0. The pivot in one paragraph

Xarid is being turned from a **B2B morning-procurement marketplace**
(restaurants/cafes ordering bulk supplies for next-morning consolidated
delivery) into a **B2C on-demand grocery delivery app** that looks and works
like **Yandex Eats / Yandex Lavka**. The default user is now an **ordinary
consumer in Kokand** who browses a broad everyday-grocery catalog with no login
wall and signs in only at checkout (phone + password, or Telegram). Default
delivery is **ASAP (~30-60 min)**; the existing day+window picker becomes an
optional **"deliver later"**. Payment stays **cash on delivery only**.

The seller (Organization SUPPLIER), courier (User role DRIVER), admin, and the
22:00-cutoff / PurchaseOrder / scheduler machinery are KEPT as the
behind-the-scenes fulfillment side (exactly the Yandex model: shops + couriers
behind a consumer storefront). They are only **de-emphasized** in the consumer
UI, never deleted.

### Hard constraints (every agent)
- Translate every new/changed visible string in **uz / ru / en** in
  `lib/i18n.ts`. Verify a key exists in all three before using it.
- Semantic CSS tokens only (`var(--accent)`, `var(--accent-2)`, `text-text-*`,
  `bg-bg-*`, status tokens). No raw inline hex in JSX.
- ASCII-only in code identifiers, file paths, commit messages.
- Respect `prefers-reduced-motion` (use the existing `useReducedMotion()` hook).
  Mobile-first layout.
- Build MUST stay green with NO Clerk keys set. Do NOT touch `clerk-gate.tsx`,
  `middleware.ts`, `lib/clerk.ts`, or the Clerk gating in `header.tsx`/`layout.tsx`.
- `lib/i18n.ts` and `prisma/schema.prisma` are edited concurrently. **Re-read
  immediately before each edit. Append-only / additive in your own namespace.
  Never remove another agent's keys/models.**

### i18n namespacing (avoid collisions between agents)
- Agent A owns new keys prefixed `b2c_land_*`, `b2c_nav_*`, `b2c_foot_*`,
  `b2c_auth_*`, and updates the EXISTING landing keys it already renders
  (`landing_*`, `hero_*`) in place.
- Agent B owns new keys prefixed `b2c_cat_*` (categories), `b2c_co_*`
  (checkout), `b2c_deliv_*` (delivery mode).
- Agent C owns new keys prefixed `b2c_prod_*` (only if any product needs a UI
  label beyond the DB name; product names live in the DB, not i18n).
- When two agents need the same concept, the lower-letter agent defines the key
  and the other reuses it. Coordinate via this doc's tables, not by guessing.

---

## 1. Positioning / copy: before -> after

The old framing is "B2B morning supply for restaurants, order by 22:00,
delivered next morning 06:00-10:00, consolidated single drop." The new framing
is "groceries delivered fast to your door, in Kokand."

### 1a. Landing hero (`components/landing-client.tsx` + `lib/i18n.ts`)

The hero today reads these keys: `landing_badge`, `landing_h1_pre`,
`landing_h1_accent`, `landing_sub`, `landing_cta_catalog`, `landing_cta_orders`.
Agent A rewrites the VALUES of those existing keys in all three locales (keep the
keys; the component already renders them). New copy:

| Key | uz | ru | en |
|---|---|---|---|
| `landing_badge` | Qo'qonda tez yetkazib berish | Быстрая доставка в Коканде | Fast delivery in Kokand |
| `landing_h1_pre` | Mahsulotlar | Продукты | Groceries |
| `landing_h1_accent` | eshigingizgacha, tez | к вашей двери, быстро | to your door, fast |
| `landing_sub` | Olmadan tarvuzgacha, undan sutgacha — kunlik mahsulotlarni tanlang va eshigingizgacha tez yetkazib beramiz. Naqd pul bilan to'lang. | От яблока до арбуза, от муки до молока — выбирайте продукты на каждый день, а мы быстро привезём их к вашей двери. Оплата наличными. | From apples to watermelon, flour to milk — pick everyday groceries and we deliver them fast to your door. Pay with cash. |
| `landing_cta_catalog` | Mahsulotlarni ko'rish | Смотреть продукты | Browse groceries |
| `landing_cta_orders` | Buyurtmalarim | Мои заказы | My orders |

Hero card (the floating order card, keys `landing_order_label`,
`landing_order_date`, `landing_delivered`, `landing_total`, and `orderRows`):
- `landing_order_date` -> uz "Bugun · 35 daqiqada" / ru "Сегодня · за 35 минут" /
  en "Today · in 35 min".
- `orderRows` in the component: change the B2B bulk quantities ("Piyoz 10 kg",
  "Mol go'shti 8 kg") to consumer quantities (e.g. "Olma 1 kg", "Sut 1 L",
  "Non 2 dona", "Bodring 0.5 kg") and drop the supplier names or replace with a
  shop name; recompute the displayed total. These are inline literals in the
  component, not i18n keys (already per-locale objects).
- Hero stat tiles (`stats` array + keys `landing_stat_deadline`,
  `landing_stat_window`, `landing_stat_basket`, `landing_stat_delivery_cost`,
  and the hard-coded values `22:00`, `1`): replace with consumer stats. Suggested:
  `30-60` min ETA, free delivery over a threshold, fresh daily, cash on
  delivery. Update the four `landing_stat_*` label values accordingly:

| Key | uz | ru | en |
|---|---|---|---|
| `landing_stat_deadline` | Yetkazib berish | Доставка | Delivery time |
| `landing_stat_window` | Tez va yangi | Быстро и свежо | Fast and fresh |
| `landing_stat_basket` | Keng katalog | Большой каталог | Wide catalog |
| `landing_stat_delivery_cost` | Yetkazib berish | Доставка | Delivery fee |

(Change the corresponding `value` literals in the `stats` array: `"22:00"` ->
`"30-60"`, `"1"` -> something consumer-appropriate. Keep them token-styled.)

### 1b. How-it-works -> 3-step consumer flow

Today it is a 4-step B2B flow (`landing_step1..4_title/_desc`, eyebrow
"To'rt qadam", `landing_how_intro` mentioning restaurants). Agent A reduces the
rendered steps to **3** (Browse -> Order -> Fast delivery / live tracking).
Keep using `landing_step1..3_*` keys (rewrite values), and STOP rendering step 4
(leave `landing_step4_*` keys in i18n untouched to avoid churn; just don't map
them in the `steps` array). Update `landing_how_eyebrow`, `landing_how_title`,
`landing_how_intro` too.

New 3-step copy:

| Key | uz | ru | en |
|---|---|---|---|
| `landing_how_eyebrow` | Uch qadam | Три шага | Three steps |
| `landing_how_title` | Xarid qanday ishlaydi | Как работает Xarid | How Xarid works |
| `landing_how_intro` | Mahsulot tanlang, buyurtma bering, eshigingizda kuting. Hammasi telefoningizdan. | Выберите продукты, оформите заказ и ждите у двери. Всё с телефона. | Pick your groceries, place the order, and wait at your door. All from your phone. |
| `landing_step1_title` | Tanlang | Выбирайте | Browse |
| `landing_step1_desc` | Meva, sabzavot, sut, non va boshqa kunlik mahsulotlarni katalogdan tanlang. | Выбирайте фрукты, овощи, молочное, хлеб и другие продукты на каждый день. | Pick fruit, vegetables, dairy, bread and other everyday groceries from the catalog. |
| `landing_step2_title` | Buyurtma bering | Заказывайте | Order |
| `landing_step2_desc` | Manzilingizni kiriting va naqd pul bilan to'lashni tanlang — bir necha soniyada. | Укажите адрес и выберите оплату наличными — за пару секунд. | Enter your address and choose cash on delivery — in a few seconds. |
| `landing_step3_title` | Tez yetkazib berish | Быстрая доставка | Fast delivery |
| `landing_step3_desc` | Kuryer 30-60 daqiqada eshigingizgacha olib keladi. Buyurtmangizni kuzatib boring. | Курьер привезёт за 30-60 минут к вашей двери. Следите за заказом. | A courier brings it to your door in 30-60 minutes. Track your order live. |
| `landing_step_prefix` | Qadam | Шаг | Step |

(`landing_step_prefix` value unchanged; listed for completeness.)

The "community stat strip" (`landing_statstrip_*`) can stay; reword
`landing_statstrip_orders` to "yetkazilgan buyurtmalar / доставленных заказов /
orders delivered" (already close). Leave the segmented day/week/month range.

### 1c. Categories section (landing)

The `categories` array in `landing-client.tsx` currently lists 5 B2B-ish
categories. Agent A expands/relabels it to the consumer taxonomy in section 5
(Fruits, Vegetables, Dairy & Eggs, Bakery, Meat, Dry goods, Drinks). These are
inline per-locale objects in the component, plus `landing_categories_title`
("Mahsulot kategoriyalari" is fine; optionally "Kategoriyalar / Категории /
Categories"). Clicking a category should deep-link to `/catalog` (already does).

### 1d. Header / nav (`components/header.tsx`)

- Nav tabs `nav_catalog`/`nav_basket`/`nav_orders` stay (Catalog/Basket/Orders).
  Optionally relabel `nav_catalog` value to a more consumer "Mahsulotlar /
  Продукты / Groceries" — Agent A's call; if changed, update all 3 locales.
- The logo and Clerk gating block (`clerkEnabled ? ... : userName ? ... : ...`)
  are NOT touched (Clerk constraint). Only string values may change.

### 1e. Footer (`components/footer.tsx`)

Today the footer exposes a top-level `/supplier` link via
`supplier_portal_title`. The pivot demotes business entry points into a small
"For business / Couriers" group. Agent A restructures `navLinks`:
- Consumer links stay prominent: Catalog, Orders, (Basket optional).
- Add a de-emphasized business/courier cluster linking to `/auth?role=supplier`
  (or `/supplier`) and `/auth?role=driver` (or `/admin/login` for admin).
- New keys (Agent A namespace):

| Key | uz | ru | en |
|---|---|---|---|
| `b2c_foot_business` | Biznes uchun | Для бизнеса | For business |
| `b2c_foot_couriers` | Kuryerlar uchun | Курьерам | For couriers |
| `b2c_foot_tagline` | Qo'qonda tez yetkazib berish | Быстрая доставка в Коканде | Fast grocery delivery in Kokand |

The footer's tagline currently renders `hero_title_pre` + `hero_title_accent`
(legacy keys). Switch it to `b2c_foot_tagline` so it reads as a consumer slogan.

### 1f. Metadata (`app/layout.tsx`)

`metadata.title` / `metadata.description` are hard-coded B2B Uzbek strings.
Agent A rewrites them (root layout is not localized, so use a neutral UZ/EN
blend or UZ primary, matching the rest of the app):
- title: `Xarid — Qo'qonda tez yetkazib berish` (or "Xarid — grocery delivery
  in Kokand").
- description: consumer one-liner about fast everyday grocery delivery in
  Kokand, cash on delivery.

---

## 2. Onboarding: open consumer signup, demoted business/courier entry

### Goal
Signup is open to **everyone as a consumer by default**. Seller/courier/admin
sign-in remains reachable but de-emphasized.

### Current state
- `components/auth-client.tsx` already does phone + password sign-in/sign-up
  against `/api/auth/credentials`, then routes to `/catalog`. It is generic — no
  role gating. The ONLY B2B-ish smell is the name field copy
  (`ph_person_name` = "Ismingiz yoki muassasa nomi" / placeholder "Cafe
  Gulbahor"), which frames the account as a business.
- `app/auth/page.tsx` just renders `<AuthClient locale={locale} />`.

### Concrete edits (Agent A)
1. **Reframe the name field as a person, not a business.** In `auth-client.tsx`:
   - Replace the `ph_person_name` label usage with a new consumer key, and
     change the hard-coded placeholder (`"Cafe Gulbahor" / "Кафе Гульбахор"`) to
     a person-name placeholder via a key. New keys (Agent A namespace):

   | Key | uz | ru | en |
   |---|---|---|---|
   | `b2c_auth_name_label` | Ismingiz | Ваше имя | Your name |
   | `b2c_auth_name_ph` | Masalan: Dilnoza | Например: Дильноза | e.g. Dilnoza |
   | `b2c_auth_subtitle` | Buyurtma berish uchun kiring yoki ro'yxatdan o'ting | Войдите или зарегистрируйтесь, чтобы заказать | Sign in or sign up to order |

   - Replace the inline `locale === "uz" ? "Telefon raqami" : "Номер телефона"`
     and `"Parol"` ternaries with proper 3-locale keys (uz currently lacks `en`
     branch -> renders Russian for `en`). Add:

   | Key | uz | ru | en |
   |---|---|---|---|
   | `b2c_auth_phone_label` | Telefon raqami | Номер телефона | Phone number |
   | `b2c_auth_pass_label` | Parol | Пароль | Password |

   (Reuse existing `ph_phone`, `ph_password` for placeholders — already 3-locale.)
2. **Add a one-line consumer subtitle** under the logo using `b2c_auth_subtitle`
   so the page reads as a consumer login, not a B2B portal.
3. **Keep routing to `/catalog`** after auth (already correct for consumers).
4. **Business/courier entry stays reachable but is NOT the default.** Do not add
   a role selector to the main auth form. Instead:
   - The footer (section 1e) carries the demoted "For business / Couriers" links.
   - `/supplier`, `/admin/login`, `/driver` pages remain exactly as they are
     (Agent A does not touch them). They are reached via the footer cluster or
     direct URL.
   - Optional, low-risk: if `app/auth/page.tsx` receives `?role=supplier` or
     `?role=driver`, show a tiny helper line linking to the relevant portal.
     This is optional polish; the default form is always consumer.

No backend/auth route changes. `/api/auth/credentials` is role-agnostic and the
`User` default role is already `OWNER` (a fine default for a consumer account;
do NOT add new roles or migrations here).

---

## 3. Catalog / cart / checkout UX (Yandex-Eats style)

Owner: **Agent B**. Files: `components/catalog-client.tsx`,
`components/customer/category-strip.tsx`,
`components/customer/product-card-immersive.tsx`, `components/basket-client.tsx`,
`app/catalog/page.tsx` (data shape only if needed), `app/api/orders/route.ts`
(checkout fields), `lib/delivery.ts` (shared with section 4).

### 3a. Category navigation (rail / grid)
- `catalog-client.tsx` already derives categories from the DB
  (`dbCategories`) and renders `<CategoryStrip>`. The `CATEGORY_MAP` in that file
  hard-codes the uz/ru/en labels + emoji per DB category string. **Agent B must
  extend `CATEGORY_MAP` to cover EVERY new category string Agent C seeds**
  (section 5). Keys are the exact `category` strings stored on `Product`. If a
  category has no map entry it falls back to the raw string + box emoji — avoid
  that by keeping the two lists in sync (coordinate with Agent C via section 5).
- Make the category strip feel like Lavka: horizontally scrollable pill rail on
  mobile (already a strip), optional 2-row grid on the landing. Keep the
  existing "all / none selected = show everything" behavior.

### 3b. Product grid + search
- The product grid (`ImmersiveProductCard` in a responsive grid) and the search
  box already exist and work. Keep them. Ensure search matches both
  `name`/`altName` (already does) so Uzbek and Russian queries both hit.
- Update `search_placeholder` examples to consumer items if desired (currently
  "piyoz, guruch, sut" — fine; could add "olma, non"). 3-locale.

### 3c. Quantity steppers
- The cart already has +/- steppers (`basket-client.tsx`). Yandex-style also
  puts a stepper **on the product card** once an item is in the basket. The
  product card component (`product-card-immersive.tsx`) currently has an
  add-to-basket affordance; Agent B should make it show a +/- stepper when
  `qty > 0` (read from `useBasket`). This is an enhancement, not required for the
  pivot to function — do it if time allows, using existing basket state.

### 3d. Sticky cart
- The floating bottom basket bar already exists in `catalog-client.tsx`
  (`count > 0` -> fixed bottom pill linking to `/basket`). Keep it; this is the
  Yandex "cart" affordance. No change required beyond styling polish.

### 3e. Consumer checkout (`basket-client.tsx`)
This is the biggest UX change. Today the checkout collects **org name**, phone,
address, and a **day + 2h window** (B2B). Rework to consumer:

1. **Field relabel: "Organization name" -> recipient name.** The first field
   uses `basket_field_org` (label "Tashkilot nomi") and `ph_org` placeholder.
   Replace with a person/name field:

   | Key | uz | ru | en |
   |---|---|---|---|
   | `b2c_co_name_label` | Ismingiz | Ваше имя | Your name |
   | `b2c_co_name_ph` | Masalan: Dilnoza | Например: Дильноза | e.g. Dilnoza |

   The state var `org` can keep its name internally (sent as `buyerName` to the
   API — the API field name is fine and unchanged), only the visible label/ph
   change.
2. **Address** stays (`basket_field_address` / `ph_address`). Consider adding a
   second line for flat/entrance/landmark; optional. If added, append it to the
   address string before POST (no schema change).
3. **Delivery mode selector (ASAP vs later)** — see section 4. Replaces the
   always-shown day+window block with: ASAP selected by default; "deliver later"
   reveals the existing date + slot picker.
4. **Payment: cash on delivery only.** The existing `pay_note` warning box
   currently says "cash on delivery or bank transfer." Reword `pay_note` to
   cash-only:

   | Key | uz | ru | en |
   |---|---|---|---|
   | `pay_note` (reword) | To'lov: yetkazib berishda naqd pul. | Оплата: наличными при получении. | Payment: cash on delivery. |

   (This is an existing key shared with `orders-client` semantics — reword in
   place in all 3 locales. Drop the "transfer" mention.)
5. **Summary copy.** `basket_delivery_free` / `dt_summary_label` stay; keep
   "free delivery" if that is the policy, otherwise show a flat fee (no new
   payment gateway — fee is informational, still paid in cash).
6. **Order API (`app/api/orders/route.ts`).** Accept a new additive
   `deliverMode` field (`"ASAP" | "SCHEDULED"`, default `"ASAP"`). When ASAP,
   skip `resolveDeliveryWindow` and set `deliveryDate = now + ~45 min`,
   `deliverySlot = null`. When SCHEDULED, keep the current
   `resolveDeliveryWindow` path. Persist `deliverMode` on `Order` (section 4
   schema diff). Keep server-side price recomputation exactly as-is. The
   client basket already sends `buyerName/buyerPhone/address/items`; add
   `deliverMode` and only send `deliveryDate/deliverySlot` when SCHEDULED.

### 3f. Empty/zero states
Existing empty-basket and empty-catalog states are fine; just ensure any
reworded copy stays 3-locale.

---

## 4. Delivery model: ASAP default, scheduled = "deliver later"

Owner: **Agent B** (UI + API) with the `lib/delivery.ts` addition; coordinate
with **Agent C** if C also edits `prisma/schema.prisma` (additive, re-read first).

### Decision
- Default `deliverMode = "ASAP"`: deliver as soon as possible (~30-60 min). UI
  shows an ETA pill, no date/slot picker.
- `deliverMode = "SCHEDULED"` ("deliver later"): reuse the existing
  `DELIVERY_SLOTS` day + 2h window picker (`lib/delivery.ts`,
  `resolveDeliveryWindow`). KEEP all of it.
- Backend cron / 22:00 cutoff / `PurchaseOrder` / `lib/scheduler.ts` are NOT
  surfaced to consumers and NOT changed. They keep running for fulfillment.

### `lib/delivery.ts` additions (append-only)
Add, without removing anything:
```ts
export type DeliverMode = "ASAP" | "SCHEDULED";
export const DEFAULT_DELIVER_MODE: DeliverMode = "ASAP";

// ASAP target window in minutes (for ETA display + deliveryDate computation).
export const ASAP_ETA_MIN = 30;
export const ASAP_ETA_MAX = 60;

/** deliveryDate for an ASAP order: now + ASAP_ETA_MAX minutes. */
export function asapDeliveryDate(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setMinutes(d.getMinutes() + ASAP_ETA_MAX);
  return d;
}
```

### Order API behavior (`app/api/orders/route.ts`)
- Read `body.deliverMode`; default to `"ASAP"` when absent (legacy callers stay
  working — current callers omit it -> ASAP, which is the new default).
- ASAP: `deliveryDate = asapDeliveryDate()`, `deliverySlot = null`,
  `deliverMode = "ASAP"`.
- SCHEDULED: keep `resolveDeliveryWindow(deliveryDate, deliverySlot)`; persist
  `deliverMode = "SCHEDULED"`. If the window is invalid, fall back to ASAP
  rather than the old tomorrow-morning default (cleaner for consumers), or
  return 400 — Agent B's call; document it.

### New i18n (Agent B namespace `b2c_deliv_*`)
| Key | uz | ru | en |
|---|---|---|---|
| `b2c_deliv_section` | Yetkazib berish | Доставка | Delivery |
| `b2c_deliv_asap` | Imkon qadar tez | Как можно скорее | As soon as possible |
| `b2c_deliv_asap_eta` | 30-60 daqiqa | 30-60 минут | 30-60 min |
| `b2c_deliv_later` | Keyinroq yetkazish | Доставить позже | Deliver later |
| `b2c_deliv_later_hint` | Kun va vaqt oralig'ini tanlang | Выберите день и интервал | Choose a day and time window |

The existing `dt_*` keys (date label, window label, errors) are reused inside
the "deliver later" branch — do NOT delete them.

### Schema diff (additive, minimal)
`prisma/schema.prisma`, model `Order`, add ONE nullable field (safe `db push`
on live Neon rows; coordinate re-read with whoever else edits the schema):
```prisma
  // Consumer pivot: "ASAP" (on-demand) or "SCHEDULED" (deliver-later window).
  // Nullable for additive db push; null/legacy rows are treated as SCHEDULED
  // (they carry a deliverySlot) or ASAP if deliverySlot is also null.
  deliverMode  String?  @default("ASAP")
```
After the edit: `npx prisma db push` (do NOT commit any local db file). One
schema only here (`schema.prisma`, provider=postgresql) — there is no separate
sqlite schema in this repo.

---

## 5. Products & categories: consumer grocery taxonomy + SKUs

Owner: **Agent C**. Files: `lib/seed.ts` (the `SKUS`, `SUPPLIERS`,
`CATEGORY` strings), `lib/product-emoji.ts` (emoji keywords + category
fallback), and coordinate category labels with Agent B's `CATEGORY_MAP` in
`catalog-client.tsx`, plus the landing `categories` array (Agent A).

### Category taxonomy (DB `category` string -> labels)
Keep stable Latin-Uzbek strings as the canonical DB value (that is the existing
convention; `catalog-client.tsx` maps them to localized labels). Use these
exact category strings so all three label maps line up:

| DB category string | uz | ru | en | emoji |
|---|---|---|---|---|
| `Mevalar` | Mevalar | Фрукты | Fruits | 🍎 |
| `Sabzavotlar` | Sabzavotlar | Овощи | Vegetables | 🥬 |
| `Sut va tuxum` | Sut va tuxum | Молочное и яйца | Dairy & Eggs | 🥛 |
| `Non` | Non mahsulotlari | Выпечка | Bakery | 🥖 |
| `Go'sht` | Go'sht | Мясо | Meat | 🥩 |
| `Quruq mahsulotlar` | Bakaleya | Бакалея | Dry goods | 🌾 |
| `Ichimliklar` | Ichimliklar | Напитки | Drinks | 🧃 |

Note `Sabzavotlar`, `Go'sht`, `Quruq mahsulotlar`, `Ichimliklar` already exist
in seed + `CATEGORY_MAP`. NEW strings to add to BOTH maps: `Mevalar`,
`Sut va tuxum` (or keep existing `Sut mahsulotlari` and just add `Mevalar` +
`Non` — Agent C decides, but whatever strings ship must appear in
`CATEGORY_MAP`, the landing `categories` array, and `product-emoji.ts`
`CATEGORY_FALLBACK`). Decision for build: **rename dairy category to
`Sut va tuxum`** to include eggs, and **add `Mevalar` and `Non`**.

### SKU list (~40 everyday SKUs, expand `SKUS` in `lib/seed.ts`)
Each entry: `{ nameUz, nameRu, category, unit, baseCost }`. Units already
supported: `KG | PIECE | LITER | BLOCK`. Consumer-scale `minQty` (the seed
already sets `minQty = unit === "KG" ? 1 : 0`; keep, so 1 kg / 1 piece minimums
are consumer-friendly). Prices in UZS are illustrative; round to nearest 100 via
the existing `round100`.

Mevalar (Fruits):
| nameUz | nameRu | category | unit | baseCost |
|---|---|---|---|---|
| Olma | Яблоки | Mevalar | KG | 12000 |
| Banan | Бананы | Mevalar | KG | 22000 |
| Tarvuz | Арбуз | Mevalar | KG | 5000 |
| Qovun | Дыня | Mevalar | KG | 7000 |
| Uzum | Виноград | Mevalar | KG | 18000 |
| Apelsin | Апельсины | Mevalar | KG | 20000 |
| Limon | Лимоны | Mevalar | KG | 24000 |
| Nok | Груши | Mevalar | KG | 16000 |

Sabzavotlar (Vegetables):
| Bodring | Огурцы | Sabzavotlar | KG | 10000 |
| Pomidor | Помидоры | Sabzavotlar | KG | 12000 |
| Kartoshka | Картофель | Sabzavotlar | KG | 6000 |
| Piyoz | Лук репчатый | Sabzavotlar | KG | 4000 |
| Sabzi | Морковь | Sabzavotlar | KG | 5000 |
| Sarimsoq | Чеснок | Sabzavotlar | KG | 25000 |
| Bulg'or qalampiri | Болгарский перец | Sabzavotlar | KG | 18000 |
| Ko'katlar | Зелень | Sabzavotlar | PIECE | 5000 |

Sut va tuxum (Dairy & Eggs):
| Sut (1L) | Молоко (1л) | Sut va tuxum | PIECE | 12000 |
| Kefir (1L) | Кефир (1л) | Sut va tuxum | PIECE | 13000 |
| Qaymoq (500g) | Сметана (500г) | Sut va tuxum | PIECE | 18000 |
| Tvorog | Творог | Sut va tuxum | KG | 35000 |
| Pishloq | Сыр | Sut va tuxum | KG | 85000 |
| Sariyog' | Масло сливочное | Sut va tuxum | KG | 95000 |
| Tuxum (10 dona) | Яйца (10 шт) | Sut va tuxum | BLOCK | 16000 |
| Yogurt | Йогурт | Sut va tuxum | PIECE | 8000 |

Non (Bakery):
| Non (patir) | Лепёшка | Non | PIECE | 4000 |
| Baton non | Батон | Non | PIECE | 5000 |
| Bulochka | Булочка | Non | PIECE | 3000 |
| Lavash | Лаваш | Non | PIECE | 4000 |

Go'sht (Meat):
| Mol go'shti | Говядина | Go'sht | KG | 95000 |
| Qo'y go'shti | Баранина | Go'sht | KG | 110000 |
| Tovuq (butun) | Курица (целая) | Go'sht | KG | 38000 |
| Tovuq filesi | Куриное филе | Go'sht | KG | 52000 |
| Qiyma | Фарш | Go'sht | KG | 85000 |

Quruq mahsulotlar (Dry goods):
| Un (oliy nav) | Мука высший сорт | Quruq mahsulotlar | KG | 7000 |
| Guruch (lazer) | Рис лазер | Quruq mahsulotlar | KG | 16000 |
| Shakar | Сахар | Quruq mahsulotlar | KG | 12500 |
| Tuz | Соль | Quruq mahsulotlar | KG | 2500 |
| Makaron | Макароны | Quruq mahsulotlar | KG | 11000 |
| O'simlik yog'i (1L) | Подсолнечное масло (1л) | Quruq mahsulotlar | PIECE | 22000 |

Ichimliklar (Drinks):
| Suv (1.5L) | Вода (1.5л) | Ichimliklar | PIECE | 5000 |
| Ko'k choy (80g) | Чай зелёный (80г) | Ichimliklar | PIECE | 9000 |
| Qora choy (80g) | Чай чёрный (80г) | Ichimliklar | PIECE | 9500 |
| Sharbat (1L) | Сок (1л) | Ichimliklar | PIECE | 14000 |
| Gazli ichimlik (1.5L) | Газировка (1.5л) | Ichimliklar | PIECE | 12000 |

That is ~42 SKUs. **Explicitly included per the brief: Olma (apple), Tarvuz
(watermelon), Bodring (cucumber), Un (flour).** Banana, milk, eggs, bread,
rice, sugar, chicken, water, tea, tomato, potato, onion, apple all present.

### `lib/seed.ts` supplier mapping
The seed assigns offers per supplier by category (`SUPPLIERS[].categories`).
Agent C must add the new category strings (`Mevalar`, `Sut va tuxum`, `Non`) to
at least one supplier's `categories` array so every SKU gets at least one offer
(the catalog only shows products with `offers.length > 0`). Suggested: rename
the supplier set to consumer-friendly shop names (e.g. "Qo'qon Bozor", "Lavka
Fresh") — these are inline literals, but keep them ASCII-safe; they appear in
the cart grouped by "supplier" (acts as the fulfilling shop, Yandex-style).
Keep `TAKE_RATE` and the cost/price math unchanged.

### `lib/product-emoji.ts`
Add keyword rows for new SKUs so cards have emoji without photos:
`olma|яблок -> 🍎`, `banan|банан -> 🍌`, `tarvuz|арбуз -> 🍉`, `qovun|дыня -> 🍈`,
`uzum|виноград -> 🍇`, `apelsin|апельсин -> 🍊`, `limon|лимон -> 🍋`,
`nok|груш -> 🍐`, `kefir|кефир -> 🥛`, `yogurt|йогурт -> 🥛`,
`non|лепёшк|батон|bulochka|булочк|lavash|лаваш -> 🍞`/`🥖`,
`suv|вода -> 💧`, `sharbat|сок -> 🧃`, `gazli|газиров -> 🥤`,
`kartoshka|картоф -> 🥔`. And update `CATEGORY_FALLBACK` for the new category
strings (`Mevalar -> 🍎`, `Sut va tuxum -> 🥛`, `Non -> 🍞`).

---

## 6. KEEP vs HIDE vs CHANGE (no agent deletes the fulfillment backend)

| Area | Verdict | Notes |
|---|---|---|
| `Organization` type SUPPLIER + `/supplier/*` pages | **KEEP** | Behind-the-scenes shops. Reachable via footer "For business". Not deleted. |
| `User` role DRIVER + `/driver/*` pages | **KEEP** | Couriers. Reachable via footer "For couriers". |
| Admin pages `/admin/*` (+ `/admin/login`) | **KEEP** | Ops dashboard. Reachable by URL / footer. |
| `lib/scheduler.ts`, 22:00 cutoff, `PurchaseOrder` model | **KEEP** | Fulfillment cron. NOT surfaced to consumers. No edits. |
| `Payment`, `LedgerEntry`, `Payout` models + `lib/payments/*` | **KEEP** | Untouched (project policy: no new gateway; existing models stay). |
| Order pay links in `orders-client.tsx` (Uzum/Paynet) | **KEEP** | Already env-gated (render only if URL builder returns non-null). Leave as-is; consumer default is cash. |
| `lib/delivery.ts` `DELIVERY_SLOTS` + `resolveDeliveryWindow` | **KEEP + extend** | Becomes the "deliver later" path; add ASAP helpers (section 4). |
| `Order.deliverySlot` | **KEEP** | Used by SCHEDULED orders + legacy display. |
| Clerk: `clerk-gate.tsx`, `middleware.ts`, `lib/clerk.ts`, gating in header/layout | **KEEP, DO NOT TOUCH** | Build must stay green with no keys. |
| `app/not-found.tsx`, `app/loading.tsx`, `app/error.tsx` | **KEEP** | Don't touch. |
| Landing hero/how-it-works/categories copy | **CHANGE** | B2B -> consumer (section 1). |
| Header `nav_catalog` label (optional), metadata | **CHANGE** | Consumer framing (section 1d/1f). |
| Footer top-level `/supplier` link | **CHANGE** | Demote into "For business / Couriers" cluster (section 1e). |
| Auth name field copy (org -> person), subtitle | **CHANGE** | Consumer onboarding (section 2). |
| Checkout: org field -> recipient name; window block -> ASAP/later; pay note -> cash only | **CHANGE** | Consumer checkout (section 3e). |
| `lib/seed.ts` SKUs/categories, `product-emoji.ts`, `CATEGORY_MAP`, landing categories | **CHANGE** | Broad grocery catalog (section 5). |
| `Order` model | **CHANGE (additive only)** | Add nullable `deliverMode` (section 4). |
| B2B "order by 22:00 / next-morning 06:00-10:00" framing in CONSUMER UI | **HIDE** | Remove from landing/checkout copy; backend cutoff stays. |
| Supplier-name grouping in cart | **KEEP (reframe)** | Reads as the fulfilling shop, Yandex-style; rename seeded suppliers to shop names. |

---

## 7. Build-agent task split (non-overlapping file ownership)

### Agent A — Onboarding + Landing + Positioning
Owns and edits:
- `components/landing-client.tsx` (hero, stats, 3-step how-it-works, categories
  array, hero card rows/total).
- `components/header.tsx` (string values only; NOT the Clerk gating block).
- `components/footer.tsx` (demote business/courier links; tagline).
- `components/auth-client.tsx` + `app/auth/page.tsx` (consumer name field,
  subtitle, 3-locale phone/password labels; optional `?role=` helper).
- `app/layout.tsx` (metadata title/description ONLY; nothing else).
- `lib/i18n.ts`: rewrite existing `landing_*`, `hero_*`, `pay_note` (coordinate
  with B on `pay_note` — A may do it since it is small; pick one owner), and add
  new keys `b2c_land_*`, `b2c_nav_*`, `b2c_foot_*`, `b2c_auth_*`.
i18n namespaces: `b2c_land_*`, `b2c_foot_*`, `b2c_auth_*` + in-place rewrites of
`landing_*` values.

### Agent B — Catalog + Cart + Checkout + Delivery mode
Owns and edits:
- `components/catalog-client.tsx` (extend `CATEGORY_MAP` to all seeded
  categories; category rail polish; search placeholder).
- `components/customer/category-strip.tsx`,
  `components/customer/product-card-immersive.tsx` (rail UX; optional on-card
  stepper).
- `components/basket-client.tsx` (org->recipient name; ASAP/later delivery
  selector wired to `lib/delivery.ts`; pay note cash-only; POST `deliverMode`).
- `app/api/orders/route.ts` (accept `deliverMode`, ASAP path).
- `lib/delivery.ts` (append ASAP helpers; do NOT remove slot logic).
- `prisma/schema.prisma` (add nullable `Order.deliverMode`; re-read first).
- `lib/i18n.ts`: add `b2c_cat_*`, `b2c_co_*`, `b2c_deliv_*`; the consumer
  checkout label keys (`b2c_co_name_*`).
i18n namespaces: `b2c_cat_*`, `b2c_co_*`, `b2c_deliv_*`.

### Agent C — Products + Categories + Orders display
Owns and edits:
- `lib/seed.ts` (the ~42-SKU grocery catalog, new category strings, supplier ->
  shop renaming + category coverage).
- `lib/product-emoji.ts` (new keyword + category-fallback rows).
- `components/orders-client.tsx` + `app/orders/page.tsx` (consumer order display:
  show ASAP "today, in ~45 min" vs scheduled window; keep cash-on-delivery
  status; keep reorder; the Uzum/Paynet links already env-gated — leave). If
  `deliverMode` is added, format ASAP orders' `deliveryDate` as a relative ETA
  string (3-locale) instead of a fixed window.
- After seed edits: run the seed against the live Neon DB
  (`npx prisma db seed` or the project's seed command) so the new catalog shows.
- `lib/i18n.ts`: add `b2c_prod_*` / order-display keys
  (e.g. `b2c_ord_asap`, `b2c_ord_eta`) for ETA text.
i18n namespaces: `b2c_prod_*`, `b2c_ord_*`.

### Shared-file protocol (`lib/i18n.ts`, `prisma/schema.prisma`)
1. Re-read the file immediately before editing.
2. Add keys/models ONLY in your namespace; never delete or rename another
   agent's keys/models.
3. Category label strings (`CATEGORY_MAP` in B, `CATEGORY_FALLBACK` in C, landing
   `categories` in A) MUST use the exact same DB category strings from section 5.
   Treat section 5's table as the single source of truth.
4. `pay_note` reword: single owner (Agent A) to avoid a double-edit conflict.
5. After any schema edit: `npx prisma db push`. Never commit a local db file.
6. Each agent runs `NODE_ENV=production npx next build` (or the repo's build
   command) before handing off; the build must be green with NO Clerk keys set.

---

## 8. Acceptance checklist (per the orchestrator's decisions)
- [ ] Landing/header/footer/meta read as consumer grocery delivery in Kokand;
      no "order by 22:00 / next-morning" language in consumer UI.
- [ ] Anyone can sign up as a consumer with no business gating; business/courier
      entry is reachable but demoted to the footer.
- [ ] Catalog has category rail + product grid + search + sticky cart; checkout
      collects recipient name + address + ASAP-or-later + cash on delivery.
- [ ] ASAP is the default delivery mode; "deliver later" reuses the existing
      day+window picker; backend cutoff/PO/scheduler untouched.
- [ ] ~40 everyday SKUs across Fruits/Vegetables/Dairy&Eggs/Bakery/Meat/Dry
      goods/Drinks, including apple, watermelon, cucumber, flour; catalog shows
      them (each has >=1 offer).
- [ ] Seller/courier/admin pages + Payment/Ledger/Payout/PurchaseOrder models
      still present and functional; nothing deleted.
- [ ] Every new/changed visible string exists in uz/ru/en; semantic tokens only;
      reduced-motion respected; build green with no Clerk keys.
