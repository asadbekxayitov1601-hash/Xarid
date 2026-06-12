# Xarid Account Architecture (Agent 2)

Status: design spec. Single source of truth for the dual-account model and the auth /
routing / role-gating contract that other agents (3 Customer, 4 Deliver, 5 Logistics)
implement against.

The public mental model is intentionally simple:

- **Customer account** — restaurant / cafe / chaikhana / market owner. They buy inventory.
- **Deliver account** — the seller / distributor of products. They list products, see
  analytics, and write their company profile.

Internally these map to existing enum values already in the schema. Drivers exist but are
NOT exposed in the public role picker — they are provisioned by Logistics (Agent 5).

---

## 1. Role taxonomy

`Organization.type` and `User.role` are stored as plain strings (no enum in Prisma — the
sqlite provider does not support enums, see `prisma/schema.prisma:9`). Treat them as the
following closed sets:

| Public label | UZ label | RU label | EN label | `Organization.type` | `User.role` | Surface |
|---|---|---|---|---|---|---|
| Customer (Restoran / Magazin) | Restoran / Magazin | Ресторан / Магазин | Restaurant / Store | `BUYER` | `OWNER` or `STAFF` | `/catalog`, `/basket`, `/orders` |
| Deliver (Sotuvchi) | Sotuvchi | Поставщик | Seller / Supplier | `SUPPLIER` | `OWNER` or `STAFF` | `/supplier` |
| Driver (internal) | Haydovchi | Курьер | Driver | (no Org, or attached to a SUPPLIER) | `DRIVER` | `/driver/orders` |
| Admin (internal) | Admin | Админ | Admin | n/a | `ADMIN` | `/admin` |

Implementation notes per role:

### Customer (BUYER)
- Can: browse `/catalog`, add items to the basket, place orders, view their own order
  history at `/orders`, top up / pay an order through the existing `Payment` flow.
- Cannot: see other customers' orders, see supplier cost prices (`SupplierOffer.costPrice`),
  see the admin or supplier dashboards.
- Default landing after sign-up / sign-in: `/catalog`.

### Deliver (SUPPLIER)
- Can: edit their `SupplierOffer` rows (price, availability, minQty, imageUrl on the
  underlying `Product`), see `PurchaseOrder` slices addressed to them, confirm or reject
  PO lines, see their own analytics, edit their public company profile (about, logo).
- Cannot: see other suppliers' offers or PO totals, access `/admin`, access `/driver`.
- Default landing after sign-up / sign-in: `/supplier`.

### Driver (internal)
- Provisioned by an admin from `/admin/drivers`. Linked to a `User` row whose `role =
  DRIVER` via `Driver.userId`. Bound to a Telegram identity through `Driver.botCode` (see
  `prisma/schema.prisma:79`).
- Not selectable from the public role picker — the sign-up UI shows two cards only.
- Default landing: `/driver/orders`.

### Admin (internal)
- Provisioned by setting `User.role = ADMIN` directly in the DB (or via `/api/setup`).
- Default landing: `/admin`.

---

## 2. Sign-up flow

New file: **`app/auth/role/page.tsx`** — the immersive role picker.

```
/  ─────────────► /auth (sign-in / sign-up tabs)
                     │ user picks "Sign up"
                     ▼
                  /auth/role  (two-card picker)
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
  Restoran / Magazin         Sotuvchi
  (BUYER)                    (SUPPLIER)
        │                         │
        ▼                         ▼
  /auth/signup?type=BUYER    /auth/signup?type=SUPPLIER
  collects:                  collects:
    - name                     - company name
    - phone                    - phone
    - password                 - district
    - org name (cafe)          - password
    - district                 - about (short text)
        │                         │
        ▼                         ▼
  POST /api/auth/credentials  POST /api/auth/credentials
  (mode=signup, type=BUYER)   (mode=signup, type=SUPPLIER)
        │                         │
        ▼                         ▼
     /catalog                  /supplier
```

### Role picker UI

`app/auth/role/page.tsx` renders two large cards using the existing 3D primitives:

- `components/tilt-card.tsx` for the lift-on-hover effect.
- `components/scroll-reveal.tsx` for entry animation.
- `app/globals.css` classes `glass-card`, `card-3d`, `glow-button`, `scene-perspective`,
  `depth-2`, `float-a` for the ambient motion already defined in the project.

Two cards side-by-side on desktop, stacked on mobile (mobile-first):

```
┌──────────────────────────┐  ┌──────────────────────────┐
│ Restoran / Magazin       │  │ Sotuvchi                 │
│ (icon: Store)            │  │ (icon: Package)          │
│ "Mahsulot olmoqchiman"   │  │ "Mahsulot sotmoqchiman"  │
│ → glow-button "Tanlash"  │  │ → glow-button "Tanlash"  │
└──────────────────────────┘  └──────────────────────────┘
```

The card click sets `?type=BUYER` or `?type=SUPPLIER` and navigates to the signup form.
Both cards must respect `prefers-reduced-motion` — the tilt/float classes already do this
in `globals.css`.

### Sign-up form

Reuse `components/auth-client.tsx` but extend it so the signup mode reads `type` from the
search params. New fields collected per type:

- Both types: `name` (person / business), `phone`, `password`.
- Customer: `orgName`, `district` (already collected as separate fields in the basket
  checkout — moving them upstream removes friction at checkout).
- Deliver: `companyName`, `district`, `about` (short pitch, stored in
  `Organization.about` — new column, see section 5).

### Backend signup change

`app/api/auth/credentials/route.ts` currently creates a `User` only. Extend it so that
when `body.type === "BUYER"` or `body.type === "SUPPLIER"` and `mode === "signup"`, it
also creates the matching `Organization` row and attaches the new user as `OWNER`:

```ts
// Pseudocode — see app/api/auth/credentials/route.ts:20
if (mode === "signup") {
  const type = body.type === "SUPPLIER" ? "SUPPLIER" : "BUYER";
  const org = await prisma.organization.create({
    data: {
      type,
      name: orgName,
      district,
      phone,
      about: type === "SUPPLIER" ? about : null,
    },
  });
  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash: hashPassword(password),
      name: name || null,
      role: "OWNER",
      orgId: org.id,
    },
  });
  await setSession(user.id);
  return NextResponse.json({ ok: true, redirect: type === "SUPPLIER" ? "/supplier" : "/catalog" });
}
```

The client then reads `redirect` from the response and calls `router.push(redirect)`.

---

## 3. Sign-in flow

Keep one form at `/auth` — no separate Customer / Deliver sign-in. The change is purely
in the post-success router.push.

Edits to `components/auth-client.tsx`:

- After a successful POST, do not hard-code `router.push("/catalog")` (current line 38).
- Read `redirect` from the JSON response and push that. Server decides the destination
  based on `User.role` and `Organization.type`.

Edits to `app/api/auth/credentials/route.ts`:

- After `setSession(user.id)` in the `signin` branch, look up the org and reply with:
  - `role === "ADMIN"` → `/admin`
  - `role === "DRIVER"` → `/driver/orders`
  - `org?.type === "SUPPLIER"` → `/supplier`
  - else → `/catalog`

This is the single routing rule the whole app uses post-auth. Document it as the
"`destinationForUser(user)`" helper in `lib/session.ts` (see next section) and reuse it
from middleware if Agent 5 adds one.

---

## 4. Role gating

### Helpers in `lib/session.ts`

The project already has three guards in separate files. Consolidate them into named
exports off `lib/session.ts` so callers can write
`import { requireBuyer, requireSupplier, requireDriver, requireAdmin } from "@/lib/session"`.

Add (do not remove the existing functions — re-export them):

```ts
// lib/session.ts (additions)
export async function requireBuyer() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/auth");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { org: true },
  });
  if (!user || (user.org && user.org.type !== "BUYER")) redirect("/");
  return { user, org: user.org };
}

export async function requireSupplier() { /* moved from lib/supplier.ts */ }
export async function requireDriver()   { /* moved from lib/driver-auth.ts */ }
export async function requireAdmin()    { /* moved from lib/admin.ts */ }

export function destinationForUser(user: { role: string; org?: { type: string } | null }) {
  if (user.role === "ADMIN")  return "/admin";
  if (user.role === "DRIVER") return "/driver/orders";
  if (user.org?.type === "SUPPLIER") return "/supplier";
  return "/catalog";
}
```

Keep `lib/supplier.ts`, `lib/driver-auth.ts`, `lib/admin.ts` as thin re-export shims for
back-compat so existing imports keep working — no big-bang rewrite.

### Per-role layouts (route groups)

Next.js 15 app-router route groups (parenthesized folder names) are the right fit here.
They group routes under a shared layout without affecting the URL.

I verified that `app/admin/layout.tsx` already exists as a per-section layout (no group).
For Agent 3 and Agent 4 we want the same pattern but with a server-side guard at the
layout level so every nested page inherits it:

```
app/
  (customer)/
    layout.tsx          ← server component, calls requireBuyer()
    catalog/page.tsx    ← move from app/catalog/page.tsx
    basket/page.tsx     ← move from app/basket/page.tsx
    orders/page.tsx     ← move from app/orders/page.tsx
  (supplier)/
    layout.tsx          ← server component, calls requireSupplier()
    supplier/page.tsx   ← move from app/supplier/page.tsx
    supplier/profile/page.tsx  ← new (Agent 4)
    supplier/analytics/page.tsx ← new (Agent 4)
  (driver)/
    layout.tsx          ← server component, calls requireDriver()
    driver/orders/...   ← move from app/driver/orders/*
  admin/                ← keep as-is (already grouped under app/admin)
    layout.tsx
  auth/
    page.tsx            ← public
    role/page.tsx       ← public (new)
  page.tsx              ← public landing
```

Caveats:

1. `/catalog` is currently accessible to anonymous users (the landing page CTAs link
   straight there). Keep the URL public-readable but gate add-to-basket and checkout
   behind a session check. Implementation: the `(customer)/layout.tsx` should NOT call
   `requireBuyer()` for `/catalog` itself — instead only `(customer)/basket` and
   `(customer)/orders` require auth, and the basket provider checks the session before
   posting an order. Two route groups inside `(customer)`:
   - `app/(customer)/(public)/catalog/page.tsx` — no guard.
   - `app/(customer)/(private)/{basket,orders}/page.tsx` — `requireBuyer()` in the inner
     layout.
2. `requireBuyer()` should redirect a SUPPLIER user to `/supplier`, not `/`. That keeps
   the UX honest when a deliver-account person accidentally hits `/orders`. Use
   `destinationForUser(user)` to compute the redirect target.

### Server actions and API routes

Every server action that mutates supplier data calls `requireSupplier()` first
(`app/supplier/actions.ts` already does this — keep the pattern). New routes must follow:

- Customer mutations: `requireBuyer()`.
- Supplier mutations: `requireSupplier()`.
- Driver mutations: `requireDriver()`.
- Admin mutations: `requireAdmin()`.

No exceptions. Public API routes (lead capture, telegram webhook) live under `/api/leads`
and `/api/bot` and are explicitly unauthenticated — flag this in the route handler with a
short comment.

---

## 5. Schema diffs

Inspected `prisma/schema.prisma`. The role split itself needs **no migration** —
`Organization.type` already encodes BUYER vs SUPPLIER. Two small additions for Agent 4's
supplier profile surface:

```prisma
// prisma/schema.prisma — Organization (additions)
model Organization {
  id        String   @id @default(cuid())
  type      String
  name      String
  district  String
  phone     String
  botCode   String   @unique @default(cuid())
  about     String?  // NEW — supplier "about the company" text (markdown-lite)
  logoUrl   String?  // NEW — supplier logo (data URL or external)
  createdAt DateTime @default(now())
  // ... existing relations unchanged
}
```

Notes:

- Both fields are optional, so `db push` against the dev sqlite DB and the prod Postgres
  branch is safe (no backfill required).
- Do NOT add `@unique` to anything new on `User` — the project guide warns this can break
  `db push` on existing prod data. The existing `User.phone @unique` is already enforced
  and we are not changing it.
- No new tables. No new enums (the project deliberately uses string columns for portability
  between sqlite-dev and postgres-prod).
- `Lead.role` already has values `"BUYER"` and `"SUPPLIER"` (see `prisma/schema.prisma:198`)
  — these match the role picker labels, so the lead-capture flow keeps working without a
  data migration.

`schema.prod.prisma` does not exist in this project (Dasturkhon has one; Xarid uses a
single `schema.prisma` per `prisma/schema.prisma:9` — the provider is `sqlite` in dev and
the team swaps `DATABASE_URL` for Postgres in prod). The two new columns work in both.

After editing the schema, run:

```
npx prisma db push     # dev (sqlite at prisma/dev.db)
npx prisma generate
```

In production: `npx prisma migrate deploy` if migrations are introduced, otherwise
`npx prisma db push` again with the Neon `DATABASE_URL`.

---

## 6. i18n keys

`lib/i18n.ts` currently ships `uz` and `ru` only (`Locale = "uz" | "ru"`). The orchestrator
asks for en/uz/ru, so this is a good moment to introduce English. **Plan A** (recommended,
minimal blast radius): extend `Locale` to `"uz" | "ru" | "en"` and add an `en` block to
the `dict` constant. Existing `t(locale, key)` callers keep working because the function
already falls back to `uz` when a key is missing for the active locale (see
`lib/i18n.ts:182`).

Add the following keys in `uz`, `ru`, and `en`:

| Key | UZ | RU | EN |
|---|---|---|---|
| `role_picker_title` | Hisob turini tanlang | Выберите тип аккаунта | Choose your account type |
| `role_picker_subtitle` | Xarid sizga qanday foyda keltiradi? | Чем Xarid будет полезен вам? | How will Xarid help you? |
| `role_buyer_title` | Restoran / Magazin | Ресторан / Магазин | Restaurant / Store |
| `role_buyer_tagline` | Mahsulot olaman | Я покупаю продукты | I'm buying products |
| `role_buyer_desc` | Bitta savatda barcha yetkazib beruvchilar — ertalab 10:00 gacha | Все поставщики в одной корзине — доставка до 10:00 | All suppliers in one basket — delivered by 10:00 |
| `role_supplier_title` | Sotuvchi | Поставщик | Seller |
| `role_supplier_tagline` | Mahsulot sotaman | Я продаю продукты | I'm selling products |
| `role_supplier_desc` | O'nlab restoran buyurtmasi bitta ro'yxatda. Haftalik kafolatlangan to'lov. | Заказы десятков ресторанов в одном списке. Гарантированная еженедельная оплата. | Dozens of restaurant orders in one list. Guaranteed weekly payouts. |
| `role_pick_cta` | Tanlash | Выбрать | Continue |
| `role_back` | Orqaga | Назад | Back |
| `signup_buyer_title` | Restoran / magazin ro'yxatdan o'tishi | Регистрация ресторана / магазина | Restaurant / store sign-up |
| `signup_supplier_title` | Sotuvchi ro'yxatdan o'tishi | Регистрация поставщика | Seller sign-up |
| `ph_company_name` | Kompaniya nomi | Название компании | Company name |
| `ph_org_name` | Muassasa nomi (masalan: Cafe Gulbahor) | Название заведения (например: Кафе Гульбахор) | Business name (e.g. Cafe Gulbahor) |
| `ph_about` | Kompaniya haqida qisqacha | Кратко о компании | Short description of your company |
| `auth_signup_success` | Hisob yaratildi — boshladik | Аккаунт создан — поехали | Account created — let's go |
| `auth_wrong_surface` | Bu sahifa boshqa hisob turi uchun | Эта страница для другого типа аккаунта | This page is for a different account type |
| `signin_redirect_supplier` | Sotuvchi paneliga o'tilmoqda... | Переход в кабинет поставщика... | Opening seller dashboard... |
| `signin_redirect_buyer` | Katalogga o'tilmoqda... | Переход в каталог... | Opening catalog... |

Every other agent introducing a string adds it to the same three blocks in the same PR.
Missing a translation renders the `uz` fallback verbatim, which is acceptable degradation
but not a long-term state — code review must catch unsynced keys.

---

## 7. Migration plan

Goal: ship the dual-account surface without dropping the seeded demo data
(`lib/seed.ts`).

Step-by-step:

1. **Schema bump.** Add `Organization.about` and `Organization.logoUrl` as nullable
   columns. Run `npx prisma db push` against the dev sqlite DB. Both columns default to
   NULL, so no existing seeded supplier rows break.
2. **Re-seed (optional, dev only).** `npx prisma db seed` runs `prisma/seed.ts`, which
   calls `seedCatalog(prisma)`. `seedCatalog` already wipes and re-creates products,
   suppliers, offers, and orders (`lib/seed.ts:67`). It does NOT touch buyer
   organizations or `User` rows — so any test sign-ups you already made survive.
3. **Owner backfill.** After seeding, no `User` is attached to the demo suppliers. Add a
   one-off helper in `lib/seed.ts`:
   ```ts
   // Optional: create a dev owner user per demo supplier so you can sign in as them
   // for QA. Skipped automatically in production.
   if (process.env.NODE_ENV !== "production") {
     for (const s of demoSuppliers) {
       await prisma.user.upsert({
         where: { phone: s.phone },
         update: { orgId: s.id, role: "OWNER", passwordHash: hashPassword("xarid-demo") },
         create: { phone: s.phone, orgId: s.id, role: "OWNER", passwordHash: hashPassword("xarid-demo") },
       });
     }
   }
   ```
   Documented credentials: `+998901112233 / xarid-demo` etc. Never run this block in prod
   (the `NODE_ENV` check is load-bearing).
4. **Production rollout.**
   - Deploy schema bump first (additive only — safe).
   - Deploy code that reads/writes `about` and `logoUrl`.
   - Existing prod suppliers have `about = null`, `logoUrl = null` — the supplier profile
     UI shows an empty-state prompting them to fill it in. No data loss.
5. **No destructive operations.** Do not drop `Organization` rows, do not drop the
   `Lead` table. The `Lead` rows captured from the landing page are still the warm-lead
   pipeline; nothing in this redesign invalidates them.
6. **Rollback.** If the schema bump misbehaves, the columns are nullable — drop them with
   `ALTER TABLE "Organization" DROP COLUMN "about"; DROP COLUMN "logoUrl";` and redeploy
   the previous app build. The role split itself uses pre-existing columns, so there is
   nothing to roll back.

---

## Quick reference for other agents

- Agent 3 (Customer surface): start from `app/(customer)/(public)/catalog/page.tsx`. Use
  `requireBuyer()` only in `(customer)/(private)/layout.tsx`. Customer landing after
  sign-in = `/catalog`.
- Agent 4 (Deliver surface): start from `app/(supplier)/layout.tsx` calling
  `requireSupplier()`. New pages: `/supplier`, `/supplier/profile`, `/supplier/analytics`,
  `/supplier/products`. Profile page reads/writes `Organization.about` and
  `Organization.logoUrl`.
- Agent 5 (Logistics): driver provisioning stays in `/admin/drivers`. Driver self-service
  lives at `/driver/orders` behind `requireDriver()`. The role picker DOES NOT include a
  "Driver" card — drivers are invited by admin, not self-served.
