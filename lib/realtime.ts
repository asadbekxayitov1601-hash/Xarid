// ---------------------------------------------------------------------------
// In-memory pub/sub bus for real-time order tracking (Server-Sent Events).
//
// Write paths (driver POSTs a location, a status transition, a dispatch assign)
// call `publish(orderId, event)` AFTER persisting. The SSE route at
// /api/orders/[id]/stream calls `subscribe(orderId, send)` and forwards every
// published event to the connected browser as an SSE frame.
//
// ⚠️ SINGLE-INSTANCE ONLY. This bus lives in this Node process's memory, so it
// only fans events out to clients connected to the SAME instance. Railway runs
// a single persistent instance today, so that's fine. If we ever scale
// horizontally (multiple instances behind a load balancer), a driver POST that
// lands on instance A would NOT reach a buyer whose SSE stream is held open on
// instance B. The fix then is a shared broker — e.g. Redis pub/sub: publish()
// PUBLISHes to a Redis channel and each instance SUBSCRIBEs and re-fans-out to
// its local subscribers. Keep that swap in mind; the public API here
// (subscribe/publish) is intentionally broker-agnostic so it can be reused.
//
// Server-only + dependency-free. Never import this from client components.
// ---------------------------------------------------------------------------

/**
 * A single real-time event for one order. JSON-serializable on purpose — it is
 * stringified straight into an SSE `data:` frame.
 *
 *  - "location": the driver moved. Mirrors the `driver` block of GET /track.
 *  - "status":   the order status (and therefore ETA) changed.
 *  - "ping":     keep-alive / liveness marker (the SSE route also sends a raw
 *                comment heartbeat; this typed variant is available if a caller
 *                wants an in-band ping).
 */
export type TrackEvent =
  | {
      type: "location";
      lat: number;
      lng: number;
      updatedAt: string;
      name?: string;
    }
  | {
      type: "status";
      status: string;
      eta: number | null;
    }
  | {
      type: "ping";
      at: number;
    };

type Send = (ev: TrackEvent) => void;

// Map<orderId, Set<send>>. One Set per order; each open SSE stream contributes
// one `send` callback. The Set is removed entirely when its last subscriber
// unsubscribes so the map doesn't grow unbounded with stale order ids.
type Bus = {
  subscribers: Map<string, Set<Send>>;
};

// Survive dev Hot Reload / repeated imports by stashing the singleton on
// globalThis, exactly like the Prisma client in lib/db.ts. Without this, each
// module re-evaluation in dev would create a fresh, empty bus and silently drop
// events published against an older instance.
const globalForRealtime = globalThis as unknown as { __xaridBus?: Bus };

const bus: Bus = globalForRealtime.__xaridBus ?? { subscribers: new Map() };
if (!globalForRealtime.__xaridBus) globalForRealtime.__xaridBus = bus;

/**
 * Subscribe `send` to all events published for `orderId`.
 * Returns an unsubscribe function — the SSE route MUST call it on disconnect so
 * the Set (and the Map entry) is cleaned up.
 */
export function subscribe(orderId: string, send: Send): () => void {
  let set = bus.subscribers.get(orderId);
  if (!set) {
    set = new Set<Send>();
    bus.subscribers.set(orderId, set);
  }
  set.add(send);

  return () => {
    const current = bus.subscribers.get(orderId);
    if (!current) return;
    current.delete(send);
    if (current.size === 0) bus.subscribers.delete(orderId);
  };
}

/**
 * Fan an event out to every subscriber of `orderId`. No-op (and zero cost) when
 * nobody is watching that order. A throwing subscriber must not break the fan
 * out for the others, so each `send` is guarded.
 */
export function publish(orderId: string, ev: TrackEvent): void {
  const set = bus.subscribers.get(orderId);
  if (!set || set.size === 0) return;
  for (const send of set) {
    try {
      send(ev);
    } catch {
      // A dead/closed stream's send threw — ignore. The route's abort handler
      // is responsible for unsubscribing it; we just don't let it poison the
      // rest of the fan out.
    }
  }
}

/** Test/diagnostic helper: how many clients are watching an order right now. */
export function subscriberCount(orderId: string): number {
  return bus.subscribers.get(orderId)?.size ?? 0;
}
