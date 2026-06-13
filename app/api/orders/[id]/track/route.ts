import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeEtaMinutes, geocodeAddress, nextDriverStatus, shortId } from "@/lib/driver";
import { getCurrentDriver } from "@/lib/driver-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/:orderId/track
 *
 * Returns the live tracking payload used by both the buyer tracking page and
 * (optionally) the driver page. Intentionally NOT authenticated — the order
 * id is the shareable secret (same model as a parcel tracking link). Don't
 * leak items / costPrice from this endpoint.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      driver: { include: { user: { select: { id: true } } } },
      items: { select: { id: true } },
    },
  });
  if (!order) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const buyerPt = geocodeAddress(order.address);

  let driverBlock: {
    id: string;
    name: string;
    phone: string;
    lat: number | null;
    lng: number | null;
    updatedAt: string | null;
  } | null = null;
  let driverPt: { lat: number; lng: number } | null = null;

  if (order.driver) {
    const loc = await prisma.driverLocation.findUnique({ where: { driverId: order.driver.id } });
    if (loc) driverPt = { lat: loc.lat, lng: loc.lng };
    driverBlock = {
      id: order.driver.id,
      name: order.driver.name,
      phone: order.driver.phone,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      updatedAt: loc?.updatedAt?.toISOString() ?? null,
    };
  }

  const eta = computeEtaMinutes(driverPt, buyerPt);

  return NextResponse.json({
    ok: true,
    status: order.status,
    eta,
    buyer: {
      name: order.buyerName,
      address: order.address,
      lat: buyerPt.lat,
      lng: buyerPt.lng,
      itemsCount: order.items.length,
      total: order.total,
      shortId: shortId(order.id),
    },
    driver: driverBlock,
  });
}

/**
 * POST /api/orders/:orderId/track
 * Body: { status: "PICKED_UP" | "EN_ROUTE" | "DELIVERED" }
 *
 * Driver-only status transitions. The body status MUST match
 * `nextDriverStatus(currentStatus)`; arbitrary jumps are rejected. We do not
 * do payment / ledger work here — the older Telegram bot flow at
 * /lib/driver.ts::markDelivered is still the canonical "delivered" path
 * (cash + POD photo + ledger). This endpoint only flips the state string
 * so the live-tracking surface reacts.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const driver = await getCurrentDriver();
  if (!driver) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const target = String(body?.status ?? "");

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.driverId !== driver.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const expected = nextDriverStatus(order.status);
  if (!expected || expected !== target) {
    return NextResponse.json({ ok: false, error: "bad_transition", from: order.status, expected }, { status: 409 });
  }

  await prisma.order.update({ where: { id }, data: { status: target } });
  return NextResponse.json({ ok: true, status: target });
}
