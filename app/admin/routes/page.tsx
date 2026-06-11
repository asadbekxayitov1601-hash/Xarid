import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { uzs, UNIT_LABELS } from "@/lib/format";
import { assignDriver } from "../actions";

export const dynamic = "force-dynamic";

// Printable route sheet for the morning run: pickup list per supplier
// (consolidated quantities), then drop-off stops with cash due.
// Proper zones/auto-routing arrive in Phase 2.
export default async function AdminRoutesPage() {
  await requireAdmin();

  const [orders, drivers] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["CONFIRMED", "PARTIAL", "DELIVERING"] } },
      orderBy: { address: "asc" },
      include: {
        driver: { select: { id: true, name: true } },
        items: { include: { offer: { include: { product: true, supplier: { select: { name: true } } } } } },
      },
    }),
    prisma.driver.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  // Consolidated pickup quantities per supplier per product.
  const pickup = new Map<string, Map<string, { qty: number; unit: string }>>();
  for (const o of orders) {
    for (const i of o.items) {
      const sup = i.offer.supplier.name;
      const products = pickup.get(sup) ?? new Map();
      const key = i.offer.product.nameUz;
      const prev = products.get(key) ?? { qty: 0, unit: i.offer.product.unit };
      prev.qty += i.qty;
      products.set(key, prev);
      pickup.set(sup, products);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold print:text-base">Ertalabki marshrut varaqasi</h1>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">1. Olib ketish (05:30–07:00)</h2>
        {[...pickup.entries()].map(([supplier, products]) => (
          <div key={supplier} className="mt-3">
            <p className="text-sm font-semibold text-stone-700">{supplier}</p>
            <ul className="mt-1 text-sm text-stone-600">
              {[...products.entries()].map(([name, p]) => (
                <li key={name} className="flex justify-between border-b border-dotted border-stone-200 py-0.5">
                  <span>{name}</span>
                  <span>
                    {Math.round(p.qty * 100) / 100} {UNIT_LABELS[p.unit] ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {pickup.size === 0 && <p className="mt-2 text-sm text-stone-500">Tasdiqlangan buyurtmalar yo'q.</p>}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">2. Yetkazib berish (07:00–10:00)</h2>
        <ol className="mt-2 space-y-3">
          {orders.map((o, idx) => (
            <li key={o.id} className="rounded-xl border border-stone-100 p-3 text-sm">
              <p className="font-semibold">
                {idx + 1}. {o.buyerName} — {o.buyerPhone}
              </p>
              <p className="text-stone-600">{o.address}</p>
              <p className="mt-1 font-semibold text-emerald-700">Naqd olinadi: {uzs(o.total)}</p>
              <div className="mt-2 print:hidden">
                {o.driver ? (
                  <p className="text-xs text-stone-500">🚐 {o.driver.name}</p>
                ) : drivers.length > 0 ? (
                  <form action={assignDriver} className="flex items-center gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <select name="driverId" className="rounded-lg border border-stone-300 px-2 py-1 text-xs">
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white">
                      Biriktirish
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-stone-400">Haydovchi qo'shing → Haydovchilar bo'limi</p>
                )}
              </div>
            </li>
          ))}
        </ol>
        {orders.length === 0 && <p className="mt-2 text-sm text-stone-500">Bugun yetkaziladigan buyurtmalar yo'q.</p>}
      </section>

      <p className="text-xs text-stone-400 print:hidden">Chop etish: Ctrl+P / Cmd+P</p>
    </div>
  );
}
