import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/driver-auth";
import { uzs, UNIT_LABELS } from "@/lib/format";
import { LEGACY_DELIVERY_SLOT } from "@/lib/delivery";
import { saveDriverActuals } from "./actions";

export const dynamic = "force-dynamic";

export default async function DriverOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const driver = await requireDriver();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { offer: { include: { product: true } } } } },
  });
  if (!order || order.driverId !== driver.id) notFound();

  return (
    <div className="min-h-screen pt-20 pb-12 bg-bg-primary relative">
      <div className="max-w-xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Title / Info Card */}
        <div className="glass-card rounded-2xl p-5 border border-border-primary shadow-lg">
          <h1 className="text-xl font-bold text-text-primary" style={{ fontFamily: "Outfit" }}>
            Buyurtma #{order.id.slice(-6).toUpperCase()} — Tarozi
          </h1>
          <p className="text-xs text-text-secondary mt-1" style={{ fontFamily: "Inter" }}>
            {order.buyerName} · {order.address}
          </p>
          <p className="text-xs font-semibold mt-1.5" style={{ fontFamily: "Inter", color: "var(--accent)" }}>
            Yetkazib berish: {order.deliveryDate.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" })} · {order.deliverySlot ?? LEGACY_DELIVERY_SLOT}
          </p>
        </div>

        {/* Input Form */}
        <form
          action={saveDriverActuals}
          className="glass-card rounded-2xl border border-border-primary overflow-hidden shadow-md"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <ul className="divide-y divide-border-primary/40">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 px-4 py-3.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary truncate" style={{ fontFamily: "Outfit" }}>
                    {i.offer.product.nameUz}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5" style={{ fontFamily: "Inter" }}>
                    Buyurtma: {i.qty} {UNIT_LABELS[i.offer.product.unit] ?? ""} · {uzs(i.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    name={`item_${i.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    defaultValue={i.qtyActual ?? i.qty}
                    className="w-24 rounded-lg border border-border-primary bg-bg-secondary/80 text-text-primary px-2 py-1.5 text-right font-bold focus:border-emerald-500 outline-none"
                    style={{ fontFamily: "JetBrains Mono" }}
                  />
                  <span className="text-xs font-semibold text-text-secondary w-8">
                    {UNIT_LABELS[i.offer.product.unit] ?? ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-border-primary px-4 py-4 bg-bg-secondary/20">
            <span className="font-bold text-text-primary" style={{ fontFamily: "Outfit" }}>
              Jami: <span className="text-emerald-400 font-mono">{uzs(order.total)}</span>
            </span>
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 text-white px-5 py-2.5 font-bold hover:bg-emerald-400 cursor-pointer transition-all select-none"
              style={{ fontFamily: "Outfit" }}
            >
              Saqlash
            </button>
          </div>
        </form>

        <p className="text-[11px] text-text-secondary leading-relaxed text-center" style={{ fontFamily: "Inter" }}>
          Saqlagandan so'ng summa qayta hisoblanadi. Keyin Telegram chatga qaytib, «✅ Yetkazildi» tugmasini bosing.
        </p>
      </div>
    </div>
  );
}
