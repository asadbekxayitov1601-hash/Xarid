// Pure geo helpers for the Phase 1 marketplace. No deps, no side effects —
// safe to import from server actions, route handlers and client components.

/** Qo'qon (Kokand) city center. Default map center / coordinate fallback. */
export const KOKAND_CENTER = { lat: 40.5283, lng: 70.9425 } as const;

/** True when both values are finite numbers (a usable coordinate pair). */
export function hasCoords(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

/**
 * Great-circle distance in kilometres between two WGS-84 points (haversine).
 * Returns 0 for identical points; never NaN for finite inputs.
 */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371; // Earth radius, km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Human-friendly distance label, e.g. 1.234 -> "1.2 km", 0.4 -> "0.4 km". */
export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return "";
  return `${km.toFixed(1)} km`;
}
