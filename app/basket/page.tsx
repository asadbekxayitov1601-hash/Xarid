"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket, type BasketItem } from "@/components/basket-provider";
import { uzs, UNIT_LABELS } from "@/lib/format";

export default function BasketPage() {
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
      setError(data?.error ?? "Xatolik yuz berdi, qayta urinib ko'ring.");
      setState("idle");
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-stone-500">
        <p className="text-4xl">🧺</p>
        <p className="mt-2">Savat bo'sh. Katalogdan mahsulot qo'shing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Savat</h1>

      {bySupplier.map(([supplier, list]) => (
        <section key={supplier} className="rounded-2xl border border-stone-200 bg-white">
          <h2 className="border-b border-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-500">
            {supplier}
          </h2>
          <ul className="divide-y divide-stone-100">
            {list.map((i) => (
              <li key={i.offerId} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.productName}</p>
                  <p className="text-xs text-stone-500">
                    {uzs(i.price)} / {UNIT_LABELS[i.unit] ?? i.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(i.offerId, i.qty - 1)} className="h-7 w-7 rounded-full border border-stone-300 text-sm font-bold">−</button>
                  <span className="min-w-10 text-center text-sm font-semibold">{i.qty}</span>
                  <button onClick={() => setQty(i.offerId, i.qty + 1)} className="h-7 w-7 rounded-full border border-stone-300 text-sm font-bold">+</button>
                </div>
                <p className="w-24 text-right text-sm font-semibold">{uzs(Math.round(i.price * i.qty))}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex items-center justify-between rounded-2xl bg-stone-900 px-5 py-4 text-white">
        <span className="font-medium">Jami</span>
        <span className="text-lg font-bold">{uzs(total)}</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Yetkazib berish — ertaga 06:00–10:00</h2>
        <input name="buyerName" required placeholder="Muassasa nomi" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input name="buyerPhone" required placeholder="+998 90 123 45 67" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input name="address" required placeholder="Manzil (tuman, ko'cha, mo'ljal)" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <p className="text-xs text-stone-500">To'lov: yetkazib berishda naqd yoki o'tkazma orqali.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={state === "sending"}
          className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {state === "sending" ? "Yuborilmoqda..." : `Buyurtma berish · ${uzs(total)}`}
        </button>
      </form>
    </div>
  );
}
