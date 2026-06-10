import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { uzs } from "@/lib/format";
import { triggerCutoff } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  const [orders, leads, pendingPos] = await Promise.all([
    prisma.order.findMany({
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
      include: { purchaseOrders: true },
    }),
    prisma.lead.count(),
    prisma.purchaseOrder.count({ where: { status: "SENT" } }),
  ]);

  const byStatus = new Map<string, { count: number; gmv: number }>();
  for (const o of orders) {
    const s = byStatus.get(o.status) ?? { count: 0, gmv: 0 };
    s.count++;
    s.gmv += o.total;
    byStatus.set(o.status, s);
  }
  const gmv = orders.reduce((s, o) => s + o.total, 0);
  const awaitingCutoff = orders.filter((o) => o.status === "PLACED" && o.purchaseOrders.length === 0).length;

  const cards = [
    { label: "Faol buyurtmalar", value: String(orders.length) },
    { label: "Faol GMV", value: uzs(gmv) },
    { label: "Tasdiq kutilmoqda (PO)", value: String(pendingPos) },
    { label: "Leadlar", value: String(leads) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Bugungi holat</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs text-stone-500">{c.label}</p>
            <p className="mt-1 text-lg font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Holatlar bo'yicha</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {[...byStatus.entries()].map(([status, s]) => (
            <li key={status} className="flex justify-between">
              <span>{status}</span>
              <span className="text-stone-500">
                {s.count} ta · {uzs(s.gmv)}
              </span>
            </li>
          ))}
          {byStatus.size === 0 && <li className="text-stone-500">Faol buyurtmalar yo'q.</li>}
        </ul>
      </div>

      <form action={triggerCutoff} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-semibold">Cutoff (22:00 da avtomatik)</h2>
        <p className="mt-1 text-sm text-stone-600">
          {awaitingCutoff} ta buyurtma yetkazib beruvchilarga yuborilmagan. Qo'lda yuborish:
        </p>
        <button className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
          Hozir yuborish
        </button>
      </form>
    </div>
  );
}
