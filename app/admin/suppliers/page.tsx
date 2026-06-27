import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { createStore, clearCatalog } from "../actions";
import { AdminImageField } from "@/components/admin/admin-image-field";
import { ClearCatalogButton } from "@/components/admin/clear-catalog-button";

export const dynamic = "force-dynamic";

function etaLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}-${max} daq`;
  if (min != null) return `~${min} daq`;
  if (max != null) return `~${max} daq`;
  return null;
}

export default async function AdminStoresPage() {
  await requireAdmin();

  const stores = await prisma.organization.findMany({
    where: { type: "SUPPLIER" },
    orderBy: { name: "asc" },
    include: { _count: { select: { offers: true, users: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Do'konlar</h1>
        <ClearCatalogButton action={clearCatalog} />
      </div>

      <ul className="space-y-2">
        {stores.map((s) => {
          const eta = etaLabel(s.etaMin, s.etaMax);
          return (
            <li key={s.id} className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg-primary text-text-secondary">
                  {s.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logoUrl} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-store text-sm" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-[color:var(--accent)] hover:underline">
                    {s.name}
                  </Link>
                  <p className="text-xs text-text-secondary">
                    {[s.district, s.phone].filter(Boolean).join(" · ")} · {s._count.offers} ta mahsulot
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {s.discountPct != null && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-[color:var(--accent)]">
                        -{s.discountPct}%
                      </span>
                    )}
                    {eta && (
                      <span className="rounded-full bg-bg-primary px-2 py-0.5 text-xs font-medium text-text-secondary">
                        {eta}
                      </span>
                    )}
                    {s._count.users === 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Telegram ulanmagan
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-2 break-all rounded-lg bg-bg-primary p-2 text-xs text-text-secondary">
                Ulanish havolasi: <code>https://t.me/&lt;bot&gt;?start=sup_{s.botCode}</code>
              </p>
            </li>
          );
        })}
        {stores.length === 0 && <li className="text-sm text-text-secondary">Hozircha do'kon yo'q.</li>}
      </ul>

      <form action={createStore} className="space-y-3 rounded-2xl border border-border-primary bg-bg-secondary p-4">
        <h2 className="font-semibold">Yangi do'kon</h2>
        <AdminImageField name="logoUrl" label="Do'kon surati" />
        <input name="name" required placeholder="Nomi" className="w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          <input name="district" placeholder="Tuman" className="min-w-40 flex-1 rounded-lg border border-border-primary px-3 py-2 text-sm" />
          <input name="phone" required placeholder="Telefon" className="min-w-40 flex-1 rounded-lg border border-border-primary px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex-1 text-xs text-text-secondary">
            Chegirma %
            <input name="discountPct" type="number" min={0} max={90} placeholder="0" className="mt-1 w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 text-xs text-text-secondary">
            Yetkazish (min, daq)
            <input name="etaMin" type="number" min={0} placeholder="30" className="mt-1 w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 text-xs text-text-secondary">
            Yetkazish (maks, daq)
            <input name="etaMax" type="number" min={0} placeholder="45" className="mt-1 w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
          </label>
        </div>
        <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Qo'shish
        </button>
      </form>
    </div>
  );
}
