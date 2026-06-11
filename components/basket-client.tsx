"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket, type BasketItem } from "@/components/basket-provider";
import { QtyInput } from "@/components/qty-input";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";

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
      <div className="py-16 text-center text-stone-500">
        <p className="text-4xl">🧺</p>
        <p className="mt-2">{t(locale, "basket_empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t(locale, "basket_title")}</h1>

      {bySupplier.map(([supplier, list]) => (
        <section key={supplier} className="rounded-2xl border border-stone-200 bg-white">
          <h2 className="border-b border-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-500">
            {supplier}
          </h2>
          <ul className="divide-y divide-stone-100">
            {list.map((i) => (
              <li key={i.offerId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.productName}</p>
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

      <div className="flex items-center justify-between rounded-2xl bg-stone-900 px-5 py-4 text-white">
        <span className="font-medium">{t(locale, "total")}</span>
        <span className="text-lg font-bold">{uzs(locale, total)}</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">{t(locale, "delivery_title")}</h2>
        <input name="buyerName" required placeholder={t(locale, "ph_org")} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input name="buyerPhone" required placeholder={t(locale, "ph_phone")} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input name="address" required placeholder={t(locale, "ph_address")} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <p className="text-xs text-stone-500">{t(locale, "pay_note")}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={state === "sending"}
          className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {state === "sending" ? t(locale, "sending") : `${t(locale, "place_order")} · ${uzs(locale, total)}`}
        </button>
      </form>
    </div>
  );
}
