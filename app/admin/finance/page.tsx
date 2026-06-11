import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { uzs } from "@/lib/format";
import { payoutStatement, weekStart } from "@/lib/payouts";
import { balances } from "@/lib/ledger";
import { paySupplierWeek } from "../actions";

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

  const [rows, paid, pending, payouts, ledgerBalances, suppliers, drivers] = await Promise.all([
    payoutStatement(start, end),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payout.findMany({ where: { periodStart: start } }),
    balances(),
    prisma.organization.findMany({ where: { type: "SUPPLIER" }, select: { id: true, name: true } }),
    prisma.driver.findMany({ select: { id: true, name: true } }),
  ]);

  const paidSuppliers = new Map(payouts.map((p) => [p.supplierId, p.amount]));
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  const driverName = new Map(drivers.map((d) => [d.id, d.name]));
  const accountLabel = (account: string) => {
    if (account === "REVENUE:MARGIN") return "Xarid marjasi (jami)";
    if (account === "CASH:OFFICE") return "Kassa (ofis)";
    if (account.startsWith("BANK:")) return `Bank: ${account.slice(5)}`;
    if (account.startsWith("SUPPLIER_PAYABLE:")) return `Qarz: ${supplierName.get(account.slice(17)) ?? account}`;
    if (account.startsWith("CASH:DRIVER:")) return `Haydovchida: ${driverName.get(account.slice(12)) ?? account}`;
    if (account.startsWith("BUYER_RECEIVABLE:")) return null; // aggregated below
    return account;
  };
  const receivables = ledgerBalances
    .filter((b) => b.account.startsWith("BUYER_RECEIVABLE:"))
    .reduce((s, b) => s + b.balance, 0);

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
              <th className="px-2 py-2.5 text-right">Marja</th>
              <th className="px-4 py-2.5 text-right">To'lov</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => (
              <tr key={r.supplierId}>
                <td className="px-4 py-2.5 font-medium">{r.supplierName}</td>
                <td className="px-2 py-2.5 text-right">{r.orders}</td>
                <td className="px-2 py-2.5 text-right">{r.lines}</td>
                <td className="px-2 py-2.5 text-right font-semibold">{uzs(r.gross)}</td>
                <td className="px-2 py-2.5 text-right text-emerald-700">{uzs(r.margin)}</td>
                <td className="px-4 py-2.5 text-right">
                  {paidSuppliers.has(r.supplierId) ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      ✅ To'langan
                    </span>
                  ) : (
                    <form action={paySupplierWeek} className="inline">
                      <input type="hidden" name="supplierId" value={r.supplierId} />
                      <input type="hidden" name="periodStart" value={start.toISOString()} />
                      <input type="hidden" name="periodEnd" value={end.toISOString()} />
                      <input type="hidden" name="amount" value={r.gross} />
                      <button className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700">
                        To'landi deb belgilash
                      </button>
                    </form>
                  )}
                </td>
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

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Balanslar (butun davr, jonli)</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex justify-between border-b border-dotted border-stone-200 py-1">
            <span>Mijozlardan olinadigan (jami)</span>
            <span className={receivables > 0 ? "font-semibold text-amber-700" : "font-semibold"}>
              {uzs(receivables)}
            </span>
          </li>
          {ledgerBalances.map((b) => {
            const label = accountLabel(b.account);
            if (!label || b.balance === 0) return null;
            return (
              <li key={b.account} className="flex justify-between border-b border-dotted border-stone-200 py-1">
                <span>{label}</span>
                <span className="font-semibold">{uzs(Math.abs(b.balance))}</span>
              </li>
            );
          })}
          {ledgerBalances.length === 0 && (
            <li className="py-2 text-stone-500">Hozircha yozuvlar yo'q — birinchi yetkazilgan buyurtmadan boshlanadi.</li>
          )}
        </ul>
        <p className="mt-2 text-xs text-stone-400">
          Har bir yozuv ikki tomonlama: mijoz qarzi → yetkazib beruvchi haqi + marja; naqd → haydovchi → kassa;
          onlayn to'lov → bank. Hech bir so'm izsiz yo'qolmaydi.
        </p>
      </section>

      <p className="text-xs text-stone-400 print:hidden">Chop etish uchun: Ctrl+P / Cmd+P</p>
    </div>
  );
}
