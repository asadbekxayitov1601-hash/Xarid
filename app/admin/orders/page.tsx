import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { uzs, UNIT_LABELS } from "@/lib/format";
import { saveOrderActuals, setOrderStatus } from "../actions";

// Statuses where the driver/admin records weighed quantities at delivery.
const ACTUALS_EDITABLE = new Set(["CONFIRMED", "PARTIAL", "DELIVERING"]);

export const dynamic = "force-dynamic";

const NEXT_ACTIONS: Record<string, { status: string; label: string }[]> = {
  PLACED: [{ status: "CANCELLED", label: "Bekor qilish" }],
  PARTIAL: [
    { status: "CONFIRMED", label: "Tasdiqlangan deb belgilash" },
    { status: "CANCELLED", label: "Bekor qilish" },
  ],
  CONFIRMED: [
    { status: "DELIVERING", label: "Yo'lga chiqdi" },
    { status: "CANCELLED", label: "Bekor qilish" },
  ],
  DELIVERING: [{ status: "DELIVERED", label: "Yetkazildi" }],
};

const PO_BADGE: Record<string, string> = {
  SENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function AdminOrdersPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      purchaseOrders: { include: { supplier: { select: { name: true } } } },
      items: { include: { offer: { include: { product: true, supplier: { select: { name: true } } } } } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Buyurtmalar</h1>

      {orders.map((o) => (
        <section key={o.id} className="rounded-2xl border border-stone-200 bg-white">
          <header className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                №{o.id.slice(-6).toUpperCase()} · {o.buyerName} · {o.buyerPhone}
              </p>
              <p className="text-xs text-stone-500">
                {o.address} · yetkazish {o.deliveryDate.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold">{o.status}</span>
            <span className="text-sm font-bold">{uzs(o.total)}</span>
            {o.cashTaken != null && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  o.cashTaken === o.total ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                }`}
              >
                naqd: {uzs(o.cashTaken)}
              </span>
            )}
          </header>

          {o.purchaseOrders.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-stone-100 px-4 py-2">
              {o.purchaseOrders.map((po) => (
                <span key={po.id} className={`rounded-full px-2.5 py-1 text-xs font-medium ${PO_BADGE[po.status] ?? ""}`}>
                  {po.supplier.name}: {po.status}
                </span>
              ))}
            </div>
          )}

          {ACTUALS_EDITABLE.has(o.status) ? (
            <form action={saveOrderActuals}>
              <input type="hidden" name="orderId" value={o.id} />
              <ul className="divide-y divide-stone-100 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 px-4 py-1.5">
                    <span className="min-w-0 flex-1 truncate">
                      {i.offer.product.nameUz}
                      <span className="text-xs text-stone-400"> · {i.offer.supplier.name}</span>
                    </span>
                    <span className="text-xs text-stone-400">
                      buyurtma: {i.qty} {UNIT_LABELS[i.offer.product.unit] ?? ""}
                    </span>
                    <input
                      name={`item_${i.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={i.qtyActual ?? i.qty}
                      className="w-20 rounded border border-stone-300 px-2 py-1 text-right"
                    />
                  </li>
                ))}
              </ul>
              <div className="border-t border-stone-100 px-4 py-2">
                <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold hover:bg-stone-50">
                  Haqiqiy og'irliklarni saqlash (summa qayta hisoblanadi)
                </button>
              </div>
            </form>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between px-4 py-1.5">
                  <span className="min-w-0 flex-1 truncate">
                    {i.offer.product.nameUz}
                    <span className="text-xs text-stone-400"> · {i.offer.supplier.name}</span>
                  </span>
                  <span className="text-stone-500">
                    {i.qtyActual ?? i.qty} {UNIT_LABELS[i.offer.product.unit] ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {NEXT_ACTIONS[o.status] && (
            <footer className="flex flex-wrap gap-2 border-t border-stone-100 px-4 py-3">
              {NEXT_ACTIONS[o.status].map((a) => (
                <form key={a.status} action={setOrderStatus}>
                  <input type="hidden" name="orderId" value={o.id} />
                  <input type="hidden" name="status" value={a.status} />
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      a.status === "CANCELLED"
                        ? "border border-red-200 text-red-600 hover:bg-red-50"
                        : "bg-stone-900 text-white hover:bg-stone-700"
                    }`}
                  >
                    {a.label}
                  </button>
                </form>
              ))}
            </footer>
          )}
        </section>
      ))}

      {orders.length === 0 && <p className="py-12 text-center text-stone-500">Buyurtmalar yo'q.</p>}
    </div>
  );
}
