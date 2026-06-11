"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBasket } from "./basket-provider";
import { QtyInput } from "./qty-input";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";

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
  const { total, count } = useBasket();

  const visible = active ? items.filter((i) => i.category === active) : items;

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 flex gap-2 overflow-x-auto bg-stone-50 px-4 py-2">
        <button
          onClick={() => setActive(null)}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${!active ? "bg-stone-900 text-white" : "bg-white border border-stone-200"}`}
        >
          {t(locale, "all")}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${active === c ? "bg-stone-900 text-white" : "bg-white border border-stone-200"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((p) => (
          <li key={p.productId} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <p className="truncate text-xs text-stone-500">
                {p.altName} · {p.supplierName}
                {p.offerCount > 1 && ` · ${t(locale, "cheapest_of", { n: p.offerCount })}`}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-700">
                {uzs(locale, p.price)} / {unitLabel(locale, p.unit)}
              </p>
            </div>
            <ItemQty p={p} locale={locale} />
          </li>
        ))}
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
