"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket } from "./basket-provider";
import { t, type Locale } from "@/lib/i18n";

export function ReorderButton({ orderId, locale }: { orderId: string; locale: Locale }) {
  const { setQty } = useBasket();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reorder() {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/reorder?locale=${locale}`).catch(() => null);
    const data = res?.ok ? await res.json() : null;
    if (!data || data.items.length === 0) {
      alert(t(locale, "error_generic"));
      setBusy(false);
      return;
    }
    for (const item of data.items) {
      const { qty, ...rest } = item;
      setQty(item.offerId, qty, rest);
    }
    router.push("/basket");
  }

  return (
    <button
      onClick={reorder}
      disabled={busy}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
    >
      {busy ? "…" : `🔁 ${t(locale, "reorder")}`}
    </button>
  );
}
