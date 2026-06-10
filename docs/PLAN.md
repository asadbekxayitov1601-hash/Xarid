# Xarid — Master Build Plan

Goal: get a working marketplace + own delivery operation live in Tashkent on a
near-zero budget, prove unit economics on real orders, and only then raise
investment.

Guiding constraints:

- **One developer, no money.** Everything runs on free tiers until revenue.
- **Telegram-first market.** In Uzbekistan both suppliers and restaurant
  buyers live in Telegram. The bot is not a nice-to-have — for suppliers it
  IS the product in the early phases. Web is for the catalog, basket, and admin.
- **Operations before automation.** In Phases 0–1 the founder manually does
  whatever the software doesn't (calling suppliers, planning routes). Software
  is added only where manual work stops scaling.
- **Order cycle is the spine of the system:** basket by 22:00 → supplier
  confirmation by 23:30 → routes built overnight → delivery 06:00–10:00.

## Technology stack (all phases)

| Layer | Choice | Why |
|---|---|---|
| Web app | Next.js 15 (App Router, TypeScript) | One codebase for storefront, supplier portal, admin; free hosting on Vercel |
| UI | Tailwind CSS + shadcn/ui | Fast to build, looks professional, free |
| Database | PostgreSQL on Supabase (free tier) | Postgres + auth + file storage + row-level security in one free service |
| ORM | Prisma | Type-safe schema, migrations |
| Telegram bots | grammY, running as Next.js route handlers (webhooks) | No extra server to pay for |
| Auth | Phone number + OTP via Telegram (free) with Eskiz.uz SMS as fallback | SMS costs money; Telegram OTP is free |
| Payments (Phase 3) | Payme + Click merchant APIs | The two payment rails every Uzbek business accepts |
| Hosting | Vercel free tier; upgrade only when traffic demands | $0 until it matters |
| Monitoring | Sentry free tier + Vercel logs | Enough for MVP |
| Languages | UZ (Latin) + RU from day one | Both are mandatory for Tashkent HoReCa |

Everything lives in **one Next.js repository** until Phase 4. No microservices,
no monorepo tooling, no Kubernetes. A solo founder's biggest risk is build
time, not architecture purity.

---

## Phase 0 — Validation & landing page (Weeks 1–2, $0)

**Goal:** 30 restaurants and 10 suppliers committed before writing the real app.

The landing page exists to collect signups while the founder does the real
validation work offline: visiting bazaars (Chorsu, Farhod, Oloy), wholesale
suppliers, and 30+ restaurants/chaikhanas to collect their current order sheets
and prices.

**Exit criteria:** ≥30 buyer leads, ≥10 supplier leads, price lists collected
from ≥5 suppliers covering the top ~100 SKUs (onions, potatoes, tomatoes, beef,
mutton, chicken, rice, oil, flour, dairy).

### Files

```
app/
├── layout.tsx                  # Root layout, fonts, metadata, UZ/RU switcher
├── page.tsx                    # Landing: problem, how it works, signup forms
├── (marketing)/
│   ├── for-restaurants/page.tsx
│   └── for-suppliers/page.tsx
├── api/leads/route.ts          # POST → leads table in Supabase
components/
├── lead-form.tsx               # Name, phone, business type, district
├── language-switcher.tsx
lib/
├── supabase.ts                 # Supabase client
├── i18n.ts                     # UZ/RU dictionaries (simple JSON, no library)
messages/
├── uz.json
└── ru.json
```

### Technical details

- Single Supabase table `leads(id, name, phone, role buyer|supplier, district, created_at)`.
- Deploy to Vercel, attach `xarid.uz` domain (~$10–15/yr — the only Phase 0 cost).
- Telegram channel/bot link on the page so leads land in a community you control.
- No auth, no dashboard — read leads straight from the Supabase table editor.

---

## Phase 1 — MVP marketplace (Weeks 3–8, $0 infra)

**Goal:** first real money flows through the system. 10–20 paying restaurants
ordering from 5–10 suppliers, with the founder personally running logistics
(rented Damas/Labo van per route, or supplier self-delivery).

**Scope cuts that keep this 6 weeks:** no online payment (cash on delivery /
bank transfer), no driver app (founder + route sheet printout), no supplier
self-service onboarding (admin enters price lists), no search/filters beyond
category browsing, no ratings.

### Core flow

1. Buyer logs in (phone + Telegram OTP), browses catalog grouped by category,
   adds items from multiple suppliers into **one basket**.
2. Order cutoff 22:00. At cutoff, the system splits the basket into
   per-supplier **purchase orders** and pushes each to the supplier's Telegram.
3. Supplier confirms/adjusts (out-of-stock lines, weight rounding) via bot
   buttons by 23:30.
4. Admin sees consolidated picking list per supplier and a delivery list per
   buyer; plans routes manually.
5. Morning delivery; admin marks orders delivered, records cash collected.

### Files

```
app/
├── (buyer)/
│   ├── catalog/page.tsx            # Categories → products with per-supplier prices
│   ├── catalog/[category]/page.tsx
│   ├── basket/page.tsx             # Multi-supplier basket, min-order warnings
│   ├── orders/page.tsx             # Order history + statuses
│   └── orders/[id]/page.tsx
├── (supplier)/
│   ├── dashboard/page.tsx          # Today's purchase orders, confirm/adjust
│   └── products/page.tsx           # Own price list (read-only in Phase 1)
├── (admin)/
│   ├── admin/page.tsx              # Today's pipeline: orders by status
│   ├── admin/orders/page.tsx
│   ├── admin/suppliers/page.tsx    # CRUD suppliers + price list upload (CSV)
│   ├── admin/buyers/page.tsx
│   ├── admin/products/page.tsx     # Canonical SKU catalog
│   └── admin/routes/page.tsx       # Manual route sheets, printable
├── api/
│   ├── bot/buyer/route.ts          # grammY webhook: OTP login, order notifications
│   ├── bot/supplier/route.ts       # grammY webhook: PO confirm/adjust buttons
│   └── cron/cutoff/route.ts        # Vercel cron 22:00: close baskets → POs
├── login/page.tsx
lib/
├── db.ts                           # Prisma client
├── auth.ts                         # Session handling (iron-session or Supabase auth)
├── pricing.ts                      # Markup/commission application to supplier prices
├── order-splitter.ts               # Basket → per-supplier purchase orders
└── bots/
    ├── buyer-bot.ts
    └── supplier-bot.ts
prisma/
├── schema.prisma
└── seed.ts                         # Top-100 SKU catalog seed
```

### Data model (Prisma, abridged)

```prisma
model Organization {        // both buyers and suppliers
  id        String  @id @default(cuid())
  type      OrgType // BUYER | SUPPLIER
  name      String
  district  String
  phone     String
  users     User[]
}
model User {
  id         String @id @default(cuid())
  phone      String @unique
  telegramId BigInt? @unique
  role       Role    // OWNER | STAFF | ADMIN
  orgId      String?
}
model Product {              // canonical SKU: "Onion, yellow, kg"
  id        String @id @default(cuid())
  name_uz   String
  name_ru   String
  category  String
  unit      Unit   // KG | PIECE | LITER | BLOCK
}
model SupplierOffer {        // supplier's price for a canonical SKU
  id         String  @id @default(cuid())
  supplierId String
  productId  String
  price      Decimal // what buyer sees (already incl. take rate)
  costPrice  Decimal // what supplier gets
  available  Boolean
  minQty     Decimal?
  @@unique([supplierId, productId])
}
model Order {                // the buyer's single morning basket
  id          String      @id @default(cuid())
  buyerId     String
  status      OrderStatus // DRAFT|PLACED|CONFIRMED|PARTIAL|DELIVERING|DELIVERED|CANCELLED
  deliveryDate DateTime
  items       OrderItem[]
  purchaseOrders PurchaseOrder[]
}
model PurchaseOrder {        // per-supplier slice of an Order
  id         String   @id @default(cuid())
  orderId    String
  supplierId String
  status     POStatus // SENT|CONFIRMED|ADJUSTED|REJECTED
  lines      OrderItem[]
}
model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  poId      String?
  offerId   String
  qty       Decimal
  qtyActual Decimal? // supplier-adjusted / weighed quantity
  price     Decimal  // snapshot at order time
  costPrice Decimal  // snapshot at order time
}
```

**Key technical decisions:**

- **Prices are snapshotted onto order lines** — produce prices change daily;
  never join back to the live offer for money math.
- **Take rate lives in the price** (`price = costPrice × (1 + takeRate)`), so
  buyers see one transparent number and margin reporting is just
  `Σ(price − costPrice) × qtyActual`.
- **`qtyActual` is first-class** — meat and vegetables are sold by weight; the
  delivered weight never equals the ordered weight. Invoicing uses `qtyActual`.
- Vercel Cron (free) fires the 22:00 cutoff; a second cron at 23:30
  auto-escalates unconfirmed POs to the admin's Telegram.

**Exit criteria:** 4 consecutive weeks of orders, ≥15 active buyers, weekly
GMV ≥ 50M UZS (~$4k), and the founder can state real per-order delivery cost.

---

## Phase 2 — Logistics module (Weeks 9–14)

**Goal:** the in-house delivery company becomes systematic: zones, time slots,
driver workflow, cash reconciliation. See `docs/LOGISTICS.md` for the
operational design (fleet, hubs, costs); this section is the software.

### Files (added)

```
app/
├── (admin)/admin/logistics/
│   ├── zones/page.tsx              # Delivery zones (district polygons or simple lists)
│   ├── routes/page.tsx             # Auto-grouped routes: zone + capacity → stops
│   └── reconciliation/page.tsx     # Cash-on-delivery reconciliation per driver/day
├── api/bot/driver/route.ts         # Driver Telegram bot webhook
lib/
├── routing.ts                      # Greedy route builder: group by zone, order stops
└── bots/driver-bot.ts              # Stop list, navigate link, mark delivered,
                                    #   photo proof, record cash, report shortage
prisma/ (schema additions)
```

```prisma
model Driver   { id, userId, vehicleType, capacityKg, active }
model Zone     { id, name, districts String[] }
model Route    { id, date, driverId, zoneId, status, stops RouteStop[] }
model RouteStop {
  id, routeId, orderId, sequence Int,
  status     StopStatus  // PENDING|ARRIVED|DELIVERED|FAILED
  podPhoto   String?     // proof-of-delivery photo (Supabase storage)
  cashDue    Decimal
  cashTaken  Decimal?
  note       String?     // shortage / rejection reason
}
```

### Technical details

- **Routing is greedy, not optimal:** group confirmed orders by zone, cap by
  van weight, order stops by district adjacency. A real VRP solver is a
  Phase 4 luxury; Tashkent zones are small enough for greedy + driver
  knowledge.
- **Driver bot is the entire driver app.** Drivers won't install anything,
  but everyone has Telegram: tap stop → Yandex Maps deep link → "Delivered"
  button → camera prompt for proof photo → numeric input for cash collected.
- **Shortage flow:** if delivered weight/items differ, the driver enters
  actuals at the door; the buyer's invoice and the supplier's payout both
  recalculate from `qtyActual` — disputes die at the doorstep, not in
  accounting.
- Daily reconciliation screen: per driver, expected cash vs entered cash vs
  handed in; per supplier, payable = Σ `costPrice × qtyActual` − adjustments.

**Exit criteria:** 2+ routes/morning run without the founder in the van;
delivery cost per stop measured and < take-rate revenue per stop.

---

## Phase 3 — Payments & monetization (Weeks 15–20)

**Goal:** stop being a cash courier. Online payment, supplier payouts on a
schedule, commission/subscription engine, real financial reports.

### Files (added)

```
app/
├── api/payments/payme/route.ts     # Payme merchant API (JSON-RPC callbacks)
├── api/payments/click/route.ts     # Click merchant API (prepare/complete)
├── (buyer)/billing/page.tsx        # Invoices, pay-by-card, balance
├── (supplier)/payouts/page.tsx     # Payout statements, subscription status
├── (admin)/admin/finance/
│   ├── payouts/page.tsx            # Approve supplier payout batches
│   ├── commissions/page.tsx        # Per-supplier take rate / subscription config
│   └── reports/page.tsx            # GMV, revenue, margin per zone/category/supplier
lib/
├── payments/payme.ts
├── payments/click.ts
├── ledger.ts                       # Double-entry: every tenge has a from/to account
└── invoicing.ts                    # Invoice from qtyActual at delivery confirmation
prisma/ (schema additions)
```

```prisma
model Account     { id, ownerType, ownerId, kind /* BUYER_PAYABLE|SUPPLIER_PAYABLE|REVENUE|CASH_DRIVER|... */ }
model LedgerEntry { id, debitAccountId, creditAccountId, amount, orderId?, createdAt }
model Invoice     { id, buyerId, orderId, total, status, paidVia /* CASH|PAYME|CLICK|TRANSFER */ }
model Payout      { id, supplierId, periodStart, periodEnd, gross, commission, net, status }
model Subscription{ id, supplierId, plan, monthlyFee, activeUntil }
```

### Technical details

- **Double-entry ledger from day one of Phase 3.** Marketplace + COD + payouts
  without a ledger ends in unexplainable money gaps. Every event (delivery
  confirmed, cash handed in, Payme callback, payout sent) writes balanced
  entries.
- Payme uses a JSON-RPC merchant protocol, Click a prepare/complete callback
  pair; both need a registered legal entity (MChJ/LLC) and merchant contracts —
  start that paperwork in Phase 2.
- Commission engine supports per-supplier overrides: default 7% take rate,
  negotiable to 5% for anchor suppliers, or 0% + monthly subscription
  (500k–1.5M UZS) for high-volume ones.
- Buyer credit terms (pay weekly) only for buyers with 8+ weeks of history —
  this is the seed of the Phase 4 financing product.

**Exit criteria:** ≥50% of GMV paid online or by transfer; supplier payouts
run weekly from the system, not from a spreadsheet; monthly P&L generated
from the ledger.

---

## Phase 4 — Scale & financing (Month 6+, post-investment)

**Goal:** the things that need money: more vans, a second city, supplier
financing, and mobile apps. This phase is intentionally sketched, not
specified — it gets re-planned with real Phase 1–3 data.

- **Supplier financing on receivables:** Xarid knows every supplier's verified
  sales history — partner with a bank/MFO to advance payouts (factoring) for a
  1.5–3% fee. Regulated activity: do it through a licensed partner, not on
  your own balance sheet.
- **Price intelligence:** daily price index per SKU across suppliers; becomes
  both a buyer-facing trust feature and a dataset competitors don't have.
- **Demand forecasting:** suggest tomorrow's basket from order history
  (start with a 4-week moving average before reaching for ML).
- **Mobile:** PWA first (the Next.js app already works on phones); a React
  Native/Expo app only if PWA friction is proven, since buyers order once a
  day in the evening.
- **Infra:** move off free tiers (Supabase Pro, Vercel Pro ≈ $45/mo), add
  read replica, background job queue (pg-boss — still just Postgres).

---

## Timeline & cost summary

| Phase | Weeks | Cash cost | Outcome |
|---|---|---|---|
| 0 Validation | 1–2 | ~$15 (domain) | 30 buyers + 10 suppliers committed |
| 1 MVP | 3–8 | $0 infra; van rental per route (~150–250k UZS/morning) | Real GMV, manual logistics |
| 2 Logistics | 9–14 | 1–2 rented/leased vans + 1–2 drivers | Systematic delivery, measured cost/stop |
| 3 Payments | 15–20 | LLC registration + merchant fees | Online money, weekly payouts, P&L |
| 4 Scale | 24+ | Investment round | Fleet, financing product, city #2 |

The investment ask happens **after Phase 3**: by then you have GMV, retention,
measured delivery cost, and a P&L generated by software — exactly the traction
artifacts the separate investor business plan will need.
