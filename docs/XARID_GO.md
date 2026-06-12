# Xarid Go (Agent 5) — Logistics Software Surface

> The morning operation is designed in `docs/LOGISTICS.md`. This document is
> the SOFTWARE surface that supports it: the live-tracking page the buyer sees,
> the dispatcher board the founder uses at 05:00, and the driver app the
> couriers run during pickup + drop-off. The visual contract is `docs/DESIGN_SYSTEM.md`;
> the auth contract is `docs/ACCOUNTS.md`. Anything not pinned here is the
> implementer's call as long as it reuses the existing tokens and primitives.

The product reference is Yandex Go: full-bleed dark map, glassy bottom sheet,
one giant CTA, big touch targets. We are not building "a generic admin table
with a map widget"; we are building a tracking experience.

---

## 1. Status flow

The existing `Order.status` column is a plain string (no enum) — see
`prisma/schema.prisma:103` — so we can extend the closed set without a schema
migration. **Do not** add new enum values; just document the new strings and
make every code path tolerant of them.

```
              place                  cutoff               admin/dispatcher
PLACED  ─────────────►  CONFIRMED  ───────────►  ASSIGNED  ───────────►
                                                     │
                                                     │ driver taps "Picked up"
                                                     ▼
                                                 PICKED_UP
                                                     │
                                                     │ driver taps "Heading to customer"
                                                     ▼
                                                  EN_ROUTE  (alias of DELIVERING)
                                                     │
                                                     │ driver taps "Delivered"
                                                     ▼
                                                  DELIVERED
```

Mapping vs. the legacy strings (already used by `lib/orders.ts`, the supplier
bot, and the admin pipeline):

| Phase                  | Canonical (new) | Legacy compatible | Visible to       |
|------------------------|-----------------|-------------------|------------------|
| Buyer placed basket    | `PLACED`        | `PLACED`          | buyer, supplier  |
| Supplier confirmed PO  | `CONFIRMED`     | `CONFIRMED`       | buyer, supplier  |
| Some POs rejected      | `PARTIAL`       | `PARTIAL`         | buyer, supplier  |
| Driver assigned        | `ASSIGNED`      | (new)             | buyer, dispatch, driver |
| Driver loaded at supplier | `PICKED_UP`  | (new)             | buyer, dispatch, driver |
| Driver heading to door | `EN_ROUTE`      | `DELIVERING`*     | buyer, dispatch, driver |
| Drop completed         | `DELIVERED`     | `DELIVERED`       | everyone         |
| Cancelled              | `CANCELLED`     | `CANCELLED`       | everyone         |

\* The legacy `DELIVERING` value is still produced by older Telegram bot paths
(`lib/orders.ts`). The tracking page treats `EN_ROUTE` and `DELIVERING` as the
same state, and the `i18n` key `go_status_DELIVERING` is identical to
`go_status_EN_ROUTE`. New code emits `EN_ROUTE`; old code that emits
`DELIVERING` is not rewritten in this phase.

### Schema diff (proposed, additive only)

```prisma
// prisma/schema.prisma — NEW model
model DriverLocation {
  id        String   @id @default(cuid())
  driverId  String   @unique
  lat       Float
  lng       Float
  accuracy  Float?
  updatedAt DateTime @updatedAt
}
```

No change to `Order.status` (still `String`). No change to `Driver`. To apply
after pulling this branch:

```
cd <repo-root>
npx prisma db push     # dev sqlite at prisma/dev.db
npx prisma generate
```

In prod (Neon Postgres): `npx prisma db push` against the prod `DATABASE_URL`.
The column is brand new — no backfill risk.

---

## 2. Data flow — driver position

### Phase 1: polling (this build)

```
 Driver browser            Next.js API           Postgres
     │                          │                    │
     │  POST /api/driver/location {lat,lng}          │
     │ ─────────────────────────►│   upsert by      │
     │   (every ~15s while a job │   driverId       │
     │    is active)             │ ────────────────►│
     │                          │                    │
     │                          │                    │
 Buyer browser            Next.js API           Postgres
     │                          │                    │
     │  GET /api/orders/:id/track                    │
     │ ─────────────────────────►│   findUnique     │
     │     (every 10s)           │ ────────────────►│
     │ ◄─────────────────────────│                    │
     │   {status,eta,driver:{    │                    │
     │     name,lat,lng,         │                    │
     │     updatedAt}}           │                    │
```

15s + 10s polling is a deliberately boring choice: it works on the cheapest
Railway box, survives the Telegram webview's flaky WebSocket support, and is
trivial to debug from devtools. The map UX is identical to a "real-time" feed
because the eye does not perceive sub-30s lag for a van moving < 60 km/h.

### Phase 2: WebSocket / SSE (not in this build)

When the dispatcher view needs >5 vans on screen at once, polling cost
multiplies. Migration path:

1. Add `/api/realtime` SSE endpoint that streams `DriverLocation` updates.
2. Same `DriverLocation` table — SSE is just a delivery mechanism.
3. Polling endpoints stay (graceful degradation in webviews that block SSE).

This is intentionally NOT built today; document it so the next agent doesn't
re-derive it.

### ETA computation

Pure haversine distance + a fixed 25 km/h city average. The map provider
(OpenStreetMap via Leaflet) does not expose a free routing API without an
account, so we trade road-network accuracy for zero infra cost. The ETA is
labelled `go_eta_label` and shows as `{n} min`; below 2 minutes the buyer
sees `go_eta_arriving` instead of a number to avoid a 0-min countdown
flickering on screen. Computation lives in `lib/driver.ts::computeEtaMinutes`.

---

## 3. Yandex Go-style UX details

The tracking page (`app/track/[orderId]/page.tsx`) is the headline surface.
Rules, in priority order:

1. **Full-bleed dark map.** The Leaflet basemap fills the entire viewport
   under a fixed bottom sheet. No site header or footer. (Layout group
   `app/track/layout.tsx` strips the chrome.)
2. **Bottom sheet, glass-card depth-2.** Lives inside a `scene-perspective`
   parent so the depth class actually translates in Z. Resting height is
   `36svh`, expanded `72svh` on swipe up (mobile) or click (desktop). Uses
   `--shadow-lg` + `--shadow-glow-accent` per the design system.
3. **One primary CTA at a time.** On the buyer page it is a phone button
   (`tel:` href) labelled `go_driver_phone_aria` once a driver is assigned;
   no other primary buttons. On the driver page it is the next-step button
   (`Picked up` → `Heading to customer` → `Delivered`), filling 100% of the
   sheet width and ≥ 56px tall.
4. **ETA pill, big.** `font-display tabular-nums`, 1.5rem, sitting on the
   top-right of the sheet with `--shadow-glow-info`. Always visible.
5. **Status timeline.** Six steps (PLACED → CONFIRMED → ASSIGNED → PICKED_UP
   → EN_ROUTE → DELIVERED). The current step is `depth-1` with
   `--shadow-glow-accent`; completed steps are filled `--accent` discs;
   pending steps are hollow `--border-color`.
6. **"Looking for a driver…" state.** When `order.driverId` is null:
   - Show a pulsing accent disc at the buyer's address marker.
   - Bottom-sheet body becomes the message `go_searching_driver` with the
     subtitle `go_searching_driver_hint`. No driver block, no ETA.
7. **Dark first, light works.** Map basemap = CartoDB Dark Matter when
   `<html>` is `.dark` (default); CartoDB Voyager when `.light`. Both are
   free, no API key.
8. **Big touch targets.** Every interactive element ≥ 44×44 logical px.
   Driver buttons are 56px tall.
9. **Motion respects `prefers-reduced-motion`.** The pulse animation,
   marker bounce, and sheet auto-expand are all gated by the existing
   `@media (prefers-reduced-motion: reduce)` block.

### Component list (added under `components/logistics/*`)

| File                                  | Purpose                                            |
|---------------------------------------|----------------------------------------------------|
| `map-card.tsx`                        | Client-only Leaflet wrapper. SSR-safe via `next/dynamic`. Renders basemap + markers + driver dot. |
| `route-list.tsx`                      | Stacked list of stops (used in driver "today" view and dispatcher "active" panel). |
| `driver-location-dot.tsx`             | Animated pulsing marker for the live driver position. |
| `order-status-timeline.tsx`           | Six-step vertical timeline used inside the bottom sheet. |
| `dispatch-board.tsx`                  | Two-column dispatcher layout: live map (left) + unassigned queue (right). |
| `eta-pill.tsx`                        | Translated ETA chip (`{n} min` / `Arriving` / `Delivered`). |
| `tracking-client.tsx`                 | Client wrapper for the buyer tracking page — runs the 10s poll. |
| `driver-client.tsx`                   | Client wrapper for the driver job page — runs the 15s location push and step buttons. |

### Driver app surface

`/driver` is the entry point. If the driver has a current open job
(`ASSIGNED` / `PICKED_UP` / `EN_ROUTE` / `DELIVERING`), they land directly on
that job's full-screen sheet. Else they see "no job yet" with the founder's
phone number. The existing `/driver/orders/[id]` scale form is kept — a
`drv_open_scale` link inside the sheet jumps to it.

### Dispatcher board

`/admin/dispatch` reuses the admin layout. Two columns at desktop
(`lg:grid-cols-2`), stacked at mobile. Left column is the same MapCard with
all active-order pins; right column is the unassigned queue with a `<select>`
dropdown of active drivers and a server action that writes `Order.driverId`.

---

## 4. Realism shortcuts (deliberate)

- **Address → lat/lng:** we don't run a geocoder. Order `address` is free
  text. For demo data and dev, the API extracts `lat,lng` from any trailing
  `[lat,lng]` token in the address; otherwise it falls back to a deterministic
  hash → jitter inside the Tashkent bounding box. Production geocoding is a
  Phase-2 ticket; document this in `docs/PLAN.md` so it's not forgotten.
- **No route polyline.** The buyer sees a straight line between driver and
  address; the dispatcher sees driver dots only. Real road geometry needs an
  OSRM / Mapbox account — Phase 2.
- **One driver per order.** The schema already enforces this via
  `Order.driverId` being a single FK. Splitting a stop across two drivers is
  not in scope.

---

## 5. Test plan (manual)

1. Sign in as ADMIN, open `/admin/dispatch`. Map renders. Unassigned queue
   lists any `CONFIRMED`/`PLACED` order without a driverId. Assigning a
   driver flips status to `ASSIGNED` and moves the row to the active list.
2. Sign in as DRIVER. `/driver` shows the assigned job. Tapping `Picked up`
   flips status to `PICKED_UP`; tapping again ("Heading to customer") flips
   to `EN_ROUTE`; tapping `Delivered` flips to `DELIVERED`.
3. While the driver page is open, the device requests geolocation. Granting
   it kicks off the 15s POST loop to `/api/driver/location`.
4. Open `/track/<orderId>` as a non-authenticated user. Map centers on the
   order address; once the driver has a location row, the driver pin
   appears and the ETA pill counts down. Status timeline updates within 10s.
5. Toggle the `<html>` class to `.light`. Basemap switches to Voyager;
   bottom sheet text remains readable; ETA pill stays glowy.
6. Toggle `prefers-reduced-motion`. Pulse and bounce animations stop; static
   pin remains.
