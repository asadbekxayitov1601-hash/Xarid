import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { createSupplier } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminSuppliersPage() {
  await requireAdmin();

  const suppliers = await prisma.organization.findMany({
    where: { type: "SUPPLIER" },
    orderBy: { name: "asc" },
    include: { _count: { select: { offers: true, users: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Yetkazib beruvchilar</h1>

      <ul className="space-y-2">
        {suppliers.map((s) => (
          <li key={s.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-emerald-700 hover:underline">
                  {s.name}
                </Link>
                <p className="text-xs text-stone-500">
                  {s.district} · {s.phone} · {s._count.offers} ta mahsulot ·{" "}
                  {s._count.users > 0 ? `${s._count.users} ta Telegram ulangan` : "Telegram ulanmagan"}
                </p>
              </div>
            </div>
            <p className="mt-2 break-all rounded-lg bg-stone-50 p-2 text-xs text-stone-600">
              Ulanish havolasi: <code>https://t.me/&lt;bot&gt;?start=sup_{s.botCode}</code>
            </p>
          </li>
        ))}
      </ul>

      <form action={createSupplier} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Yangi yetkazib beruvchi</h2>
        <input name="name" required placeholder="Nomi" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input name="district" placeholder="Tuman" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input name="phone" required placeholder="Telefon" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Qo'shish
        </button>
      </form>
    </div>
  );
}
