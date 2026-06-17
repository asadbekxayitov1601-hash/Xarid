# Xarid marketplace architecture (Yandex-Eats model)

Xarid is a three-sided, real-time marketplace, mapped onto the Yandex Eats model.

## 1. The three actors

| Actor | In Xarid | Surface |
|---|---|---|
| **Customer** | buyer | catalog, basket, `/orders`, live tracking `/track/[id]` |
| **Vendor / seller** | `Organization` type `SUPPLIER` | seller portal `/supplier` (dashboard, products, profile) |
| **Courier** | `User` role `DRIVER` + `Driver` | driver app `/driver`, location via `/api/driver/location` |

Admin/dispatch oversight lives at `/admin/dispatch`.

## 2. Order-flow lifecycle

| Step | Status | Where |
|---|---|---|
| 1. Order placement | done | basket -> `app/api/orders/route.ts` |
| 1b. Dynamic delivery pricing | **done (Phase 2)** | distance + surge -> `lib/delivery-pricing.ts`, `lib/surge.ts`, `/api/delivery/quote` ([PRICING_ENGINE.md](./PRICING_ENGINE.md)) |
| 2. Vendor acceptance + prep time | partial | supplier PO confirm; explicit prep-time still to add |
| 3. Algorithmic dispatch | **done (Phase 1)** | `lib/dispatch.ts` `autoAssignCourier` |
| 4. Real-time tracking + ETA | **done (Phase 3)** | SSE live stream `/api/orders/[id]/stream` + in-memory bus; `/track/[id]`, Leaflet, ETA pill; 10s polling fallback ([REALTIME.md](./REALTIME.md)) |
| 5. Fulfillment | done | driver picked-up/delivered + proof of delivery |

## 3. Pull vs Push API

Today every vendor uses the **built-in seller portal**. Customer order tracking is now **live over SSE**
(`/api/orders/[id]/stream`), with the previous ~10s polling kept as an automatic fallback.
A partner **Pull/Push API** (Client ID + Secret, JSON menu/stock sync + order push) for vendors
that run their own POS/inventory is a **later phase** — only needed when onboarding partners with
external software. Not required while sellers use the built-in portal.

## Phase 1 delivered — geocoding + algorithmic auto-dispatch

Locations are now real coordinates, and the nearest courier is auto-assigned on placement.

- **Schema (additive, pushed to Neon):** `Order.lat/lng` (customer drop), `Organization.lat/lng` (shop).
- **`lib/geo.ts`** — `haversineKm`, `hasCoords`, `formatKm`, `KOKAND_CENTER` (40.5283, 70.9425).
- **`components/location-picker.tsx`** — SSR-safe Leaflet pin picker (draggable marker, click-to-place,
  "use my location"), reused in:
  - checkout (`components/basket-client.tsx`) -> `Order.lat/lng`
  - seller profile (`components/supplier/AboutCompanyForm.tsx`) -> `Organization.lat/lng`
- **`lib/dispatch.ts` `autoAssignCourier(orderId)`** — pickup point = seller coords (or customer coords);
  picks the nearest active `Driver` with a recent `DriverLocation` by haversine; sets `driverId` + status
  `ASSIGNED`. Idempotent and null-safe.
- **Auto-dispatch on placement** — `app/api/orders/route.ts` calls `autoAssignCourier` in a try/catch
  (never blocks an order).
- **Dispatch board** — `/admin/dispatch` gains "Assign nearest" per order + "Auto-assign all", with the
  manual dropdown kept as a fallback; seller pickup pins on the map.

Verified: `next build` green with no Clerk keys; `tsc` clean; i18n in uz/ru/en.

## Phase 2 delivered — dynamic delivery pricing + surge

Distance (Phase 1) now feeds a live fee. The customer sees a real delivery line at
checkout; the courier sees an honest payout; dispatch sees the city-wide surge. Cash stays.

- **Pure pricing lib (`lib/delivery-pricing.ts`)** — `computeDeliveryFee` (base + per-km,
  capped before surge, free over a basket threshold) and `computeCourierPayout`. No IO,
  safe on client + server.
- **Surge lib (`lib/surge.ts`)** — `getCurrentSurge()` from open-orders / active-couriers ratio,
  clamped 1.0..2.5.
- **Live quote endpoint (`app/api/delivery/quote`)** — POST returns the checkout fee; never throws.
- **Schema (additive, nullable):** `Order.deliveryFee` / `surge` / `courierPayout`, recomputed
  server-side at placement; `Order.total` stays the items subtotal, the fee is added in cash.
- **Surfaces** — checkout breakdown (`components/basket-client.tsx`), orders list
  (`components/orders-client.tsx`), driver payout (`components/logistics/driver-client.tsx`),
  dispatch surge banner (`components/logistics/dispatch-board.tsx`); `df_*` / `disp_surge_*` in uz/ru/en.

Full spec: [PRICING_ENGINE.md](./PRICING_ENGINE.md). Verified: `next build` green with no Clerk
keys; `tsc` clean; i18n parity across uz/ru/en. **Orchestrator action: `npx prisma db push`** to
add the three new nullable `Order` columns to Neon (additive, non-destructive).

## Phase 3 delivered — real-time tracking over SSE

The live map and order status no longer wait on a 10s poll. A server-side in-memory pub/sub bus
(`lib/realtime.ts`) fans driver-location, status-change, and assignment events to an SSE endpoint
(`app/api/orders/[id]/stream`); the customer tracking page subscribes via `EventSource` and merges
frames into the existing pin + ETA + timeline render. Polling stays wired as an automatic fallback
(10s when SSE is down, backed off to 60s while connected). Chosen over WebSockets because tracking is
one-way server->client and Railway runs a persistent Node server, so SSE needs no extra protocol or infra.

- **`lib/realtime.ts`** — dependency-free `globalThis` singleton bus: `subscribe(orderId, send)`,
  `publish(orderId, ev)`, `TrackEvent` union (`location` / `status` / `ping`).
- **`app/api/orders/[id]/stream/route.ts`** — `dynamic = "force-dynamic"`, `runtime = "nodejs"` SSE
  endpoint; emits a one-shot snapshot then live bus events, 20s keep-alive, full cleanup on disconnect.
- **Publishers (after the DB write):** `app/api/driver/location/route.ts` (location),
  `app/api/orders/[id]/track/route.ts` POST (status), `app/admin/dispatch/actions.ts` (assignment).
- **Consumer:** `components/logistics/tracking-client.tsx` — `EventSource` + reduced-motion-safe "Live"
  badge (`rt_live` in uz/ru/en); poll fallback retained.

Single-instance caveat: the bus is per-process (fine for Railway's single instance); horizontal scaling
later needs a Redis pub/sub swap (the `subscribe`/`publish` API is broker-agnostic for this reason).

Full spec: [REALTIME.md](./REALTIME.md). Verified: `next build` green with no Clerk keys; `tsc` clean;
i18n parity across uz/ru/en.

## Remaining roadmap

1. **Vendor prep-time** — explicit accept/reject with an estimated prep time feeding dispatch timing.
2. **Partner Pull/Push API** — Client ID/Secret, JSON, for external POS partners.
3. **Capacity-aware dispatch** — factor courier load / vendor prep time into assignment, not just distance.
