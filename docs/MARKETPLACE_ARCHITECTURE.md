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
| 1b. Dynamic delivery pricing | **to build** (Phase 2) | needs distance (now unlocked) |
| 2. Vendor acceptance + prep time | partial | supplier PO confirm; explicit prep-time still to add |
| 3. Algorithmic dispatch | **done (Phase 1)** | `lib/dispatch.ts` `autoAssignCourier` |
| 4. Real-time tracking + ETA | done via polling | `/track/[id]`, Leaflet, ETA pill (WebSockets later) |
| 5. Fulfillment | done | driver picked-up/delivered + proof of delivery |

## 3. Pull vs Push API

Today every vendor uses the **built-in seller portal**, and real-time is **polling** (~10-15s).
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

## Remaining roadmap

1. **Dynamic delivery pricing** — fee from distance + courier-to-order ratio (coords now make this possible). Cash stays.
2. **Real-time** — polling -> WebSockets/SSE for the live map + instant status.
3. **Vendor prep-time** — explicit accept/reject with an estimated prep time feeding dispatch timing.
4. **Partner Pull/Push API** — Client ID/Secret, JSON, for external POS partners.
