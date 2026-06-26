// 7% take rate built into the buyer-facing price. Per-supplier overrides
// arrive with the Phase 3 commission engine.
export const TAKE_RATE = 0.07;

// Round UZS prices to the nearest 100 — nobody quotes 12,437 UZS at a bazaar.
export const round100 = (n: number) => Math.round(n / 100) * 100;

/** Buyer-facing price from a supplier's cost price. */
export function sellPrice(costPrice: number): number {
  return round100(costPrice * (1 + TAKE_RATE));
}

/**
 * Applies an optional storewide discount percent to a buyer-facing price.
 * Used in lockstep on the card, in the basket, and at checkout so the shown
 * "was -> now" price is always honest (the customer pays the discounted price).
 * Returns the original price unchanged when there is no discount.
 */
export function discountedPrice(price: number, discountPct?: number | null): number {
  if (!discountPct || discountPct <= 0) return price;
  const pct = Math.min(Math.max(Math.round(discountPct), 0), 90);
  return round100((price * (100 - pct)) / 100);
}
