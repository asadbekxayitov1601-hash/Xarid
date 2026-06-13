"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Plus, Minus } from "lucide-react";
import { useBasket } from "@/components/basket-provider";
import { t, unitLabel, type Locale } from "@/lib/i18n";
import { productEmoji } from "@/lib/product-emoji";
import type { CatalogProduct } from "@/components/catalog-client";

// ImmersiveProductCard
// ---------------------
// Variant of the catalog product card aligned with docs/DESIGN_SYSTEM.md:
//  - scene-perspective parent so depth-* actually lifts the inner layers.
//  - tilt-on-pointer (CSS-3D; no WebGL) — desktop only, touch devices stay flat.
//  - resting shadow uses --shadow-md token; hover lifts to --shadow-lg + accent halo.
//  - typography uses font-display for product name and tabular-nums for the price,
//    falling back to Outfit / JetBrains Mono via inline style only where the project
//    still requires them.
//  - all visible strings flow through t().
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
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, lift: 0 });

  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    // ≤ 8° per design system §5.3
    setTilt({ rx: py * -6, ry: px * 8, lift: 1 });
  }

  function reset() {
    setTilt({ rx: 0, ry: 0, lift: 0 });
  }

  const start = Math.max(p.minQty, 1);
  const step = 1;
  const lifted = tilt.lift > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.02, 0.2) }}
      className="scene-perspective"
    >
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className="scene-3d glass-card rounded-2xl p-4 flex flex-col justify-between gap-3 relative will-change-transform"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(${lifted ? -6 : 0}px) translateZ(${lifted ? 12 : 0}px)`,
          boxShadow: lifted
            ? "var(--shadow-lg), 0 0 24px var(--accent-glow)"
            : "var(--shadow-md)",
          transition:
            "transform var(--ease-glide, cubic-bezier(0.25,0.8,0.25,1)) 250ms, box-shadow var(--ease-glide, cubic-bezier(0.25,0.8,0.25,1)) 350ms",
        }}
      >
        {/* Top row: thumbnail + name + supplier (depth-1 lift on hover) */}
        <div
          className="flex items-start gap-3"
          style={{
            transform: lifted ? "translateZ(20px)" : "translateZ(0)",
            transition: "transform 350ms var(--ease-glide, cubic-bezier(0.25,0.8,0.25,1))",
          }}
        >
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image}
              alt=""
              className="w-12 h-12 rounded-xl object-cover border border-border-primary flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-bg-secondary/50 border border-border-primary">
              {productEmoji(p.name, p.category)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div
              className="font-semibold text-sm leading-tight truncate text-text-primary"
              style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
            >
              {p.name}
            </div>
            <div
              className="text-xs mt-0.5 text-text-secondary truncate"
              style={{ fontFamily: "var(--font-body, Inter), sans-serif" }}
            >
              <span aria-label={t(locale, "catalog_supplier_label")}>
                {p.altName} ·{" "}
                <span className="font-bold text-text-primary">{p.supplierName}</span>
              </span>
            </div>
            {p.offerCount > 1 && (
              <div
                className="text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block"
                style={{
                  background: "var(--status-success-bg)",
                  color: "var(--status-success)",
                  fontFamily: "var(--font-body, Inter), sans-serif",
                }}
              >
                {t(locale, "cheapest_of", { n: p.offerCount })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: price + qty (the price lifts further so it visually floats off the card) */}
        <div
          className="flex items-center justify-between mt-1"
          style={{
            transform: lifted ? "translateZ(35px)" : "translateZ(0)",
            transition: "transform 350ms var(--ease-glide, cubic-bezier(0.25,0.8,0.25,1))",
          }}
        >
          <div className="tabular-nums">
            <span
              className="font-bold"
              style={{
                color: "var(--accent)",
                fontFamily: "var(--font-display, JetBrains Mono), monospace",
                fontSize: "1rem",
              }}
            >
              {new Intl.NumberFormat("ru-RU").format(p.price)}
            </span>
            <span className="text-xs ml-1 text-text-secondary">
              {t(locale, "sum")}/{unitLabel(locale, p.unit)}
            </span>
          </div>

          {/* Qty control */}
          {!inBasket ? (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              aria-label={t(locale, "add_to_basket")}
              onClick={() =>
                setQty(p.offerId, start, {
                  offerId: p.offerId,
                  productName: p.name,
                  supplierName: p.supplierName,
                  unit: p.unit,
                  price: p.price,
                  minQty: p.minQty,
                  image: p.image,
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer select-none"
              style={{
                background: "var(--accent)",
                color: "var(--bg-primary)",
                boxShadow: "var(--shadow-glow-accent, 0 0 12px rgba(165,86,251,0.35))",
                fontFamily: "var(--font-display, Outfit), sans-serif",
              }}
            >
              <Plus size={14} />
              {t(locale, "add_to_basket")}
            </motion.button>
          ) : (
            <div
              className="flex items-center gap-2 rounded-full px-2 py-1 select-none"
              style={{
                background: "var(--status-success-bg)",
                border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
              }}
            >
              <button
                type="button"
                aria-label={t(locale, "qty_aria")}
                onClick={() => setQty(p.offerId, Math.max(0, inBasket.qty - step))}
                className="w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer hover:opacity-80"
              >
                <Minus size={12} style={{ color: "var(--accent)" }} />
              </button>
              <span
                className="text-sm font-bold w-12 text-center tabular-nums"
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--font-display, JetBrains Mono), monospace",
                }}
              >
                {inBasket.qty} {unitLabel(locale, p.unit)}
              </span>
              <button
                type="button"
                aria-label={t(locale, "qty_aria")}
                onClick={() => setQty(p.offerId, inBasket.qty + step)}
                className="w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer hover:opacity-80"
              >
                <Plus size={12} style={{ color: "var(--accent)" }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
