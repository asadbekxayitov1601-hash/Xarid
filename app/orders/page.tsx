import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { uzs, UNIT_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PLACED: { label: "Qabul qilindi", cls: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Tasdiqlandi", cls: "bg-blue-100 text-blue-800" },
  PARTIAL: { label: "Qisman tasdiqlandi", cls: "bg-blue-100 text-blue-800" },
  DELIVERING: { label: "Yo'lda", cls: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "Yetkazildi", cls: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Bekor qilindi", cls: "bg-stone-200 text-stone-600" },
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const { placed } = await searchParams;
  const userId = await getSessionUserId();

  const orders = userId
    ? await prisma.order.findMany({
        where: { buyerUserId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { offer: { include: { product: true, supplier: { select: { name: true } } } } } },
        },
      })
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Buyurtmalar</h1>

      {placed && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          ✅ Buyurtma qabul qilindi! Ertaga 06:00–10:00 oralig'ida yetkazib beramiz.
        </p>
      )}

      {orders.length === 0 && !placed && (
        <div className="py-16 text-center text-stone-500">
          <p>Hozircha buyurtmalar yo'q.</p>
          <Link href="/catalog" className="mt-2 inline-block font-semibold text-emerald-700">
            Katalogga o'tish →
          </Link>
        </div>
      )}

      {orders.map((o) => {
        const st = STATUS_LABELS[o.status] ?? STATUS_LABELS.PLACED;
        return (
          <section key={o.id} className="rounded-2xl border border-stone-200 bg-white">
            <header className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">
                  {o.deliveryDate.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" })} · 06:00–10:00
                </p>
                <p className="text-xs text-stone-500">{o.address}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
            </header>
            <ul className="divide-y divide-stone-100">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {i.offer.product.nameUz}
                    <span className="text-xs text-stone-400"> · {i.offer.supplier.name}</span>
                  </span>
                  <span className="px-3 text-stone-500">
                    {i.qtyActual ?? i.qty} {UNIT_LABELS[i.offer.product.unit] ?? ""}
                  </span>
                  <span className="font-medium">{uzs(Math.round(i.price * (i.qtyActual ?? i.qty)))}</span>
                </li>
              ))}
            </ul>
            <footer className="flex justify-between border-t border-stone-100 px-4 py-3 font-semibold">
              <span>Jami</span>
              <span>{uzs(o.total)}</span>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
