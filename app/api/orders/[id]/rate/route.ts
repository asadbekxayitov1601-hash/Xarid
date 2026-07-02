import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST /api/orders/:id/rate  (Bearer)  { stars: 1..5 }
//
// The buyer rates the courier for a delivered order. Records the rating on the
// order (once) and folds it into the driver's running average. Idempotent-ish:
// re-rating a already-rated order is rejected.
//   -> { ok: true, ratingAvg, ratingCount }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const stars = Math.trunc(Number(json?.stars));
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars" }, { status: 400 });
  }

  // Atomically claim the rating slot: this succeeds exactly once, and only for
  // the buyer, on a DELIVERED, not-yet-rated order. Doing the check + write in a
  // single conditional update closes the TOCTOU where concurrent POSTs from the
  // same buyer could each pass a separate null-check and fold multiple times.
  const claimed = await prisma.order.updateMany({
    where: { id, buyerUserId: userId, status: "DELIVERED", courierRating: null },
    data: { courierRating: stars },
  });
  if (claimed.count !== 1) {
    // Explain the failure precisely (only on the miss path).
    const order = await prisma.order.findUnique({
      where: { id },
      select: { buyerUserId: true, status: true, courierRating: true },
    });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (order.buyerUserId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (order.status !== "DELIVERED") return NextResponse.json({ error: "not_delivered" }, { status: 409 });
    return NextResponse.json({ error: "already_rated" }, { status: 409 });
  }

  // Recompute the driver's rating from the source of truth (every rated order),
  // rather than an incremental fold. This is idempotent + self-healing, so a
  // replay or a concurrent rating of a different order converges to the correct
  // aggregate instead of corrupting a running counter.
  const order = await prisma.order.findUnique({ where: { id }, select: { driverId: true } });
  let ratingAvg: number | null = null;
  let ratingCount = 0;
  if (order?.driverId) {
    const agg = await prisma.order.aggregate({
      where: { driverId: order.driverId, courierRating: { not: null } },
      _avg: { courierRating: true },
      _count: { courierRating: true },
    });
    ratingAvg = agg._avg.courierRating;
    ratingCount = agg._count.courierRating;
    await prisma.driver.update({
      where: { id: order.driverId },
      data: { ratingAvg, ratingCount },
    });
  }

  return NextResponse.json({ ok: true, ratingAvg, ratingCount });
}
