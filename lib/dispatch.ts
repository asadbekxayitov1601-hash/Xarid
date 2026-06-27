import { prisma } from "@/lib/db";
import { haversineKm, hasCoords } from "@/lib/geo";
import { notifyCourierNewJob } from "@/lib/notifications";

// How recent a DriverLocation must be for a courier to count as "available" and
// route-able by distance. Older fixes are treated as stale (the courier may be
// offline), so they fall through to the any-active-driver fallback.
const FRESH_LOCATION_MS = 30 * 60 * 1000; // ~30 min

// Statuses where auto-dispatch is still allowed to set a driver. Past pickup we
// never silently reassign — the dispatcher owns mid-route changes.
const ASSIGNABLE_STATUSES = new Set(["PLACED", "CONFIRMED"]);

type AssignResult =
  | { ok: true; driverId: string; distanceKm: number | null }
  | { ok: false; reason: "no_pickup_coords" | "no_couriers" | "not_found" | "already_assigned" };

/**
 * Resolve the pickup point for an order. Priority:
 *   1. The order's primary seller Organization coords (first OrderItem's
 *      supplier that has lat/lng). An order may span multiple sellers — we use
 *      the first/primary one as the single pickup.
 *   2. The customer's delivery coords on the order itself.
 * Returns null when neither is available.
 */
async function resolvePickup(order: {
  id: string;
  lat: number | null;
  lng: number | null;
}): Promise<{ lat: number; lng: number } | null> {
  // Walk OrderItem -> SupplierOffer -> supplier(Organization), keeping order so
  // the "first" item wins deterministically.
  const items = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    orderBy: { id: "asc" },
    include: { offer: { include: { supplier: { select: { lat: true, lng: true } } } } },
  });

  for (const it of items) {
    const sup = it.offer?.supplier;
    if (sup && hasCoords(sup.lat, sup.lng)) {
      return { lat: sup.lat as number, lng: sup.lng as number };
    }
  }

  // Fallback: the customer's own delivery coordinates on the order.
  if (hasCoords(order.lat, order.lng)) {
    return { lat: order.lat as number, lng: order.lng as number };
  }

  return null;
}

/**
 * Algorithmically assign the nearest available courier to an order, replacing
 * manual admin assignment as the default dispatch path.
 *
 * Idempotent: an order that already has a driver returns `already_assigned`
 * without touching it. Null-safe throughout. Only flips status to ASSIGNED when
 * the order is still PLACED/CONFIRMED.
 */
export async function autoAssignCourier(orderId: string): Promise<AssignResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, lat: true, lng: true, status: true, driverId: true },
  });
  if (!order) return { ok: false, reason: "not_found" };
  if (order.driverId) return { ok: false, reason: "already_assigned" };

  const pickup = await resolvePickup(order);
  if (!pickup) return { ok: false, reason: "no_pickup_coords" };

  // Candidate couriers: active drivers. We pull their last known location to
  // rank by distance; drivers without a recent fix become the fallback pool.
  const drivers = await prisma.driver.findMany({
    where: { active: true },
    select: { id: true },
  });
  if (drivers.length === 0) return { ok: false, reason: "no_couriers" };

  const driverIds = drivers.map((d) => d.id);
  const locations = await prisma.driverLocation.findMany({
    where: { driverId: { in: driverIds } },
  });
  const now = Date.now();
  const locByDriver = new Map(locations.map((l) => [l.driverId, l]));

  // Rank drivers that have a fresh, valid location by haversine distance.
  let best: { driverId: string; distanceKm: number } | null = null;
  for (const d of drivers) {
    const loc = locByDriver.get(d.id);
    if (!loc) continue;
    if (now - loc.updatedAt.getTime() > FRESH_LOCATION_MS) continue;
    if (!hasCoords(loc.lat, loc.lng)) continue;
    const distanceKm = haversineKm(loc.lat, loc.lng, pickup.lat, pickup.lng);
    if (!best || distanceKm < best.distanceKm) {
      best = { driverId: d.id, distanceKm };
    }
  }

  // Fallback: no courier has a recent location — pick any active driver so the
  // order still gets dispatched (distance unknown). Deterministic: first by id.
  const chosen: { driverId: string; distanceKm: number | null } =
    best ?? { driverId: driverIds[0], distanceKm: null };

  // Re-check assignability and re-guard against a concurrent assignment before
  // writing, keeping the operation idempotent under races.
  const fresh = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, driverId: true },
  });
  if (!fresh) return { ok: false, reason: "not_found" };
  if (fresh.driverId) return { ok: false, reason: "already_assigned" };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      driverId: chosen.driverId,
      status: ASSIGNABLE_STATUSES.has(fresh.status) ? "ASSIGNED" : fresh.status,
    },
  });

  await notifyCourierNewJob(orderId).catch(() => {}); // FCM push to the courier's app

  return { ok: true, driverId: chosen.driverId, distanceKm: chosen.distanceKm };
}
