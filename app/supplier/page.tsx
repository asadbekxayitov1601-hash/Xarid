import { prisma } from "@/lib/db";
import { requireSupplier } from "@/lib/supplier";
import { UNIT_LABELS } from "@/lib/format";
import { addMyOffer, updateMyOffer } from "./actions";

export const dynamic = "force-dynamic";

// Supplier self-service: opened from the bot as a Mini App (auto-login via
// Telegram). Suppliers manage their own price list — narxlar siznikidir.
export default async function SupplierPortalPage() {
  const { org } = await requireSupplier();

  const offers = await prisma.supplierOffer.findMany({
    where: { supplierId: org.id },
    include: { product: true },
    orderBy: { product: { sortKey: "asc" } },
  });

  const offeredIds = new Set(offers.map((o) => o.productId));
  const otherProducts = await prisma.product.findMany({
    where: { id: { notIn: [...offeredIds] } },
    orderBy: { sortKey: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{org.name}</h1>
        <p className="text-sm text-stone-500">Narxlar ro'yxatingiz — o'zgartirishlar darhol kuchga kiradi</p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-500">
          Mahsulotlarim (narx — so'mda, sizga to'lanadigan)
        </h2>
        <ul className="divide-y divide-stone-100">
          {offers.map((o) => (
            <li key={o.id} className="px-4 py-2.5">
              <form action={updateMyOffer} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="offerId" value={o.id} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {o.product.nameUz}
                  <span className="text-xs font-normal text-stone-400"> / {UNIT_LABELS[o.product.unit] ?? o.product.unit}</span>
                </span>
                <input
                  name="costPrice"
                  type="number"
                  inputMode="numeric"
                  defaultValue={o.costPrice}
                  className="w-28 rounded-lg border border-stone-300 px-2 py-1.5 text-right"
                />
                <label className="flex items-center gap-1 text-xs text-stone-600">
                  <input name="available" type="checkbox" defaultChecked={o.available} /> bor
                </label>
                <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Saqlash
                </button>
              </form>
            </li>
          ))}
          {offers.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">Hozircha mahsulotlar yo'q — quyidan qo'shing.</li>}
        </ul>
      </section>

      {otherProducts.length > 0 && (
        <form action={addMyOffer} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Mahsulot qo'shish</h2>
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
              inputMode="numeric"
              required
              placeholder="Narx, so'm"
              className="w-32 rounded-lg border border-stone-300 px-3 py-2"
            />
            <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
              Qo'shish
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
