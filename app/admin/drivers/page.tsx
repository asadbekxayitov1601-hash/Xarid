import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { uzs } from "@/lib/format";
import { balances } from "@/lib/ledger";
import { createDriver, recordCashHandover, provisionDriverLogin } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminDriversPage() {
  await requireAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [drivers, pocketBalances] = await Promise.all([
    prisma.driver.findMany({
      orderBy: { name: "asc" },
      include: {
        user: { select: { telegramId: true } },
        orders: { where: { createdAt: { gte: today } } },
      },
    }),
    balances("CASH:DRIVER:"),
  ]);
  const pocket = new Map(pocketBalances.map((b) => [b.account.slice(12), b.balance]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Haydovchilar</h1>

      <ul className="space-y-2">
        {drivers.map((d) => {
          const delivered = d.orders.filter((o) => o.status === "DELIVERED");
          const cashDue = delivered.reduce((s, o) => s + o.total, 0);
          const cashTaken = delivered.reduce((s, o) => s + (o.cashTaken ?? 0), 0);
          return (
            <li key={d.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-stone-500">
                    {d.phone} · {d.user?.telegramId ? "Telegram ulangan ✅" : "Telegram ulanmagan"}
                  </p>
                </div>
                <div className="text-right text-xs text-stone-600">
                  <p>Bugun: {d.orders.length} ta buyurtma, {delivered.length} ta yetkazildi</p>
                  <p className={cashTaken === cashDue ? "text-emerald-700" : "font-semibold text-red-600"}>
                    Naqd: {uzs(cashTaken)} / {uzs(cashDue)}
                  </p>
                </div>
              </div>
              {!d.user?.telegramId && (
                <p className="mt-2 break-all rounded-lg bg-stone-50 p-2 text-xs text-stone-600">
                  Ulanish havolasi: <code>https://t.me/&lt;bot&gt;?start=drv_{d.botCode}</code>
                </p>
              )}
              {/* Courier app login: sets a phone+password for the Flutter courier app. */}
              <form action={provisionDriverLogin} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 p-2 text-xs">
                <span className="font-semibold text-stone-600">Kuryer ilovasi paroli:</span>
                <input type="hidden" name="driverId" value={d.id} />
                <input
                  name="password"
                  type="text"
                  minLength={6}
                  placeholder="kamida 6 belgi"
                  className="w-40 rounded border border-stone-300 px-2 py-1"
                />
                <button className="rounded-lg bg-stone-900 px-3 py-1.5 font-semibold text-white">O'rnatish</button>
              </form>
              {(pocket.get(d.id) ?? 0) > 0 && (
                <form action={recordCashHandover} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs">
                  <span className="font-semibold text-amber-800">
                    Qo'lida: {uzs(pocket.get(d.id) ?? 0)}
                  </span>
                  <input type="hidden" name="driverId" value={d.id} />
                  <input
                    name="amount"
                    type="number"
                    defaultValue={pocket.get(d.id) ?? 0}
                    className="w-32 rounded border border-stone-300 px-2 py-1 text-right"
                  />
                  <button className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white hover:bg-amber-600">
                    Kassaga qabul qilish
                  </button>
                </form>
              )}
            </li>
          );
        })}
        {drivers.length === 0 && <li className="py-8 text-center text-sm text-stone-500">Hozircha haydovchilar yo'q.</li>}
      </ul>

      <form action={createDriver} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Yangi haydovchi</h2>
        <input name="name" required placeholder="Ismi" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input name="phone" required placeholder="Telefon" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Qo'shish
        </button>
      </form>
    </div>
  );
}
