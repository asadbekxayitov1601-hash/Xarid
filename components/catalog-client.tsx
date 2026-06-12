"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBasket } from "./basket-provider";
import { QtyInput } from "./qty-input";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";
import { productEmoji } from "@/lib/product-emoji";

export type CatalogProduct = {
  productId: string;
  name: string;
  altName: string;
  category: string;
  unit: string;
  offerId: string;
  price: number;
  minQty: number;
  supplierName: string;
  offerCount: number;
};

function ItemQty({ p, locale }: { p: CatalogProduct; locale: Locale }) {
  const { items, setQty } = useBasket();
  const inBasket = items.find((i) => i.offerId === p.offerId);
  const start = Math.max(p.minQty, 1);

  if (!inBasket) {
    return (
      <button
        onClick={() =>
          setQty(p.offerId, start, {
            offerId: p.offerId,
            productName: p.name,
            supplierName: p.supplierName,
            unit: p.unit,
            price: p.price,
            minQty: p.minQty,
          })
        }
        className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        {t(locale, "add_to_basket")}
      </button>
    );
  }

  return (
    <QtyInput
      qty={inBasket.qty}
      minQty={p.minQty}
      integer={p.unit !== "KG"}
      unitLabel={unitLabel(locale, p.unit)}
      onChange={(qty) => setQty(p.offerId, qty)}
    />
  );
}

export function CatalogClient({ items, locale }: { items: CatalogProduct[]; locale: Locale }) {
  const categories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { total, count } = useBasket();

  const visible = items.filter((i) => {
    if (active && i.category !== active) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.altName.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 space-y-2 bg-stone-50/95 px-4 py-2 backdrop-blur">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, "search_placeholder")}
            className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => setActive(null)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${!active ? "bg-stone-900 text-white shadow" : "border border-stone-200 bg-white hover:border-stone-300"}`}
          >
            {t(locale, "all")}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(active === c ? null : c)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active === c ? "bg-stone-900 text-white shadow" : "border border-stone-200 bg-white hover:border-stone-300"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((p) => (
          <li
            key={p.productId}
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-stone-100 text-2xl">
              {productEmoji(p.name, p.category)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="truncate text-xs text-stone-500">
                {p.altName} · {p.supplierName}
                {p.offerCount > 1 && ` · ${t(locale, "cheapest_of", { n: p.offerCount })}`}
              </p>
              <p className="mt-0.5 text-sm font-bold text-emerald-700">
                {uzs(locale, p.price)} <span className="font-normal text-stone-400">/ {unitLabel(locale, p.unit)}</span>
              </p>
            </div>
            <ItemQty p={p} locale={locale} />
          </li>
        ))}
        {visible.length === 0 && (
          <li className="py-16 text-center text-stone-500">
            <p className="text-4xl">🔍</p>
            <p className="mt-2 text-sm">{query} — 0</p>
          </li>
        )}
      </ul>

      {count > 0 && (
        <Link
          href="/basket"
          className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-3xl items-center justify-between rounded-2xl bg-emerald-600 px-5 py-3.5 font-semibold text-white shadow-lg hover:bg-emerald-700"
        >
          <span>{t(locale, "basket_bar", { n: count })}</span>
          <span>{uzs(locale, total)}</span>
        </Link>
      )}
    </div>
  );
}
