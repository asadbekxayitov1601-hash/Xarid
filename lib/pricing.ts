// 7% take rate built into the buyer-facing price. Per-supplier overrides
// arrive with the Phase 3 commission engine.
export const TAKE_RATE = 0.07;

// Round UZS prices to the nearest 100 — nobody quotes 12,437 UZS at a bazaar.
export const round100 = (n: number) => Math.round(n / 100) * 100;

/** Buyer-facing price from a supplier's cost price. */
export function sellPrice(costPrice: number): number {
  return round100(costPrice * (1 + TAKE_RATE));
}
