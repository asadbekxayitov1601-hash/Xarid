import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { postDelivery } from "@/lib/ledger";
import { notifyBuyerStatus } from "@/lib/notifications";
import { computeEtaMinutes, geocodeAddress } from "@/lib/driver";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

// The only transitions a courier may drive from the app. Picking up the goods
// moves the order to DELIVERING (in motion); completing the drop moves it to
// DELIVERED. Cancellation and confirmation stay admin/seller responsibilities.
const COURIER_TARGETS = ["DELIVERING", "DELIVERED"] as const;
type CourierTarget = (typeof COURIER_TARGETS)[number];

// Which current statuses each target is reachable from. Keeps a courier from
// re-delivering a finished order or skipping straight past pickup.
const ALLOWED_FROM: Record<CourierTarget, readonly string[]> = {
  DELIVERING: ["CONFIRMED", "PARTIAL"],
  DELIVERED: ["CONFIRMED", "PARTIAL", "DELIVERING"],
};

async function advance(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findFirst({ where: { userId, active: true } });
  if (!driver) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const target = String(body?.status ?? "").toUpperCase();
  if (!COURIER_TARGETS.includes(target as CourierTarget)) {
    return NextResponse.json({ error: "bad_status", allowed: COURIER_TARGETS }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Only the courier the order is assigned to may advance it.
  if (order.driverId !== driver.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Idempotent no-op: re-sending the status the order is already in succeeds
  // (the app may retry on a flaky connection) without re-running side effects.
  if (order.status === target) {
    return NextResponse.json({ ok: true, status: target });
  }

  if (!ALLOWED_FROM[target as CourierTarget].includes(order.status)) {
    return NextResponse.json(
      { error: "bad_transition", from: order.status, to: target },
      { status: 409 },
    );
  }

  await prisma.order.update({ where: { id }, data: { status: target } });

  // Mirror the admin "set status" side effects so a courier-driven delivery is
  // a first-class completion: post the delivery ledger entry, then notify the
  // buyer. Both are best-effort — neither may fail the transition the courier
  // just made on the road.
  if (target === "DELIVERED") {
    await postDelivery(id).catch((e) => console.error("postDelivery failed for", id, "-", e));
  }
  await notifyBuyerStatus(id).catch(() => {});

  // Real-time push to every buyer watching this order over SSE, mirroring the
  // status frame the /track POST sends (status + freshly computed ETA).
  try {
    const buyerPt = geocodeAddress(order.address);
    const loc = await prisma.driverLocation.findUnique({ where: { driverId: driver.id } });
    const driverPt = loc ? { lat: loc.lat, lng: loc.lng } : null;
    publish(id, { type: "status", status: target, eta: computeEtaMinutes(driverPt, buyerPt) });
  } catch {
    // Publishing is best-effort; the 10s GET /track poll remains the fallback.
  }

  return NextResponse.json({ ok: true, status: target });
}

/**
 * PATCH /api/driver/orders/:id  (Bearer)
 * Body: { status: "DELIVERING" | "DELIVERED" }
 *
 * Lets the ASSIGNED courier advance one of their orders. Verifies the order's
 * driverId belongs to the caller's Driver (404 if the order is unknown, 403 if
 * it is assigned to someone else). POST is accepted as an alias for clients that
 * cannot send PATCH.
 */
export const PATCH = advance;
export const POST = advance;
