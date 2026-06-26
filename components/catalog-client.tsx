"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBasket } from "./basket-provider";
import { t, uzs, type Locale, type MessageKey } from "@/lib/i18n";
import { Search, ShoppingBasket, Clock, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImmersiveProductCard } from "./customer/product-card-immersive";
import { CategoryStrip, type StripCategory } from "./customer/category-strip";
import { etaText } from "./stores-client";

// Optional store header shown when the catalog is scoped to one store
// (store-first: /store/[id]). Plain data so the server page can pass it across
// the client boundary.
export type CatalogStore = {
  id: string;
  name: string;
  image: string | null;
  discountPct: number | null;
  etaMin: number | null;
  etaMax: number | null;
};

export type CatalogProduct = {
  productId: string;
  name: string;
  altName: string;
  category: string;
  unit: string;
  image: string | null;
  offerId: string;
  price: number;
  minQty: number;
  supplierName: string;
  offerCount: number;
  // Storewide discount percent (from the product's store). When set, the card
  // shows the discounted price + struck-through original + a "-N%" badge, and
  // the basket/checkout charge the discounted price (lib/pricing.discountedPrice).
  discountPct?: number | null;
};

// Category metadata keyed by the exact `category` string stored on Product
// (the seed's canonical Latin-Uzbek strings — see docs/B2C_PIVOT.md section 5).
// Each entry carries a Lavka-style emoji + an i18n key resolved through t() so
// the three locales live in lib/i18n.ts (b2c_cat_* namespace), never inline.
// Any category not listed here falls back to the raw DB string + box emoji, so
// this map MUST stay in sync with the seeded categories.
const CATEGORY_MAP: Record<string, { emoji: string; key: MessageKey }> = {
  Mevalar: { emoji: "🍎", key: "b2c_cat_mevalar" },
  Sabzavotlar: { emoji: "🥬", key: "b2c_cat_sabzavotlar" },
  "Sut va tuxum": { emoji: "🥛", key: "b2c_cat_sut_tuxum" },
  Non: { emoji: "🥖", key: "b2c_cat_non" },
  "Go'sht": { emoji: "🥩", key: "b2c_cat_gosht" },
  "Quruq mahsulotlar": { emoji: "🌾", key: "b2c_cat_quruq" },
  Ichimliklar: { emoji: "🧃", key: "b2c_cat_ichimliklar" },
  // Legacy dairy string kept so older seeded data never hits the box fallback.
  "Sut mahsulotlari": { emoji: "🥛", key: "b2c_cat_sut" },
};

export function CatalogClient({
  items,
  locale,
  dbError = false,
  store,
}: {
  items: CatalogProduct[];
  locale: Locale;
  dbError?: boolean;
  store?: CatalogStore;
}) {
  const dbCategories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { total, count } = useBasket();

  const categoriesList: StripCategory[] = useMemo(() => {
    return dbCategories.map((c) => {
      const mapped = CATEGORY_MAP[c];
      return {
        id: c,
        emoji: mapped?.emoji ?? "📦",
        label: mapped ? t(locale, mapped.key) : c,
      };
    });
  }, [dbCategories, locale]);

  const visible = items.filter((i) => {
    if (activeCategory && i.category !== activeCategory) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.altName.toLowerCase().includes(q);
  });

  // DB unreachable (or no catalog yet): show a calm, translated panel instead of
  // the search UI, which would be meaningless with zero data. The real fix is an
  // infra step — see docs/CATALOG_FIX.md and /api/health.
  if (dbError || items.length === 0) {
    const unavailable = dbError;
    return (
      <div className="min-h-screen pt-20 pb-28 relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute rounded-full blur-3xl opacity-10 depth-neg-1"
            style={{
              width: 600,
              height: 600,
              top: "20%",
              right: "-10%",
              background: "var(--accent)",
            }}
          />
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div
            role={unavailable ? "alert" : undefined}
            className="glass-card rounded-3xl text-center px-6 py-16 mt-8"
          >
            <div className="text-5xl mb-5" aria-hidden="true">
              {unavailable ? "🛠️" : "🧺"}
            </div>
            <h1
              className="text-lg font-bold text-text-primary"
              style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
            >
              {t(
                locale,
                unavailable
                  ? "catalog_unavailable_title"
                  : store
                    ? "b2c_store_no_products_title"
                    : "catalog_no_products_title"
              )}
            </h1>
            <p className="text-sm mt-2 text-text-secondary leading-relaxed">
              {t(
                locale,
                unavailable
                  ? "catalog_unavailable_body"
                  : store
                    ? "b2c_store_no_products_body"
                    : "catalog_no_products_body"
              )}
            </p>
            {unavailable && (
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-2xl text-sm font-bold transition-all glow-button"
                style={{
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontFamily: "var(--font-display, Outfit), sans-serif",
                }}
              >
                {t(locale, "catalog_retry")}
              </Link>
            )}
            {store && !unavailable && (
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-2xl text-sm font-bold transition-all glow-button"
                style={{
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontFamily: "var(--font-display, Outfit), sans-serif",
                }}
              >
                <ArrowLeft size={16} aria-hidden /> {t(locale, "b2c_store_back")}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-28 relative">
      {/* Ambient blob — softened, lives behind content via depth-neg-1 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-10 depth-neg-1"
          style={{
            width: 600,
            height: 600,
            top: "20%",
            right: "-10%",
            background: "var(--accent)",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Store header (store-first: /store/[id]) */}
        {store && (
          <div className="mb-6">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 mb-4 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={16} aria-hidden /> {t(locale, "b2c_store_back")}
            </Link>
            <div className="flex items-center gap-4 glass-card rounded-3xl p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-bg-secondary">
                {store.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.image} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-text-secondary/40">
                    <ShoppingBasket size={28} aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1
                  className="truncate text-xl font-extrabold text-text-primary"
                  style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
                >
                  {store.name}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {store.discountPct != null && (
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                    >
                      -{store.discountPct}%
                    </span>
                  )}
                  {etaText(locale, store.etaMin, store.etaMax) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
                      <Clock size={13} aria-hidden /> {etaText(locale, store.etaMin, store.etaMax)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, "search_placeholder")}
            aria-label={t(locale, "search_placeholder")}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all glass-input"
            style={{
              fontFamily: "var(--font-body, Inter), sans-serif",
            }}
          />
        </div>

        {/* Category Pills — extracted to its own component, with subtle parallax */}
        <CategoryStrip
          categories={categoriesList}
          active={activeCategory}
          onChange={setActiveCategory}
          locale={locale}
        />

        {/* Product Cards Grid — uses the new ImmersiveProductCard */}
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <AnimatePresence>
            {visible.map((p, idx) => (
              <ImmersiveProductCard
                key={p.productId}
                p={p}
                locale={locale}
                index={idx}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 && (
          <div
            className="text-center py-20 text-text-secondary"
            style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
          >
            <div className="text-5xl mb-4" aria-hidden="true">
              🔍
            </div>
            <div className="text-sm font-semibold">{t(locale, "catalog_empty_search")}</div>
            <div className="text-xs mt-1 opacity-70">
              {t(locale, "catalog_empty_search_hint")}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Basket Bar */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
            style={{ width: "min(480px, calc(100vw - 2rem))" }}
          >
            <Link
              href="/basket"
              className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold transition-all select-none glow-button"
              style={{
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontFamily: "var(--font-display, Outfit), sans-serif",
                boxShadow: "var(--shadow-lg), 0 0 32px var(--accent-glow)",
              }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBasket size={20} />
                <span>{t(locale, "basket_bar", { n: count })}</span>
              </div>
              <span
                className="tabular-nums"
                style={{ fontFamily: "var(--font-display, JetBrains Mono), monospace" }}
              >
                {uzs(locale, total)}
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
