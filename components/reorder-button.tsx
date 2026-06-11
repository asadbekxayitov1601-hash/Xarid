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
      className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
    >
      {busy ? "…" : `🔁 ${t(locale, "reorder")}`}
    </button>
  );
}
