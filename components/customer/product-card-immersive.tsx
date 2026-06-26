"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Plus, Minus } from "lucide-react";
import { useBasket } from "@/components/basket-provider";
import { t, unitLabel, type Locale } from "@/lib/i18n";
import { discountedPrice } from "@/lib/pricing";
import { productEmoji } from "@/lib/product-emoji";
import type { CatalogProduct } from "@/components/catalog-client";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

// ImmersiveProductCard
// ---------------------
// Lavka/Yandex-Eats-style vertical product card:
//  - large product image on top, edge-to-edge;
//  - a "-N%" discount badge (top-left) when the store runs a storewide discount;
//  - a round "+" add button (bottom-right of the image) that becomes a qty
//    stepper once the item is in the basket;
//  - below the image: the (discounted) price in bold accent, the struck-through
//    original when discounted, the product name (2-line clamp), and the unit.
// The discount comes from the product's store (CatalogProduct.discountPct) and is
// applied identically here, in the basket, and at checkout (lib/pricing) so the
// shown "was -> now" price is always what the customer actually pays.
// All visible strings flow through t().
export function ImmersiveProductCard({
  p,
  locale,
  index,
}: {
  p: CatalogProduct;
  locale: Locale;
  index: number;
}) {
  const { items, setQty } = useBasket();
  const inBasket = items.find((i) => i.offerId === p.offerId);

  // Lets the shopper type a quantity directly. `draft` holds the in-progress
  // text so clearing the field doesn't instantly remove the item; it commits on
  // blur / Enter and reverts to the basket value when left empty or invalid.
  const [draft, setDraft] = useState<string | null>(null);
  function commitQty() {
    if (draft === null) return;
    const n = parseFloat(draft.replace(",", "."));
    if (Number.isFinite(n) && n > 0) setQty(p.offerId, n);
    setDraft(null);
  }

  const shown = discountedPrice(p.price, p.discountPct);
  const hasDiscount = shown < p.price;
  const pct = hasDiscount ? Math.round((1 - shown / p.price) * 100) : 0;

  const start = Math.max(p.minQty, 1);
  const step = 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.02, 0.2) }}
    >
      <div
        className="group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 border-[color:var(--border-color)] hover:border-[color:var(--accent)]"
        style={{ background: "var(--bg-primary)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* Image area */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-secondary">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-5xl" aria-hidden>
              {productEmoji(p.name, p.category)}
            </div>
          )}

          {/* Discount badge */}
          {hasDiscount && (
            <span
              className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums"
              style={{ background: "var(--status-warning)", color: "var(--on-accent)" }}
            >
              -{pct}%
            </span>
          )}

          {/* Add button / qty stepper */}
          <div className="absolute bottom-2.5 right-2.5">
            {!inBasket ? (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label={t(locale, "add_to_basket")}
                onClick={() =>
                  setQty(p.offerId, start, {
                    offerId: p.offerId,
                    productName: p.name,
                    supplierName: p.supplierName,
                    unit: p.unit,
                    price: shown,
                    minQty: p.minQty,
                    image: p.image,
                  })
                }
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full transition-colors"
                style={{
                  background: "var(--bg-primary)",
                  color: "var(--accent)",
                  boxShadow: "var(--shadow-md)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <Plus size={20} strokeWidth={2.5} />
              </motion.button>
            ) : (
              <div
                className="flex items-center gap-1 rounded-full p-1 select-none"
                style={{ background: "var(--accent)", boxShadow: "var(--shadow-md)" }}
              >
                <button
                  type="button"
                  aria-label={t(locale, "qty_aria")}
                  onClick={() => setQty(p.offerId, Math.max(0, inBasket.qty - step))}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full transition-opacity hover:opacity-80"
                >
                  <Minus size={15} strokeWidth={3} style={{ color: "var(--on-accent)" }} />
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={t(locale, "qty_aria")}
                  value={draft ?? String(inBasket.qty)}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitQty}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-9 bg-transparent text-center text-sm font-extrabold tabular-nums outline-none"
                  style={{ color: "var(--on-accent)" }}
                />
                <button
                  type="button"
                  aria-label={t(locale, "qty_aria")}
                  onClick={() => setQty(p.offerId, inBasket.qty + step)}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full transition-opacity hover:opacity-80"
                >
                  <Plus size={15} strokeWidth={3} style={{ color: "var(--on-accent)" }} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1 p-3">
          {/* Price */}
          <div className="flex items-baseline gap-2 tabular-nums">
            <span
              className="text-base font-extrabold leading-none"
              style={{
                color: hasDiscount ? "var(--accent)" : "var(--text-primary)",
                fontFamily: "var(--font-display, Outfit), sans-serif",
              }}
            >
              {fmt(shown)} {t(locale, "sum")}
            </span>
            {hasDiscount && (
              <span className="text-xs font-medium text-text-secondary line-through">
                {fmt(p.price)}
              </span>
            )}
          </div>

          {/* Name */}
          <div
            className="line-clamp-2 text-sm leading-snug text-text-primary"
            style={{ fontFamily: "var(--font-body, Inter), sans-serif" }}
          >
            {p.name}
          </div>

          {/* Unit / size */}
          <div className="mt-auto pt-1 text-xs text-text-secondary">
            {unitLabel(locale, p.unit)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
