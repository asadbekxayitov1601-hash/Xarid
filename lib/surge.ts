// Demand surge for dynamic delivery pricing (Phase 2).
//
// surge = clamp(1 + 0.5 * max(0, openOrders/activeCouriers - 1), 1.0, 2.5)
//
// Intuition: at parity (one open order per available courier) surge = 1.0. Each
// extra unassigned order per courier adds half a step, up to a 2.5x ceiling. If
// nothing can be delivered fast (no active couriers) we charge NO surge — it
// would be punishing the customer for our own capacity gap.

import { prisma } from "@/lib/db";

// A DriverLocation must be this fresh for the courier to count as "active". Must
// match lib/dispatch.ts so the surge denominator and the dispatch pool agree.
const FRESH_LOCATION_MS = 30 * 60 * 1000; // ~30 min

export const SURGE_MIN = 1.0;
export const SURGE_MAX = 2.5;

/** Clamp x into [lo, hi]. Pure helper. */
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export type SurgeState = {
  surge: number;
  openOrders: number;
  activeCouriers: number;
};

/**
 * Current city-wide surge state. Two counts drive it:
 *   openOrders     — orders still waiting for a courier (PLACED/CONFIRMED,
 *                    driverId null).
 *   activeCouriers — active Drivers whose last location fix is recent.
 * Never throws meaningfully for the caller's sake, but if the DB itself fails
 * the rejection propagates — the quote route catches it and falls back safely.
 */
export async function getCurrentSurge(): Promise<SurgeState> {
  const freshSince = new Date(Date.now() - FRESH_LOCATION_MS);

  // Driver has no relation field to DriverLocation, so active couriers can't be
  // counted in a single query — countActiveCouriers intersects the two sets.
  const [openOrders, couriers] = await Promise.all([
    prisma.order.count({
      where: { status: { in: ["PLACED", "CONFIRMED"] }, driverId: null },
    }),
    countActiveCouriers(freshSince),
  ]);

  if (couriers === 0) {
    return { surge: SURGE_MIN, openOrders, activeCouriers: 0 };
  }

  const surge = clamp(1 + 0.5 * Math.max(0, openOrders / couriers - 1), SURGE_MIN, SURGE_MAX);
  return { surge, openOrders, activeCouriers: couriers };
}

/**
 * Active couriers = active Drivers that also have a DriverLocation updated
 * within the freshness window. Driver has no relation field to DriverLocation,
 * so we intersect the two sets by id.
 */
async function countActiveCouriers(freshSince: Date): Promise<number> {
  const [activeDrivers, freshLocs] = await Promise.all([
    prisma.driver.findMany({ where: { active: true }, select: { id: true } }),
    prisma.driverLocation.findMany({
      where: { updatedAt: { gte: freshSince } },
      select: { driverId: true },
    }),
  ]);
  const freshIds = new Set(freshLocs.map((l) => l.driverId));
  let n = 0;
  for (const d of activeDrivers) if (freshIds.has(d.id)) n++;
  return n;
}
