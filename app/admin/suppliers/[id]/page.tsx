import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { UNIT_LABELS } from "@/lib/format";
import { addOffer, updateOffer } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const supplier = await prisma.organization.findUnique({
    where: { id },
    include: {
      offers: { include: { product: true }, orderBy: { product: { sortKey: "asc" } } },
    },
  });
  if (!supplier || supplier.type !== "SUPPLIER") notFound();

  const offeredIds = new Set(supplier.offers.map((o) => o.productId));
  const otherProducts = await prisma.product.findMany({
    where: { id: { notIn: [...offeredIds] } },
    orderBy: { sortKey: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{supplier.name}</h1>
        <p className="text-sm text-stone-500">
          {supplier.district} · {supplier.phone}
        </p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-500">
          Narxlar ro'yxati (tan narx → sotuv narxi, so'm)
        </h2>
        <ul className="divide-y divide-stone-100">
          {supplier.offers.map((o) => (
            <li key={o.id} className="px-4 py-2">
              <form action={updateOffer} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="offerId" value={o.id} />
                <span className="min-w-0 flex-1 truncate">
                  {o.product.nameUz}
                  <span className="text-xs text-stone-400"> / {UNIT_LABELS[o.product.unit] ?? o.product.unit}</span>
                </span>
                <input name="costPrice" type="number" defaultValue={o.costPrice} className="w-24 rounded border border-stone-300 px-2 py-1" />
                <span className="text-stone-400">→</span>
                <input name="price" type="number" defaultValue={o.price} className="w-24 rounded border border-stone-300 px-2 py-1" />
                <label className="flex items-center gap-1 text-xs text-stone-600">
                  <input name="available" type="checkbox" defaultChecked={o.available} /> mavjud
                </label>
                <button className="rounded bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white">Saqlash</button>
              </form>
            </li>
          ))}
          {supplier.offers.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">Hozircha narxlar yo'q.</li>}
        </ul>
      </section>

      {otherProducts.length > 0 && (
        <form action={addOffer} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Mahsulot qo'shish</h2>
          <input type="hidden" name="supplierId" value={supplier.id} />
          <div className="flex flex-wrap gap-2 text-sm">
            <select name="productId" className="min-w-48 flex-1 rounded-lg border border-stone-300 px-3 py-2">
              {otherProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameUz} / {UNIT_LABELS[p.unit] ?? p.unit}
                </option>
              ))}
            </select>
            <input
              name="costPrice"
              type="number"
              required
              placeholder="Tan narx, so'm"
              className="w-36 rounded-lg border border-stone-300 px-3 py-2"
            />
            <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
              Qo'shish
            </button>
          </div>
          <p className="text-xs text-stone-500">Sotuv narxi avtomatik: tan narx + 7% (keyin tahrirlash mumkin).</p>
        </form>
      )}
    </div>
  );
}
