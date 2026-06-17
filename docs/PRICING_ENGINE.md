# Xarid pricing engine — dynamic delivery fee + surge (Phase 2)

Distance (from Phase 1 coords) now drives a live delivery fee. The customer sees a real
delivery line at checkout, the courier sees an honest payout, and dispatch sees the
city-wide surge. Cash stays — nothing is charged online.

This is order-flow **step 1b "dynamic delivery pricing", now DELIVERED**. See
[MARKETPLACE_ARCHITECTURE.md](./MARKETPLACE_ARCHITECTURE.md).

## Where it lives

| Concern | File |
|---|---|
| Fee + courier-payout formulas, constants (pure, no IO) | `lib/delivery-pricing.ts` |
| Surge multiplier from live demand/supply | `lib/surge.ts` |
| Live checkout quote endpoint | `app/api/delivery/quote/route.ts` |
| Server-side persistence at placement | `app/api/orders/route.ts` |
| Distance helper (`haversineKm`, `hasCoords`) | `lib/geo.ts` |
| `round100` rounding | `lib/pricing.ts` |
| Schema (`Order.deliveryFee` / `surge` / `courierPayout`) | `prisma/schema.prisma` |

Customer / courier / dispatch surfaces: `components/basket-client.tsx`,
`components/orders-client.tsx`, `components/logistics/driver-client.tsx`,
`components/logistics/dispatch-board.tsx`.

## Customer fee formula

```
base        = min(DELIVERY_BASE_FEE + distanceKm * DELIVERY_PER_KM_FEE, DELIVERY_FEE_CAP)
fee         = round100(base * surge)          // when NOT free
```

Constants (UZS, Kokand — tune in `lib/delivery-pricing.ts`):

| Constant | Value | Meaning |
|---|---|---|
| `DELIVERY_BASE_FEE` | 5000 | flat base every paid delivery starts at |
| `DELIVERY_PER_KM_FEE` | 1200 | per km — deliberately below the courier per-km rate (subsidized) |
| `DELIVERY_FEE_CAP` | 15000 | hard cap applied to base+distance **before** surge |
| `FREE_DELIVERY_OVER` | 100000 | items subtotal at/above this -> delivery is free |
| `DEFAULT_DISTANCE_KM` | 3 | null-safe fallback when pin and/or seller coords are unknown |

Note the cap is applied to base+distance **before** surge, so a busy night can legitimately
push the final fee above 15000 — surge is intentionally allowed to exceed the cap; the cap
only bounds the un-surged base. When distance can't be measured (customer pin or seller
coords missing) the formula falls back to a typical 3 km Kokand hop rather than guessing high.

## Free over threshold

When `subtotal >= FREE_DELIVERY_OVER` (100000 UZS), `computeDeliveryFee` returns
`{ fee: 0, free: true }`. Free always wins — even on a transient error the quote endpoint
keeps a qualifying basket free.

## Surge formula

```
surge = clamp(1 + 0.5 * max(0, openOrders / activeCouriers - 1), 1.0, 2.5)
```

- At parity (one open order per available courier) surge = 1.0. Each extra unassigned order
  per courier adds half a step, up to a 2.5x ceiling (`SURGE_MIN` 1.0, `SURGE_MAX` 2.5).
- **No active couriers -> surge 1.0** (we don't punish the customer for our own capacity gap).
- `openOrders` = orders still `PLACED`/`CONFIRMED` with `driverId` null.
- `activeCouriers` = active `Driver`s intersected with `DriverLocation` rows updated within
  the freshness window (`FRESH_LOCATION_MS` = 30 min). This matches the freshness used by
  `lib/dispatch.ts`, so the surge denominator and the dispatch pool agree. (`Driver` has no
  Prisma relation to `DriverLocation`, so the two sets are intersected by id in
  `countActiveCouriers`.)

`getCurrentSurge()` returns `{ surge, openOrders, activeCouriers }`.

## Courier payout

```
courierPayout = round100((COURIER_BASE + distanceKm * COURIER_PER_KM) * surge)
```

| Constant | Value |
|---|---|
| `COURIER_BASE` | 5000 |
| `COURIER_PER_KM` | 1500 |

The courier per-km (1500) is **above** the customer per-km (1200), so the payout can exceed
the customer fee by design — the gap is covered by the product margin + order consolidation.
Same surge multiplier applies to both. Surfaced to the rider via the `df_you_earn_*` keys.

## Live quote endpoint — `POST /api/delivery/quote`

Powers the live checkout fee. Server-only (touches Prisma).

- **Body:** `{ lat?, lng?, offerIds: string[], subtotal: number }`
- **Returns:** `{ fee, free, surge, distanceKm, subtotal }`
- Resolves the primary seller's coords from `offerIds` (first offer with coords wins,
  deterministic — replicating `lib/dispatch.ts` `resolvePickup`, which isn't exported),
  measures haversine distance from the customer pin, calls `getCurrentSurge()`, then
  `computeDeliveryFee`.
- **Never throws.** Any failure returns a safe base-fee quote (`fee` = 5000, `surge` 1,
  `free` false) — with free still winning when `subtotal >= FREE_DELIVERY_OVER` — so the
  customer can always complete the order.

Checkout (`components/basket-client.tsx`) calls this debounced (~350ms) and abortable,
re-quoting whenever the cart contents, items subtotal, or drop pin change.

## Money model

- **`Order.total` stays the items subtotal.** The delivery fee is a **separate** field, not
  folded into the total.
- The customer pays **`total + deliveryFee` in cash** (grand total). Money on the client is
  display-only.
- The server **never trusts a client-sent fee.** `app/api/orders/route.ts` recomputes
  distance + surge + fee + payout at placement and persists them; the basket POST sends only
  items + buyer + pin.

### Schema (additive, nullable) — `prisma/schema.prisma`, model `Order`

| Field | Type | Meaning |
|---|---|---|
| `deliveryFee` | `Int?` | surge-applied customer fee (UZS); 0 when free |
| `surge` | `Float?` | the multiplier applied at quote time (1.0..2.5) |
| `courierPayout` | `Int?` | what the courier earns for the trip (UZS), for transparency |

All three are additive and nullable, so existing rows are unaffected. Readers must treat
`null` (legacy pre-Phase-2 orders) as 0 / free.

## ⚠️ ORCHESTRATOR ACTION

Run **`npx prisma db push`** to add `Order.deliveryFee` / `surge` / `courierPayout` to the
live Neon DB. The columns are nullable + additive, so the push is **non-destructive** on
existing rows. The build agents ran `npx prisma generate` only (client generated locally) and
deliberately did **not** push. Until the push lands, `prisma.order.create` will throw on the
new fields — push before/with the merge to avoid a runtime gap.

## i18n

`df_*` (customer/courier) and `disp_surge_*` (dispatch) keys live in `lib/i18n.ts` with full
**parity across uz / ru / en** (Uzbek-Latin and Russian first-class, English third):

`df_delivery`, `df_free`, `df_busy_surge` (`{surge}`), `df_grand_total`, `df_you_earn`
(`{amount}`), `df_calculating`, `df_free_hint`, `df_items`, `df_you_earn_driver`,
`df_you_earn_est`, `disp_surge_label`, `disp_surge_meta`, `disp_surge_calm`, `disp_surge_none`.

## Build status

`next build` is **green with no Clerk keys**; `tsc --noEmit` clean; `/api/delivery/quote`
present in the route table; i18n parity verified across uz/ru/en.
