import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { uzs } from "@/lib/format";
import { balances } from "@/lib/ledger";
import {
  createDriver,
  recordCashHandover,
  provisionDriverLogin,
  approveDriverApplication,
  rejectDriverApplication,
} from "../actions";

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
  const pending = drivers.filter((d) => d.status === "PENDING");
  const roster = drivers.filter((d) => d.status !== "PENDING");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Haydovchilar</h1>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-amber-700">
            Yangi arizalar ({pending.length})
          </h2>
          <ul className="space-y-2">
            {pending.map((d) => (
              <li key={d.id} className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-text-secondary">{d.phone}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <dt className="text-text-secondary">Tajriba</dt>
                  <dd>{d.experienceYears ?? "—"} yil</dd>
                  <dt className="text-text-secondary">Transport</dt>
                  <dd>{d.carType ?? "—"}</dd>
                  <dt className="text-text-secondary">Davlat raqami</dt>
                  <dd>{d.carNumber ?? "—"}</dd>
                </dl>
                <div className="mt-3 flex gap-2">
                  <form action={approveDriverApplication}>
                    <input type="hidden" name="driverId" value={d.id} />
                    <button className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">
                      Tasdiqlash
                    </button>
                  </form>
                  <form action={rejectDriverApplication}>
                    <input type="hidden" name="driverId" value={d.id} />
                    <button className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600">
                      Rad etish
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="space-y-2">
        {roster.map((d) => {
          const delivered = d.orders.filter((o) => o.status === "DELIVERED");
          const cashDue = delivered.reduce((s, o) => s + o.total, 0);
          const cashTaken = delivered.reduce((s, o) => s + (o.cashTaken ?? 0), 0);
          return (
            <li key={d.id} className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-text-secondary">
                    {d.phone} · {d.user?.telegramId ? "Telegram ulangan ✅" : "Telegram ulanmagan"}
                  </p>
                </div>
                <div className="text-right text-xs text-text-secondary">
                  <p>Bugun: {d.orders.length} ta buyurtma, {delivered.length} ta yetkazildi</p>
                  <p className={cashTaken === cashDue ? "text-[color:var(--accent)]" : "font-semibold text-red-600"}>
                    Naqd: {uzs(cashTaken)} / {uzs(cashDue)}
                  </p>
                </div>
              </div>
              {!d.user?.telegramId && (
                <p className="mt-2 break-all rounded-lg bg-bg-primary p-2 text-xs text-text-secondary">
                  Ulanish havolasi: <code>https://t.me/&lt;bot&gt;?start=drv_{d.botCode}</code>
                </p>
              )}
              {/* Courier app login: sets a phone+password for the Flutter courier app. */}
              <form action={provisionDriverLogin} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-bg-primary p-2 text-xs">
                <span className="font-semibold text-text-secondary">Kuryer ilovasi paroli:</span>
                <input type="hidden" name="driverId" value={d.id} />
                <input
                  name="password"
                  type="text"
                  minLength={6}
                  placeholder="kamida 6 belgi"
                  className="w-40 rounded border border-border-primary px-2 py-1"
                />
                <button className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-semibold text-white">O'rnatish</button>
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
                    className="w-32 rounded border border-border-primary px-2 py-1 text-right"
                  />
                  <button className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white hover:bg-amber-600">
                    Kassaga qabul qilish
                  </button>
                </form>
              )}
            </li>
          );
        })}
        {roster.length === 0 && <li className="py-8 text-center text-sm text-text-secondary">Hozircha haydovchilar yo'q.</li>}
      </ul>

      <form action={createDriver} className="space-y-3 rounded-2xl border border-border-primary bg-bg-secondary p-4">
        <h2 className="font-semibold">Yangi haydovchi</h2>
        <input name="name" required placeholder="Ismi" className="w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
        <input name="phone" required placeholder="Telefon" className="w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
        <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Qo'shish
        </button>
      </form>
    </div>
  );
}
