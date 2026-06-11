import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { uzs } from "@/lib/format";
import { payoutStatement, weekStart } from "@/lib/payouts";

export const dynamic = "force-dynamic";

// Weekly payout statements per supplier + payment overview.
// ?w=0 is the current week, ?w=1 last week, etc.
export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  await requireAdmin();
  const { w } = await searchParams;
  const weeksBack = Math.max(0, Number(w) || 0);

  const start = weekStart(new Date());
  start.setDate(start.getDate() - weeksBack * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const [rows, paid, pending] = await Promise.all([
    payoutStatement(start, end),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
  ]);

  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totalMargin = rows.reduce((s, r) => s + r.margin, 0);
  const fmt = (d: Date) => d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Moliya</h1>
        <div className="ml-auto flex gap-2 text-sm">
          <a href={`?w=${weeksBack + 1}`} className="rounded-full border border-stone-300 px-3 py-1 hover:bg-stone-100">
            ← oldingi hafta
          </a>
          {weeksBack > 0 && (
            <a href={`?w=${weeksBack - 1}`} className="rounded-full border border-stone-300 px-3 py-1 hover:bg-stone-100">
              keyingi hafta →
            </a>
          )}
        </div>
      </div>
      <p className="text-sm text-stone-500">
        Hafta: {fmt(start)} — {fmt(end)} · yetkazilgan buyurtmalar bo'yicha, tarozidan o'tgan miqdorlarda
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Yetkazib beruvchilarga</p>
          <p className="mt-1 text-lg font-bold">{uzs(totalGross)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Xarid marjasi</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{uzs(totalMargin)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Onlayn to'lovlar (hafta)</p>
          <p className="mt-1 text-lg font-bold">{uzs(paid._sum.amount ?? 0)}</p>
          <p className="text-xs text-stone-400">{paid._count} ta tranzaksiya</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Kutilayotgan to'lovlar</p>
          <p className="mt-1 text-lg font-bold">{pending}</p>
        </div>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
              <th className="px-4 py-2.5">Yetkazib beruvchi</th>
              <th className="px-2 py-2.5 text-right">Buyurtmalar</th>
              <th className="px-2 py-2.5 text-right">Qatorlar</th>
              <th className="px-2 py-2.5 text-right">To'lanadi</th>
              <th className="px-4 py-2.5 text-right">Marja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => (
              <tr key={r.supplierId}>
                <td className="px-4 py-2.5 font-medium">{r.supplierName}</td>
                <td className="px-2 py-2.5 text-right">{r.orders}</td>
                <td className="px-2 py-2.5 text-right">{r.lines}</td>
                <td className="px-2 py-2.5 text-right font-semibold">{uzs(r.gross)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-700">{uzs(r.margin)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                  Bu haftada yetkazilgan buyurtmalar yo'q.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-stone-400 print:hidden">Chop etish uchun: Ctrl+P / Cmd+P</p>
    </div>
  );
}
