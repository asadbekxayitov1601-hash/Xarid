# Real-time order tracking (SSE)

Phase 3 of the marketplace (see [MARKETPLACE_ARCHITECTURE.md](./MARKETPLACE_ARCHITECTURE.md)). The
customer tracking page (`/track/[id]`) now updates the driver pin, status timeline, and ETA **live**,
instead of waiting on a 10-second poll. The transport is **Server-Sent Events (SSE)** backed by a
small in-process pub/sub bus. Polling is retained as an automatic fallback.

## At a glance

```
driver POST /api/driver/location ─┐
status POST /api/orders/[id]/track ┼─► publish(orderId, ev) ──► lib/realtime.ts bus
dispatch assign (server action) ──┘                              (Map<orderId, Set<send>>)
                                                                        │ fan-out
                                                                        ▼
                          GET /api/orders/[id]/stream (SSE)  ── subscribe(orderId, send)
                                                                        │ data: {json}\n\n
                                                                        ▼
                          EventSource in components/logistics/tracking-client.tsx
                                  └─ merges into existing `data` state (pin + ETA + timeline)
                                  └─ 10s GET /track poll kept as fallback (60s while SSE live)
```

## Why SSE and not WebSockets

- **The data is one-way.** Tracking is server -> client only: the driver's position and the order's
  status are pushed down; the customer never sends anything up the same channel. SSE is built for
  exactly this; WebSockets buy a bidirectional channel we don't need.
- **Railway runs a persistent Node server.** SSE is just a long-lived HTTP response (`text/event-stream`),
  so it needs no separate protocol upgrade, no extra port, and no extra infrastructure. A Next.js route
  handler streams it directly.
- **EventSource reconnects for free.** The browser's `EventSource` auto-reconnects on drop and the server
  re-sends a snapshot on (re)connect, so liveness is handled without custom heartbeat/ack code.
- **Plays well with the existing fallback.** When SSE is unavailable the page simply leans on the same
  `GET /api/orders/[id]/track` fetch it always had — no second code path to maintain.

WebSockets would be the right call only if/when the customer needs to push data back over the same socket
(e.g. live chat with the courier). That's not in scope for tracking.

## The in-memory bus — `lib/realtime.ts`

A dependency-free, **server-only** pub/sub bus. It mirrors `lib/db.ts`'s Prisma pattern: a singleton
stored on `globalThis` (`globalThis.__xaridBus`) so it survives dev Hot Reload and repeated imports
within one process.

Public API:

- `type TrackEvent` — a JSON-serializable discriminated union:
  - `{ type: "location", lat, lng, updatedAt, name? }` — driver moved.
  - `{ type: "status", status, eta }` — order status changed (ETA recomputed).
  - `{ type: "ping", at }` — liveness/diagnostic frame.
- `subscribe(orderId, send): () => void` — registers `send` in `Map<orderId, Set<send>>`; returns an
  unsubscribe function that removes `send` and drops the `orderId` entry when its set empties (so stale
  order ids don't accumulate).
- `publish(orderId, ev): void` — fans `ev` out to that order's subscribers; no-op when there are none.
  Each `send()` is wrapped in `try/catch` so one dead stream cannot poison the fan-out.
- `subscriberCount(orderId)` — diagnostics helper.

The bus stores no history and does no IO; it is a pure in-memory fan-out. It is imported **only** by
server files (the stream route subscribes; the three write paths publish). No client component imports it.

## The SSE endpoint — `app/api/orders/[id]/stream/route.ts`

A Next.js route handler that exports `dynamic = "force-dynamic"` and `runtime = "nodejs"` (so it is
server-rendered on demand, never statically optimized, and runs on Node rather than the Edge runtime).

`GET` returns a `new Response(stream, ...)` where `stream` is a Web Streams `ReadableStream<Uint8Array>`.
On stream start it:

1. **Sends a one-shot snapshot**, reusing the `GET /track` data shape — it fetches the order + driver +
   `DriverLocation` once and emits a `location` frame if the driver has a last-known position, plus a
   `status` frame with the current status and computed ETA (`computeEtaMinutes` / `geocodeAddress` from
   `lib/driver`). This is wrapped in `try/catch` so a DB hiccup never throws out of stream start, and it
   self-heals state on every (re)connect.
2. **Subscribes to the bus** for this `orderId` and enqueues each published event as an SSE frame
   (`data: {json}\n\n`).
3. **Sends a `:keep-alive\n\n` comment every 20s** to keep the connection (and any idle-timeout proxy)
   alive. `EventSource` consumes comment frames silently.

On `request.signal` abort (and on stream `cancel()`) a single guarded `cleanup()` runs: it unsubscribes
from the bus, clears the keep-alive interval, and closes the controller. `cleanup()` is idempotent
(safe to call more than once), and a `safeEnqueue` guard tolerates an event racing the abort.

Response headers:

| Header | Value | Why |
|---|---|---|
| `Content-Type` | `text/event-stream` | SSE content type |
| `Cache-Control` | `no-cache, no-transform` | never cache or rewrite the stream |
| `Connection` | `keep-alive` | hold the connection open |
| `X-Accel-Buffering` | `no` | defeat nginx-style proxy buffering so frames flush immediately |

No browser globals are used anywhere in the server code.

## What publishes events, and where

Every publisher calls `publish(orderId, ev)` **after** the database write, wrapped best-effort in
`try/catch` so a bus error can never fail the underlying mutation. Responses are unchanged.

| Trigger | File | Event published |
|---|---|---|
| Driver posts GPS | `app/api/driver/location/route.ts` | After upserting `DriverLocation`, looks up the driver's active orders (status in `ASSIGNED` / `PICKED_UP` / `EN_ROUTE` / `DELIVERING`) and publishes `{ type: "location", lat, lng, updatedAt, name }` to **each** of them (a driver can carry more than one order). Uses the upsert's returned `updatedAt` and the driver's name for the pin label. |
| Order status transition | `app/api/orders/[id]/track/route.ts` (POST) | After persisting the new status, re-reads the driver's `DriverLocation` and publishes `{ type: "status", status, eta }` with a freshly computed ETA (`computeEtaMinutes(driverPt, geocodeAddress(order.address))`), mirroring `GET /track`'s payload. |
| Dispatch assignment | `app/admin/dispatch/actions.ts` | A shared `publishOrderStatus(orderId)` helper re-reads the order's current status + assigned driver location and publishes `{ type: "status", status, eta }`. Called in `assignDriver` (covers assign -> `ASSIGNED`, unassign, and mid-route reassign) and in `autoAssignAction` after a successful auto-assign. |

## The consumer + polling fallback — `components/logistics/tracking-client.tsx`

This is the customer's `/track/[id]` page (a `"use client"` component).

- A `useEffect` opens `new EventSource("/api/orders/${orderId}/stream")`, guarded against SSR and
  unsupported browsers (`typeof window`, `typeof EventSource`, and a `try/catch` around construction) so
  a missing stream just leaves the poll fallback active — it never throws.
- `onmessage` parses each frame and merges it into the **same** `data` state the poller already drives,
  so the existing map / ETA / timeline render is reused untouched:
  - `location` -> updates `driver.lat/lng/updatedAt` (and `name` if present) via functional `setData`.
  - `status` -> updates `status` + `eta` (ETA feeds the ETA pill, status feeds the timeline).
  - `ping` / unknown / keep-alive comments are ignored; a `JSON.parse` failure is swallowed.
- `onopen` sets `live = true`; `onerror` sets `live = false` (EventSource auto-reconnects on its own).
  Cleanup closes the stream on unmount / `orderId` change.
- **Polling fallback:** the existing `GET /api/orders/[id]/track` poll now depends on `live`. It runs
  every **10s when SSE is down** (original behavior) and backs off to **60s while SSE is live** (a cheap
  reconciliation safety net). Both paths write the same `data` state via `setData`, so there are no
  double-update glitches.
- **"Live" badge:** a small accent badge (`role="status"`, `aria-live="polite"`, pulsing dot) shown only
  while connected. The pulse honors `@media (prefers-reduced-motion: reduce)`. The visible label uses the
  `rt_live` i18n key — uz `Jonli`, ru `В эфире`, en `Live` (all three locales in `lib/i18n.ts`).

## Single-instance caveat (and the path to horizontal scale)

The bus lives in **one Node process's memory**. It only fans events to clients connected to the **same**
Railway instance. This is correct today because Railway runs a single instance.

If the app is ever scaled horizontally (multiple instances behind a load balancer), cross-instance events
are silently dropped — a driver `POST` landing on instance A would not reach a buyer whose SSE stream is
held on instance B. The fix is to swap the in-memory `Map` for **Redis pub/sub**: `publish()` PUBLISHes
to a Redis channel, and each instance SUBSCRIBEs and re-fans-out to its own local subscribers. The
`subscribe` / `publish` API is intentionally broker-agnostic so this swap stays contained to
`lib/realtime.ts`. (This caveat is also noted in the bus header and the stream route.)

Related operational notes:

- **Proxy/CDN buffering:** the route sets `X-Accel-Buffering: no` and `Cache-Control: no-transform`, but
  any edge/CDN in front of Railway must also not buffer `text/event-stream`, or frames batch and the
  real-time feel is lost. Verify in production that the stream stays open and ticks the 20s keep-alive.
- **Reconnect replay gap:** there is no `Last-Event-ID` replay. On reconnect the server re-sends a
  snapshot, which self-heals state — acceptable because location/status are latest-wins and idempotent,
  but note it if event ordering/history ever matters.
- **Connection lifetime:** the 20s keep-alive mitigates idle timeouts; if the platform enforces a hard
  max connection duration, `EventSource` auto-reconnects (and re-snapshots), so it degrades gracefully.

## Build status

Verified green. `npx tsc --noEmit` is clean (the `TrackEvent` union and `EventSource` typing check out),
and `NODE_ENV=production npx next build` compiles successfully with the `/api/orders/[id]/stream` route
registered as **Dynamic**. **No Clerk keys** are required — Clerk is fully removed and the build does not
depend on any Clerk key. i18n parity holds across uz/ru/en (`rt_live` present in all three locales). The
existing `GET /track` endpoint and the polling fallback are untouched.

## File map

| File | Role |
|---|---|
| `lib/realtime.ts` | In-memory pub/sub bus (`TrackEvent`, `subscribe`, `publish`, `subscriberCount`); `globalThis` singleton, server-only |
| `app/api/orders/[id]/stream/route.ts` | SSE endpoint: snapshot + live bus events + 20s keep-alive + cleanup on disconnect |
| `app/api/driver/location/route.ts` | Publishes a `location` event to each active order after the `DriverLocation` upsert |
| `app/api/orders/[id]/track/route.ts` | POST publishes a `status` event (with recomputed ETA) after a status transition; GET is the poll/fallback endpoint |
| `app/admin/dispatch/actions.ts` | Publishes a `status` event on assign / reassign / auto-assign |
| `components/logistics/tracking-client.tsx` | `EventSource` consumer; merges frames into `data` state; poll fallback; "Live" badge |
| `lib/i18n.ts` | `rt_live` key (uz / ru / en) |
