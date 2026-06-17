import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { computeEtaMinutes, geocodeAddress } from "@/lib/driver";
import { subscribe, type TrackEvent } from "@/lib/realtime";

// Must never be statically optimized: this is a long-lived streaming response
// that subscribes to a live event bus. Node runtime so we get the Web Streams
// ReadableStream + a persistent process that can hold the connection open.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// How often we emit a keep-alive comment. Keeps proxies / the browser from
// timing the idle connection out and lets EventSource notice a dead socket.
const KEEP_ALIVE_MS = 20_000;

const encoder = new TextEncoder();

/** Serialize a typed event as one SSE `data:` frame. */
function frame(ev: TrackEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(ev)}\n\n`);
}

/**
 * GET /api/orders/:orderId/stream  (Server-Sent Events)
 *
 * Real-time tracking channel for the buyer tracking page. On connect we push a
 * one-shot snapshot (current status + ETA, and the driver's last known
 * location if any) so the client renders immediately, then we subscribe to the
 * in-memory bus and forward every published location/status event as it
 * happens. A periodic `:keep-alive` comment holds the connection open.
 *
 * The order id is the shareable tracking secret (same trust model as GET
 * /track) — intentionally unauthenticated.
 *
 * ⚠️ Single-instance only: the bus is per-process. See lib/realtime.ts for the
 * Redis-pub/sub path needed to scale horizontally.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const signal = _req.signal;

  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      // Single guarded close path — safe to call more than once.
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (keepAlive) clearInterval(keepAlive);
        keepAlive = null;
        if (unsubscribe) unsubscribe();
        unsubscribe = null;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Enqueue helper that tolerates a post-close enqueue (e.g. an event that
      // raced the abort) without throwing out of the stream.
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          cleanup();
        }
      };

      // If the client already went away before start ran, bail immediately.
      if (signal.aborted) {
        cleanup();
        return;
      }
      signal.addEventListener("abort", cleanup);

      // --- Initial snapshot ------------------------------------------------
      // Reuses the GET /track data shape. Wrapped so a DB hiccup can never
      // throw out of stream start — we just skip the snapshot and let live
      // events (and the client's GET /track fallback) fill in.
      try {
        const order = await prisma.order.findUnique({
          where: { id },
          include: { driver: { select: { id: true, name: true } } },
        });

        if (order) {
          const buyerPt = geocodeAddress(order.address);

          let driverPt: { lat: number; lng: number } | null = null;
          if (order.driver) {
            const loc = await prisma.driverLocation.findUnique({
              where: { driverId: order.driver.id },
            });
            if (loc) {
              driverPt = { lat: loc.lat, lng: loc.lng };
              safeEnqueue(
                frame({
                  type: "location",
                  lat: loc.lat,
                  lng: loc.lng,
                  updatedAt: loc.updatedAt.toISOString(),
                  name: order.driver.name,
                })
              );
            }
          }

          safeEnqueue(
            frame({
              type: "status",
              status: order.status,
              eta: computeEtaMinutes(driverPt, buyerPt),
            })
          );
        }
      } catch {
        // Snapshot is best-effort; never abort the stream over it.
      }

      if (closed) return;

      // --- Live subscription ----------------------------------------------
      unsubscribe = subscribe(id, (ev) => safeEnqueue(frame(ev)));

      // --- Keep-alive heartbeat -------------------------------------------
      keepAlive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(":keep-alive\n\n"));
        } catch {
          cleanup();
        }
      }, KEEP_ALIVE_MS);
    },

    cancel() {
      // Reader cancelled (e.g. tab closed). Mirror the abort cleanup.
      if (keepAlive) clearInterval(keepAlive);
      keepAlive = null;
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering (nginx) so frames flush immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
