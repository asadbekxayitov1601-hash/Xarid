import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId, setSession } from "@/lib/session";
import { normalizePhone } from "@/lib/password";
import { asapDeliveryDate, resolveDeliveryTime, normalizeDeliverMode } from "@/lib/delivery";
import { hasCoords, haversineKm } from "@/lib/geo";
import { autoAssignCourier } from "@/lib/dispatch";
import { getCurrentSurge } from "@/lib/surge";
import { computeDeliveryFee, computeCourierPayout } from "@/lib/delivery-pricing";
import { discountedPrice } from "@/lib/pricing";

// Resolve the primary seller's coords from the order's offer ids, mirroring
// lib/dispatch.resolvePickup (which isn't exported) and /api/delivery/quote:
// the first offer whose supplier Organization has coords wins, deterministically
// by the offerIds order. Returns null when no seller has coords.
async function resolveSellerCoords(
  offerIds: string[],
): Promise<{ lat: number; lng: number } | null> {
  if (offerIds.length === 0) return null;
  const offers = await prisma.supplierOffer.findMany({
    where: { id: { in: offerIds } },
    include: { supplier: { select: { lat: true, lng: true } } },
  });
  const byId = new Map(offers.map((o) => [o.id, o]));
  for (const id of offerIds) {
    const sup = byId.get(id)?.supplier;
    if (sup && hasCoords(sup.lat, sup.lng)) {
      return { lat: sup.lat as number, lng: sup.lng as number };
    }
  }
  return null;
}

// POST: place the order. Prices are recomputed from the database —
// the client basket is a shopping list, never a source of money truth.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { items, buyerName, buyerPhone, address } = body ?? {};

  if (!Array.isArray(items) || items.length === 0 || !buyerName || !buyerPhone || !address) {
    return NextResponse.json({ error: "items, buyerName, buyerPhone, address required" }, { status: 400 });
  }

  // Optional delivery coordinates from the checkout map pin. The pin is
  // encouraged but not required (the address text always stays mandatory), so a
  // missing or malformed pair simply falls back to null — auto-dispatch then
  // uses the seller's coords as the pickup, never the customer drop point.
  const latNum = Number(body?.lat);
  const lngNum = Number(body?.lng);
  const hasPin = hasCoords(latNum, lngNum);
  const orderLat = hasPin ? latNum : null;
  const orderLng = hasPin ? lngNum : null;

  // Consumer pivot: "ASAP" (on-demand, default) vs "SCHEDULED" (deliver-later
  // window). Legacy callers omit deliverMode -> ASAP, the new default.
  const deliverMode = normalizeDeliverMode(body?.deliverMode);

  // Customer-chosen delivery day + typed time (only relevant for SCHEDULED).
  const window = deliverMode === "SCHEDULED"
    ? resolveDeliveryTime(body?.deliveryDate, body?.deliveryTime)
    : null;

  const offerIds = items.map((i: { offerId: string }) => String(i.offerId));
  const offers = await prisma.supplierOffer.findMany({
    where: { id: { in: offerIds }, available: true },
    // The store's storewide discount is applied to the buyer price here so the
    // struck-through "was -> now" shown on the card is actually charged.
    include: { supplier: { select: { discountPct: true } } },
  });
  const offerById = new Map(offers.map((o) => [o.id, o]));

  // Collect EVERY problem item (offer missing/unavailable, qty invalid, or
  // below minQty) instead of bailing on the first one, then return a stable
  // coded error the client maps to a friendly, translated message. The raw
  // offer id must never reach the user (it changes on a catalog re-seed and is
  // meaningless to a shopper). The frontend uses offerIds to prune the basket.
  const lines: { offerId: string; qty: number; price: number; costPrice: number }[] = [];
  const badIds: string[] = [];
  for (const i of items) {
    const offer = offerById.get(String(i.offerId));
    const qty = Number(i.qty);
    if (!offer || !Number.isFinite(qty) || qty <= 0 || qty < offer.minQty) {
      badIds.push(String(i.offerId));
      continue;
    }
    // Buyer pays the discounted price; the supplier costPrice (their payout) is
    // unchanged — the storewide discount comes out of the platform margin.
    const price = discountedPrice(offer.price, offer.supplier.discountPct);
    lines.push({ offerId: offer.id, qty, price, costPrice: offer.costPrice });
  }
  if (badIds.length > 0) {
    return NextResponse.json({ error: "items_unavailable", offerIds: badIds }, { status: 409 });
  }

  const total = lines.reduce((s, l) => s + Math.round(l.price * l.qty), 0);

  // Attach to the session user (Telegram-authenticated) or create one by phone.
  let userId = await getSessionUserId();
  if (userId && !(await prisma.user.findUnique({ where: { id: userId } }))) userId = null;
  // Normalize the phone so a guest checkout and a later sign-up with the SAME
  // number resolve to the same user (keeps order history on "claim").
  const phoneKey = normalizePhone(String(buyerPhone)) ?? String(buyerPhone);
  if (!userId) {
    const existing = await prisma.user.findUnique({
      where: { phone: phoneKey },
      select: { id: true, passwordHash: true, role: true },
    });
    if (existing) {
      // Attach the order to the existing account, but NEVER hand an
      // unauthenticated caller a session for an account that has a password or
      // an elevated role. Otherwise ordering with someone's phone (e.g. the
      // admin's known number) would silently grant their session — account
      // takeover. Such users must sign in to claim/track the order.
      userId = existing.id;
      if (!existing.passwordHash && existing.role === "OWNER") {
        await prisma.user.update({ where: { id: existing.id }, data: { name: String(buyerName) } });
        await setSession(userId);
      }
    } else {
      const user = await prisma.user.create({ data: { phone: phoneKey, name: String(buyerName) } });
      userId = user.id;
      await setSession(user.id);
    }
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

  // --- Dynamic delivery fee (Phase 2). Recompute everything server-side; the
  // client-shown quote is advisory only and is NEVER trusted for money. ---
  // Distance = customer drop pin -> primary seller pickup (same resolution as
  // auto-dispatch). When either side is unknown, computeDeliveryFee falls back
  // to a typical short hop internally, so a missing pin never blocks checkout.
  let deliveryFee = 0;
  let surge = 1;
  let courierPayout = 0;
  try {
    const seller = await resolveSellerCoords(offerIds);
    const distanceKm =
      hasPin && seller ? haversineKm(orderLat as number, orderLng as number, seller.lat, seller.lng) : null;
    const surgeState = await getCurrentSurge();
    surge = surgeState.surge;
    const quote = computeDeliveryFee({ distanceKm, subtotal: total, surge });
    deliveryFee = quote.fee;
    courierPayout = computeCourierPayout({ distanceKm, surge });
  } catch (e) {
    // A pricing failure must never block a paid order: fall back to a free
    // delivery line (fee 0) and let the dispatch board reconcile payout later.
    console.warn("delivery fee compute failed for order -", e);
    deliveryFee = 0;
    surge = 1;
    courierPayout = 0;
  }

  const order = await prisma.order.create({
    data: {
      buyerUserId: userId,
      buyerName: String(buyerName),
      buyerPhone: String(buyerPhone),
      address: String(address),
      lat: orderLat,
      lng: orderLng,
      deliveryDate,
      deliverySlot,
      deliverMode: resolvedMode,
      // total stays the items subtotal; the customer pays total + deliveryFee.
      total,
      deliveryFee,
      surge,
      courierPayout,
      items: { create: lines },
    },
  });

  // Auto-dispatch the nearest available courier (Yandex-Eats style), replacing
  // manual admin assignment as the default. A failure here must NEVER block a
  // successful order: swallow it and let the admin dispatch board pick up the
  // slack. The pickup point is resolved from the seller's coords inside.
  try {
    await autoAssignCourier(order.id);
  } catch (e) {
    console.warn("autoAssignCourier failed for order", order.id, "-", e);
  }

  return NextResponse.json({ ok: true, orderId: order.id, total, deliveryFee });
}
