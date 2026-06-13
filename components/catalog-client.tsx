"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBasket } from "./basket-provider";
import { t, uzs, type Locale } from "@/lib/i18n";
import { Search, ShoppingBasket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImmersiveProductCard } from "./customer/product-card-immersive";
import { CategoryStrip, type StripCategory } from "./customer/category-strip";

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
};

// Category labels still hard-coded by SKU category — these match seeded data.
// The UI labels for the three locales are kept here so the seed strings stay
// in one place; rendering is handled by CategoryStrip which only sees `label`.
const CATEGORY_MAP: Record<
  string,
  { emoji: string; label: { uz: string; ru: string; en: string } }
> = {
  Sabzavotlar: { emoji: "🥬", label: { uz: "Sabzavotlar", ru: "Овощи", en: "Vegetables" } },
  "Go'sht": { emoji: "🥩", label: { uz: "Go'sht", ru: "Мясо", en: "Meat" } },
  "Sut mahsulotlari": {
    emoji: "🥛",
    label: { uz: "Sut", ru: "Молочные", en: "Dairy" },
  },
  "Quruq mahsulotlar": {
    emoji: "🌾",
    label: { uz: "Bakaleya", ru: "Бакалея", en: "Dry goods" },
  },
  Ichimliklar: {
    emoji: "🧃",
    label: { uz: "Ichimliklar", ru: "Напитки", en: "Beverages" },
  },
};

export function CatalogClient({
  items,
  locale,
  dbError = false,
}: {
  items: CatalogProduct[];
  locale: Locale;
  dbError?: boolean;
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
        label: mapped?.label[locale] ?? c,
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
              {t(locale, unavailable ? "catalog_unavailable_title" : "catalog_no_products_title")}
            </h1>
            <p className="text-sm mt-2 text-text-secondary leading-relaxed">
              {t(locale, unavailable ? "catalog_unavailable_body" : "catalog_no_products_body")}
            </p>
            {unavailable && (
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-2xl text-sm font-bold transition-all glow-button"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg-primary)",
                  fontFamily: "var(--font-display, Outfit), sans-serif",
                }}
              >
                {t(locale, "catalog_retry")}
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
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                color: "var(--bg-primary)",
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
