import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// The statuses a courier still needs to act on (active job board) plus a tail of
// recently completed drops so the app can show "just delivered" without a second
// request. CANCELLED orders are intentionally excluded — they are off the board.
const ACTIVE_STATUSES = ["CONFIRMED", "PARTIAL", "DELIVERING"] as const;
const DELIVERED_TAIL = 10;

/**
 * GET /api/driver/orders  (Bearer)
 *
 * The signed-in courier's job list: every order assigned to them that is still
 * in motion, plus the most recent DELIVERED drops. The Driver row is resolved
 * from the session user (User.role DRIVER linked to a Driver via Driver.userId).
 * A DRIVER user with no linked, active Driver row simply has an empty board.
 *
 * Auth: Bearer token (mobile) or session cookie (web), via getSessionUserId.
 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findFirst({ where: { userId, active: true } });
  // A DRIVER account that hasn't been linked to a Driver row yet has no jobs.
  if (!driver) return NextResponse.json({ orders: [] });

  // Active jobs (newest first) and a short tail of recently delivered ones, in a
  // single query so the courier app shows both with one round-trip.
  const orders = await prisma.order.findMany({
    where: {
      driverId: driver.id,
      status: { in: [...ACTIVE_STATUSES, "DELIVERED"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      address: true,
      lat: true,
      lng: true,
      buyerName: true,
      buyerPhone: true,
      total: true,
      deliveryFee: true,
      courierPayout: true,
      createdAt: true,
      deliveryDate: true,
      deliverMode: true,
      _count: { select: { items: true } },
    },
  });

  // Keep all active jobs but cap the delivered tail so a long history never
  // bloats the payload. The query is already newest-first, so slicing the
  // delivered rows keeps the most recent ones.
  let deliveredSeen = 0;
  const trimmed = orders.filter((o) => {
    if (o.status !== "DELIVERED") return true;
    deliveredSeen += 1;
    return deliveredSeen <= DELIVERED_TAIL;
  });

  return NextResponse.json({
    orders: trimmed.map((o) => ({
      id: o.id,
      status: o.status,
      address: o.address,
      lat: o.lat,
      lng: o.lng,
      buyerName: o.buyerName,
      buyerPhone: o.buyerPhone,
      total: o.total,
      deliveryFee: o.deliveryFee ?? 0,
      courierPayout: o.courierPayout ?? 0,
      itemCount: o._count.items,
      createdAt: o.createdAt,
      deliveryDate: o.deliveryDate,
      deliverMode: o.deliverMode,
    })),
  });
}
