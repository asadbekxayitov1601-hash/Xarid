"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBasket } from "./basket-provider";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";
import { productEmoji } from "@/lib/product-emoji";
import { Search, Plus, Minus, ShoppingBasket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

const CATEGORY_MAP: Record<string, { emoji: string; label: { uz: string; ru: string } }> = {
  "Sabzavotlar": { emoji: "🥬", label: { uz: "Sabzavotlar", ru: "Овощи" } },
  "Go'sht": { emoji: "🥩", label: { uz: "Go'sht", ru: "Мясо" } },
  "Sut mahsulotlari": { emoji: "🥛", label: { uz: "Sut", ru: "Молочные" } },
  "Quruq mahsulotlar": { emoji: "🌾", label: { uz: "Bakaleya", ru: "Бакалея" } },
  "Ichimliklar": { emoji: "🧃", label: { uz: "Ichimliklar", ru: "Напитки" } },
};

function ItemQty({ p, locale }: { p: CatalogProduct; locale: Locale }) {
  const { items, setQty } = useBasket();
  const inBasket = items.find((i) => i.offerId === p.offerId);
  const start = Math.max(p.minQty, 1);
  const step = p.unit === "KG" ? 1 : 1;

  if (!inBasket) {
    return (
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
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
          background: "#10b981",
          color: "#0c0a09",
          boxShadow: "0 0 12px rgba(16,185,129,0.35)",
          fontFamily: "Outfit, sans-serif",
        }}
      >
        <Plus size={14} />
        {t(locale, "add_to_basket")}
      </motion.button>
    );
  }

  const uLabel = unitLabel(locale, p.unit);

  return (
    <div
      className="flex items-center gap-2 rounded-full px-2 py-1 select-none"
      style={{
        background: "rgba(16,185,129,0.12)",
        border: "1px solid rgba(16,185,129,0.25)",
      }}
    >
      <button
        onClick={() => setQty(p.offerId, Math.max(0, inBasket.qty - step))}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-emerald-500/20 transition-colors cursor-pointer"
      >
        <Minus size={12} style={{ color: "#10b981" }} />
      </button>
      <span
        className="text-sm font-bold w-12 text-center"
        style={{ color: "#10b981", fontFamily: "JetBrains Mono, monospace" }}
      >
        {inBasket.qty} {uLabel}
      </span>
      <button
        onClick={() => setQty(p.offerId, inBasket.qty + step)}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-emerald-500/20 transition-colors cursor-pointer"
      >
        <Plus size={12} style={{ color: "#10b981" }} />
      </button>
    </div>
  );
}

export function CatalogClient({ items, locale }: { items: CatalogProduct[]; locale: Locale }) {
  const dbCategories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { total, count } = useBasket();

  const categoriesList = useMemo(() => {
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

  return (
    <div className="min-h-screen pt-20 pb-28 relative">
      {/* Ambient blob */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-10"
          style={{ width: 600, height: 600, top: "20%", right: "-10%", background: "#10b981" }}
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
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all border border-border-primary bg-bg-secondary/60 backdrop-blur-xl text-text-primary placeholder-text-secondary/50"
            style={{
              fontFamily: "Inter, sans-serif",
            }}
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveCategory(null)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
            style={{
              background: !activeCategory ? "#10b981" : "var(--glass-bg)",
              color: !activeCategory ? "#0c0a09" : "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
              boxShadow: !activeCategory ? "0 0 16px rgba(16,185,129,0.35)" : "none",
              fontFamily: "Outfit, sans-serif",
              backdropFilter: "blur(16px)",
            }}
          >
            {t(locale, "all")}
          </button>
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
              style={{
                background: activeCategory === cat.id ? "#10b981" : "var(--glass-bg)",
                color: activeCategory === cat.id ? "#0c0a09" : "var(--text-secondary)",
                border: "1px solid var(--glass-border)",
                boxShadow: activeCategory === cat.id ? "0 0 16px rgba(16,185,129,0.35)" : "none",
                fontFamily: "Outfit, sans-serif",
                backdropFilter: "blur(16px)",
              }}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {visible.map((p) => (
              <motion.div
                key={p.productId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
                className="glass-card rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-3">
                  {p.image ? (
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
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {p.name}
                    </div>
                    <div
                      className="text-xs mt-0.5 text-text-secondary truncate"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {p.altName} · <span className="font-bold text-text-primary">{p.supplierName}</span>
                    </div>
                    {p.offerCount > 1 && (
                      <div
                        className="text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block bg-emerald-500/12 text-emerald-400"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {t(locale, "cheapest_of", { n: p.offerCount })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div>
                    <span
                      className="font-bold text-emerald-500"
                      style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1rem" }}
                    >
                      {new Intl.NumberFormat("ru-RU").format(p.price)}
                    </span>
                    <span className="text-xs ml-1 text-text-secondary">
                      {t(locale, "sum")}/{unitLabel(locale, p.unit)}
                    </span>
                  </div>

                  <ItemQty p={p} locale={locale} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 && (
          <div className="text-center py-20 text-text-secondary" style={{ fontFamily: "Outfit, sans-serif" }}>
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-sm font-semibold">{t(locale, "orders_empty")}</div>
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
              className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold transition-all hover:bg-emerald-400 select-none shadow-[0_8px_32px_rgba(16,185,129,0.5)]"
              style={{
                background: "#10b981",
                color: "#0c0a09",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBasket size={20} />
                <span>{t(locale, "basket_bar", { n: count })}</span>
              </div>
              <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{uzs(locale, total)}</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
