// Dynamic delivery pricing (Phase 2, Yandex-Eats model).
//
// Two prices come out of the same trip:
//   * the CUSTOMER fee — kept intentionally cheap (and free over a basket
//     threshold). The per-km rate is BELOW the courier's, i.e. subsidized.
//   * the COURIER payout — what the rider earns. It can exceed the customer fee
//     by design; the gap is covered by the 7% product margin + consolidation.
// Both scale by the SAME surge multiplier (see lib/surge.ts).
//
// Pure functions, no IO — safe to import from route handlers, server actions
// and client components alike.

import { round100 } from "@/lib/pricing";

// --- Customer-facing fee constants (UZS, Kokand). Tune here. ---
export const DELIVERY_BASE_FEE = 5000; // flat base every paid delivery starts at
export const DELIVERY_PER_KM_FEE = 1200; // per km — deliberately below courier rate
export const DELIVERY_FEE_CAP = 15000; // hard cap before surge is applied
export const FREE_DELIVERY_OVER = 100000; // items subtotal at/above this -> free

// --- Courier payout constants (UZS). What the rider earns. ---
export const COURIER_BASE = 5000;
export const COURIER_PER_KM = 1500; // pays the courier more per km than we charge

// When the customer pin and/or the seller coords are unknown we cannot measure
// the trip, so we price a typical short Kokand hop instead of guessing high.
// 3 km keeps the fallback fee close to the city-wide average (and well under the
// cap) without ever surprising the customer.
export const DEFAULT_DISTANCE_KM = 3;

export type DeliveryQuote = {
  fee: number; // surge-applied customer fee, UZS (0 when free)
  free: boolean; // true when the basket qualifies for free delivery
  base: number; // the un-surged base+distance fee (capped), for breakdown UI
  distancePart: number; // the distance component of `base`, UZS
  surge: number; // the multiplier that was applied
};

/** Resolve a usable distance, falling back to a typical hop when unknown. */
function safeDistanceKm(distanceKm: number | null | undefined): number {
  return typeof distanceKm === "number" && Number.isFinite(distanceKm) && distanceKm >= 0
    ? distanceKm
    : DEFAULT_DISTANCE_KM;
}

/**
 * Compute the customer delivery fee.
 *
 * - free when `subtotal >= FREE_DELIVERY_OVER` (then fee 0).
 * - else fee = round100( min(BASE + km*PER_KM, CAP) * surge ).
 * The cap is applied to the base+distance BEFORE surge, so a busy night can
 * still lift the fee above the cap — that is the surge doing its job.
 */
export function computeDeliveryFee(args: {
  distanceKm: number | null | undefined;
  subtotal: number;
  surge: number;
}): DeliveryQuote {
  const km = safeDistanceKm(args.distanceKm);
  const surge = Number.isFinite(args.surge) && args.surge > 0 ? args.surge : 1;

  const distancePart = Math.round(km * DELIVERY_PER_KM_FEE);
  const base = Math.min(DELIVERY_BASE_FEE + distancePart, DELIVERY_FEE_CAP);

  if (Number.isFinite(args.subtotal) && args.subtotal >= FREE_DELIVERY_OVER) {
    return { fee: 0, free: true, base, distancePart, surge };
  }

  const fee = round100(base * surge);
  return { fee, free: false, base, distancePart, surge };
}

/**
 * What the courier earns for the trip (for transparency display). Higher per-km
 * rate than the customer fee, same surge applied. Null-safe distance.
 */
export function computeCourierPayout(args: {
  distanceKm: number | null | undefined;
  surge: number;
}): number {
  const km = safeDistanceKm(args.distanceKm);
  const surge = Number.isFinite(args.surge) && args.surge > 0 ? args.surge : 1;
  return round100((COURIER_BASE + km * COURIER_PER_KM) * surge);
}
