import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { haversineKm, hasCoords } from "@/lib/geo";
import { getCurrentSurge } from "@/lib/surge";
import {
  computeDeliveryFee,
  DELIVERY_BASE_FEE,
  FREE_DELIVERY_OVER,
  type DeliveryQuote,
} from "@/lib/delivery-pricing";

// POST /api/delivery/quote
// Body: { lat?, lng?, offerIds: string[], subtotal: number }
// Returns the LIVE customer delivery fee for the checkout screen.
//
// Resolution mirrors lib/dispatch.resolvePickup (which isn't exported): the
// pickup is the first offer's supplier Organization that has coords. We measure
// the haversine distance from the customer pin to that pickup. When either side
// is unknown the fee falls back to a default distance inside computeDeliveryFee.
//
// This handler must NEVER throw — checkout depends on it. Any failure returns a
// safe base-fee quote (surge 1, not free) so the customer can still order.

export const dynamic = "force-dynamic";

/** Resolve the primary seller's coords from the order's offer ids. */
async function resolveSellerCoords(
  offerIds: string[],
): Promise<{ lat: number; lng: number } | null> {
  if (offerIds.length === 0) return null;
  // Keep deterministic "first offer wins" ordering, matching resolvePickup.
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

export async function POST(req: NextRequest) {
  // Parse defensively — a bad body must not 500.
  const body = (await req.json().catch(() => null)) as
    | { lat?: unknown; lng?: unknown; offerIds?: unknown; subtotal?: unknown }
    | null;

  const subtotal = Number(body?.subtotal);
  const safeSubtotal = Number.isFinite(subtotal) && subtotal >= 0 ? subtotal : 0;
  const offerIds = Array.isArray(body?.offerIds)
    ? body!.offerIds.map((x) => String(x))
    : [];

  const latNum = Number(body?.lat);
  const lngNum = Number(body?.lng);
  const customer = hasCoords(latNum, lngNum) ? { lat: latNum, lng: lngNum } : null;

  try {
    const seller = await resolveSellerCoords(offerIds);
    const distanceKm =
      customer && seller
        ? haversineKm(customer.lat, customer.lng, seller.lat, seller.lng)
        : null;

    const { surge } = await getCurrentSurge();
    const quote: DeliveryQuote = computeDeliveryFee({
      distanceKm,
      subtotal: safeSubtotal,
      surge,
    });

    return NextResponse.json({
      fee: quote.fee,
      free: quote.free,
      surge: quote.surge,
      distanceKm,
      subtotal: safeSubtotal,
    });
  } catch (e) {
    // Safe default: base fee, no surge, not free. Free still wins if the basket
    // already qualifies, so a big order is never charged on a transient error.
    console.warn("delivery/quote failed -", e);
    const free = safeSubtotal >= FREE_DELIVERY_OVER;
    return NextResponse.json({
      fee: free ? 0 : DELIVERY_BASE_FEE,
      free,
      surge: 1,
      distanceKm: null,
      subtotal: safeSubtotal,
    });
  }
}
