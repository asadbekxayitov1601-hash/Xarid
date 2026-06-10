import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId, setSession } from "@/lib/session";

// POST: place the morning order. Prices are recomputed from the database —
// the client basket is a shopping list, never a source of money truth.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { items, buyerName, buyerPhone, address } = body ?? {};

  if (!Array.isArray(items) || items.length === 0 || !buyerName || !buyerPhone || !address) {
    return NextResponse.json({ error: "items, buyerName, buyerPhone, address required" }, { status: 400 });
  }

  const offerIds = items.map((i: { offerId: string }) => String(i.offerId));
  const offers = await prisma.supplierOffer.findMany({ where: { id: { in: offerIds }, available: true } });
  const offerById = new Map(offers.map((o) => [o.id, o]));

  const lines: { offerId: string; qty: number; price: number; costPrice: number }[] = [];
  for (const i of items) {
    const offer = offerById.get(String(i.offerId));
    const qty = Number(i.qty);
    if (!offer || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: `Mahsulot mavjud emas yoki miqdor noto'g'ri: ${i.offerId}` }, { status: 409 });
    }
    if (qty < offer.minQty) {
      return NextResponse.json({ error: `Minimal miqdor ${offer.minQty} (offer ${offer.id})` }, { status: 409 });
    }
    lines.push({ offerId: offer.id, qty, price: offer.price, costPrice: offer.costPrice });
  }

  const total = lines.reduce((s, l) => s + Math.round(l.price * l.qty), 0);

  // Attach to the session user (Telegram-authenticated) or create one by phone.
  let userId = await getSessionUserId();
  if (userId && !(await prisma.user.findUnique({ where: { id: userId } }))) userId = null;
  if (!userId) {
    const user = await prisma.user.upsert({
      where: { phone: String(buyerPhone) },
      update: { name: String(buyerName) },
      create: { phone: String(buyerPhone), name: String(buyerName) },
    });
    userId = user.id;
    await setSession(userId);
  }

  // Tomorrow's morning delivery.
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 1);
  deliveryDate.setHours(10, 0, 0, 0);

  const order = await prisma.order.create({
    data: {
      buyerUserId: userId,
      buyerName: String(buyerName),
      buyerPhone: String(buyerPhone),
      address: String(address),
      deliveryDate,
      total,
      items: { create: lines },
    },
  });

  return NextResponse.json({ ok: true, orderId: order.id, total });
}
