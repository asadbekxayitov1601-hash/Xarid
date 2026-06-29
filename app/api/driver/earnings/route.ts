import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/driver/earnings  (Bearer)
//
// The courier's balance + delivery history. Balance is derived from the courier
// payout on the orders this driver has DELIVERED (cash-on-delivery, so this is
// what Xarid owes the courier for completed drops). No money is moved here — it
// is a read-only summary for the profile screen.
//   -> { balance, deliveredCount, history: [{ id, address, payout, deliveredAt }] }
const HISTORY_LIMIT = 50;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findUnique({ where: { userId }, select: { id: true } });
  if (!driver) return NextResponse.json({ balance: 0, deliveredCount: 0, history: [] });

  const delivered = await prisma.order.findMany({
    where: { driverId: driver.id, status: "DELIVERED" },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, address: true, courierPayout: true, createdAt: true },
  });

  // Aggregate the full balance across every delivered job (not just the page we
  // return for history), so a long-tenured courier sees their true total.
  const agg = await prisma.order.aggregate({
    where: { driverId: driver.id, status: "DELIVERED" },
    _sum: { courierPayout: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    balance: agg._sum.courierPayout ?? 0,
    deliveredCount: agg._count._all,
    history: delivered.map((o) => ({
      id: o.id,
      address: o.address,
      payout: o.courierPayout ?? 0,
      deliveredAt: o.createdAt,
    })),
  });
}
