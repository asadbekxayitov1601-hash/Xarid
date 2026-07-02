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

  const order = await prisma.order.findUnique({
    where: { id },
    select: { buyerUserId: true, status: true, driverId: true, courierRating: true },
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.buyerUserId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (order.status !== "DELIVERED") return NextResponse.json({ error: "not_delivered" }, { status: 409 });
  if (order.courierRating != null) return NextResponse.json({ error: "already_rated" }, { status: 409 });

  await prisma.order.update({ where: { id }, data: { courierRating: stars } });

  // Fold into the driver's running average.
  let ratingAvg: number | null = null;
  let ratingCount = 0;
  if (order.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: order.driverId },
      select: { ratingAvg: true, ratingCount: true },
    });
    if (driver) {
      const prevCount = driver.ratingCount ?? 0;
      const prevAvg = driver.ratingAvg ?? 0;
      ratingCount = prevCount + 1;
      ratingAvg = (prevAvg * prevCount + stars) / ratingCount;
      await prisma.driver.update({
        where: { id: order.driverId },
        data: { ratingAvg, ratingCount },
      });
    }
  }

  return NextResponse.json({ ok: true, ratingAvg, ratingCount });
}
