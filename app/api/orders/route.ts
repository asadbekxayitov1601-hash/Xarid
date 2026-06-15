import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId, setSession } from "@/lib/session";
import { asapDeliveryDate, resolveDeliveryTime, normalizeDeliverMode } from "@/lib/delivery";

// POST: place the order. Prices are recomputed from the database —
// the client basket is a shopping list, never a source of money truth.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { items, buyerName, buyerPhone, address } = body ?? {};

  if (!Array.isArray(items) || items.length === 0 || !buyerName || !buyerPhone || !address) {
    return NextResponse.json({ error: "items, buyerName, buyerPhone, address required" }, { status: 400 });
  }

  // Consumer pivot: "ASAP" (on-demand, default) vs "SCHEDULED" (deliver-later
  // window). Legacy callers omit deliverMode -> ASAP, the new default.
  const deliverMode = normalizeDeliverMode(body?.deliverMode);

  // Customer-chosen delivery day + typed time (only relevant for SCHEDULED).
  const window = deliverMode === "SCHEDULED"
    ? resolveDeliveryTime(body?.deliveryDate, body?.deliveryTime)
    : null;

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

  // Resolve the delivery target. SCHEDULED orders use the customer-chosen
  // day + window; if it is missing/invalid we fall back to ASAP (cleaner for
  // consumers than the old tomorrow-morning default). ASAP orders arrive in
  // ~30-60 min, so deliveryDate = now + ASAP_ETA_MAX and no slot label.
  let deliveryDate: Date;
  let deliverySlot: string | null;
  let resolvedMode: "ASAP" | "SCHEDULED";
  if (deliverMode === "SCHEDULED" && window) {
    deliveryDate = window.deliveryDate;
    deliverySlot = window.deliverySlot;
    resolvedMode = "SCHEDULED";
  } else {
    deliveryDate = asapDeliveryDate();
    deliverySlot = null;
    resolvedMode = "ASAP";
  }

  const order = await prisma.order.create({
    data: {
      buyerUserId: userId,
      buyerName: String(buyerName),
      buyerPhone: String(buyerPhone),
      address: String(address),
      deliveryDate,
      deliverySlot,
      deliverMode: resolvedMode,
      total,
      items: { create: lines },
    },
  });

  return NextResponse.json({ ok: true, orderId: order.id, total });
}
