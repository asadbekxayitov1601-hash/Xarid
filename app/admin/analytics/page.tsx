import { requireAdmin } from "@/lib/admin";
import { getAnalytics, type Bucket } from "@/lib/analytics";
import { uzs } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const a = await getAnalytics();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Tahlil</h1>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Mijozlar" value={String(a.customers.total)} sub={`${a.customers.active30d} faol (30 kun)`} />
        <Kpi label="Buyurtmalar" value={String(a.total.orders)} sub={`${a.total.delivered} yetkazildi`} />
        <Kpi label="Aylanma (GMV)" value={uzs(a.total.gmv)} sub="bekor qilinganlar hisobsiz" />
        <Kpi label="Daromad (margin)" value={uzs(a.total.margin)} sub="sotuv − tan narx" />
      </div>

      {/* Today / month / year */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Period title="Bugun" orders={a.today.orders} gmv={a.today.gmv} />
        <Period title="Bu oy" orders={a.month.orders} gmv={a.month.gmv} extra={`Daromad: ${uzs(a.month.margin)}`} />
        <Period title="Bu yil" orders={a.year.orders} gmv={a.year.gmv} />
      </div>

      <Bars title="Kunlik buyurtmalar (oxirgi 30 kun)" data={a.daily} kind="orders" />
      <Bars title="Oylik aylanma (oxirgi 12 oy)" data={a.monthly} kind="gmv" />
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-text-secondary">{sub}</p>}
    </div>
  );
}

function Period({ title, orders, gmv, extra }: { title: string; orders: number; gmv: number; extra?: string }) {
  return (
    <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-2 text-sm text-text-secondary">
        <span className="font-bold tabular-nums text-text-primary">{orders}</span> ta buyurtma
      </p>
      <p className="text-sm text-text-secondary">
        <span className="font-bold tabular-nums text-[color:var(--accent)]">{uzs(gmv)}</span>
      </p>
      {extra && <p className="mt-0.5 text-xs text-text-secondary">{extra}</p>}
    </div>
  );
}

function Bars({ title, data, kind }: { title: string; data: Bucket[]; kind: "orders" | "gmv" }) {
  const max = Math.max(1, ...data.map((d) => (kind === "orders" ? d.orders : d.gmv)));
  return (
    <section className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-text-secondary">Hozircha ma&apos;lumot yo&apos;q.</p>
      ) : (
        <div className="flex h-44 items-end gap-1 overflow-x-auto pb-1">
          {data.map((d, i) => {
            const v = kind === "orders" ? d.orders : d.gmv;
            const h = Math.max(2, Math.round((v / max) * 100));
            return (
              <div key={i} className="flex min-w-[26px] flex-1 flex-col items-center gap-1">
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t bg-[var(--accent)] transition-all"
                    style={{ height: `${h}%` }}
                    title={`${d.label}: ${d.orders} ta · ${uzs(d.gmv)}`}
                  />
                </div>
                <span className="whitespace-nowrap text-[9px] text-text-secondary">{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
