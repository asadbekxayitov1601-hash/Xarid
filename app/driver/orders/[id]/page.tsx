import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/driver-auth";
import { uzs, UNIT_LABELS } from "@/lib/format";
import { saveDriverActuals } from "./actions";

export const dynamic = "force-dynamic";

// Opened by the driver at the door from the stop message ("⚖️ Tarozidan
// o'tkazish"): correct each line to the weighed/accepted quantity; the
// invoice total recalculates so the cash prompt matches the scales.
export default async function DriverOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const driver = await requireDriver();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { offer: { include: { product: true } } } } },
  });
  if (!order || order.driverId !== driver.id) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6">
      <div>
        <h1 className="text-xl font-bold">№{order.id.slice(-6).toUpperCase()} — tarozi</h1>
        <p className="text-sm text-stone-500">
          {order.buyerName} · {order.address}
        </p>
      </div>

      <form action={saveDriverActuals} className="rounded-2xl border border-stone-200 bg-white">
        <input type="hidden" name="orderId" value={order.id} />
        <ul className="divide-y divide-stone-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-2 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{i.offer.product.nameUz}</p>
                <p className="text-xs text-stone-500">
                  buyurtma: {i.qty} {UNIT_LABELS[i.offer.product.unit] ?? ""} · {uzs(i.price)}
                </p>
              </div>
              <input
                name={`item_${i.id}`}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={i.qtyActual ?? i.qty}
                className="w-24 rounded-lg border border-stone-300 px-2 py-2 text-right font-semibold"
              />
              <span className="w-10 text-xs text-stone-500">{UNIT_LABELS[i.offer.product.unit] ?? ""}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3">
          <span className="font-semibold">Jami: {uzs(order.total)}</span>
          <button className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">
            Saqlash
          </button>
        </div>
      </form>

      <p className="text-xs text-stone-500">
        Saqlagandan so'ng summa qayta hisoblanadi — keyin chatga qaytib «✅ Yetkazildi» tugmasini bosing.
      </p>
    </div>
  );
}
