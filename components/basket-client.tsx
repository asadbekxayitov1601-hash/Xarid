"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket, type BasketItem } from "@/components/basket-provider";
import { QtyInput } from "@/components/qty-input";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";
import { productEmoji } from "@/lib/product-emoji";

export function BasketClient({ locale }: { locale: Locale }) {
  const { items, setQty, clear, total } = useBasket();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

  const bySupplier = useMemo(() => {
    const m = new Map<string, BasketItem[]>();
    for (const i of items) {
      m.set(i.supplierName, [...(m.get(i.supplierName) ?? []), i]);
    }
    return [...m.entries()];
  }, [items]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: form.get("buyerName"),
        buyerPhone: form.get("buyerPhone"),
        address: form.get("address"),
        items: items.map((i) => ({ offerId: i.offerId, qty: i.qty })),
      }),
    }).catch(() => null);

    if (res?.ok) {
      clear();
      router.push("/orders?placed=1");
    } else {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? t(locale, "error_generic"));
      setState("idle");
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-stone-500">
        <i className="fa-solid fa-basket-shopping text-4xl text-stone-300" />
        <p className="mt-3">{t(locale, "basket_empty")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <i className="fa-solid fa-basket-shopping mr-2 text-emerald-600" />
        {t(locale, "basket_title")}
      </h1>

      <div className="mt-5 items-start gap-6 lg:grid lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {bySupplier.map(([supplier, list]) => (
            <section key={supplier} className="card-3d rounded-2xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-500">
                <i className="fa-solid fa-warehouse mr-1.5 text-xs" />
                {supplier}
              </h2>
              <ul className="divide-y divide-stone-100">
                {list.map((i) => (
                  <li key={i.offerId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    {i.image ? (
                      <img src={i.image} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-50 to-stone-100 text-xl">
                        {productEmoji(i.productName, "")}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.productName}</p>
                      <p className="text-xs text-stone-500">
                        {uzs(locale, i.price)} / {unitLabel(locale, i.unit)}
                      </p>
                    </div>
                    <QtyInput
                      qty={i.qty}
                      minQty={i.minQty}
                      integer={i.unit !== "KG"}
                      unitLabel={unitLabel(locale, i.unit)}
                      onChange={(qty) => setQty(i.offerId, qty)}
                    />
                    <p className="w-24 text-right text-sm font-semibold">{uzs(locale, Math.round(i.price * i.qty))}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-5 space-y-4 lg:sticky lg:top-20 lg:mt-0">
          <div className="flex items-center justify-between rounded-2xl bg-stone-900 px-5 py-4 text-white shadow-lg">
            <span className="font-medium">{t(locale, "total")}</span>
            <span className="text-lg font-extrabold">{uzs(locale, total)}</span>
          </div>

          <form onSubmit={onSubmit} className="card-3d space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold">
              <i className="fa-solid fa-truck-fast mr-1.5 text-emerald-600" />
              {t(locale, "delivery_title")}
            </h2>
            <input name="buyerName" required placeholder={t(locale, "ph_org")} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            <input name="buyerPhone" required placeholder={t(locale, "ph_phone")} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            <input name="address" required placeholder={t(locale, "ph_address")} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            <p className="text-xs text-stone-500">
              <i className="fa-solid fa-money-bill-wave mr-1" />
              {t(locale, "pay_note")}
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={state === "sending"}
              className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {state === "sending" ? (
                <i className="fa-solid fa-spinner fa-spin" />
              ) : (
                `${t(locale, "place_order")} · ${uzs(locale, total)}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
