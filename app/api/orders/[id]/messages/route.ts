import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BODY = 2000;

// Resolve the caller's role on this order: only the buyer or the assigned
// courier may read/write the order chat. Returns null when unauthorized.
async function resolveParty(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { buyerUserId: true, driver: { select: { userId: true } } },
  });
  if (!order) return null;
  if (order.buyerUserId === userId) return { fromCourier: false };
  if (order.driver?.userId && order.driver.userId === userId) return { fromCourier: true };
  return null;
}

// GET /api/orders/:id/messages  (Bearer)
//   -> { messages: [{ id, fromCourier, body, createdAt }] }
// Marks the other party's unread messages read so the badge clears on open.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const party = await resolveParty(id, userId);
  if (!party) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const messages = await prisma.orderMessage.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, fromCourier: true, body: true, createdAt: true },
  });

  // Clear unread for messages the OTHER side sent (from the caller's view).
  await prisma.orderMessage.updateMany({
    where: { orderId: id, fromCourier: !party.fromCourier, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages });
}

// POST /api/orders/:id/messages  (Bearer)  { body }
//   -> { messages: [...] }  (the full thread after appending)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const party = await resolveParty(id, userId);
  if (!party) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const body = String(json?.body ?? "").trim().slice(0, MAX_BODY);
  if (!body) return NextResponse.json({ error: "empty" }, { status: 400 });

  await prisma.orderMessage.create({
    data: { orderId: id, fromCourier: party.fromCourier, body },
  });

  const messages = await prisma.orderMessage.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, fromCourier: true, body: true, createdAt: true },
  });
  return NextResponse.json({ messages });
}
