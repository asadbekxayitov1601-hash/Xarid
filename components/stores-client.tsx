"use client";

import { useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { Search, Clock, Store } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type StoreCard = {
  id: string;
  name: string;
  image: string | null;
  discountPct: number | null;
  etaMin: number | null;
  etaMax: number | null;
  district: string;
  productCount: number;
};

export function etaText(locale: Locale, min: number | null, max: number | null): string | null {
  const unit = t(locale, "b2c_store_min");
  if (min != null && max != null) return `${min}-${max} ${unit}`;
  if (min != null) return `~${min} ${unit}`;
  if (max != null) return `~${max} ${unit}`;
  return null;
}

export function StoresClient({
  stores,
  locale,
  dbError = false,
}: {
  stores: StoreCard[];
  locale: Locale;
  dbError?: boolean;
}) {
  const [query, setQuery] = useState("");

  const visible = stores.filter((s) => {
    if (!query) return true;
    return s.name.toLowerCase().includes(query.toLowerCase());
  });

  if (dbError || stores.length === 0) {
    const unavailable = dbError;
    return (
      <div className="min-h-screen pt-20 pb-28 relative">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div
            role={unavailable ? "alert" : undefined}
            className="glass-card rounded-3xl text-center px-6 py-16 mt-8"
          >
            <div className="text-5xl mb-5" aria-hidden="true">
              {unavailable ? "🛠️" : "🏪"}
            </div>
            <h1
              className="text-lg font-bold text-text-primary"
              style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
            >
              {t(locale, unavailable ? "catalog_unavailable_title" : "b2c_stores_empty_title")}
            </h1>
            <p className="text-sm mt-2 text-text-secondary leading-relaxed">
              {t(locale, unavailable ? "catalog_unavailable_body" : "b2c_stores_empty_body")}
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-28 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-10 depth-neg-1"
          style={{ width: 600, height: 600, top: "20%", right: "-10%", background: "var(--accent)" }}
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
            placeholder={t(locale, "b2c_stores_search")}
            aria-label={t(locale, "b2c_stores_search")}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all glass-input"
            style={{ fontFamily: "var(--font-body, Inter), sans-serif" }}
          />
        </div>

        {/* Store grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {visible.map((s, idx) => {
              const eta = etaText(locale, s.etaMin, s.etaMax);
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
                >
                  <Link
                    href={`/store/${s.id}`}
                    className="group block overflow-hidden rounded-3xl glass-card transition-all hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-secondary">
                      {s.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.image}
                          alt={s.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-text-secondary/40">
                          <Store size={40} aria-hidden />
                        </div>
                      )}
                      {s.discountPct != null && (
                        <span
                          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold"
                          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                        >
                          -{s.discountPct}%
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3
                        className="truncate text-base font-bold text-text-primary"
                        style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
                      >
                        {s.name}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                        {eta && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={13} aria-hidden /> {eta}
                          </span>
                        )}
                        <span>{t(locale, "b2c_store_products", { n: s.productCount })}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 && (
          <div
            className="text-center py-20 text-text-secondary"
            style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
          >
            <div className="text-5xl mb-4" aria-hidden="true">🔍</div>
            <div className="text-sm font-semibold">{t(locale, "catalog_empty_search")}</div>
            <div className="text-xs mt-1 opacity-70">{t(locale, "catalog_empty_search_hint")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
