import { prisma } from "@/lib/db";
import { requireSupplier } from "@/lib/supplier";
import { UNIT_LABELS, uzs } from "@/lib/format";
import { payoutStatement, weekStart } from "@/lib/payouts";
import { productEmoji } from "@/lib/product-emoji";
import { ProductImageUpload } from "@/components/product-image-upload";
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

  const start = weekStart(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const myRow = (await payoutStatement(start, end)).find((r) => r.supplierId === org.id);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pt-6 sm:px-6">
      <div>
        <h1 className="text-xl font-bold">{org.name}</h1>
        <p className="text-sm text-stone-500">Narxlar ro'yxatingiz — o'zgartirishlar darhol kuchga kiradi</p>
      </div>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-sm font-semibold text-emerald-900">Shu hafta (yetkazilganlar bo'yicha)</h2>
        <p className="mt-1 text-2xl font-bold text-emerald-800">{uzs(myRow?.gross ?? 0)}</p>
        <p className="text-xs text-emerald-700">
          {myRow ? `${myRow.orders} ta buyurtma · ${myRow.lines} ta qator` : "Hozircha yetkazilgan buyurtmalar yo'q"}
          {" · "}to'lov har hafta amalga oshiriladi
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-500">
          Mahsulotlarim (narx — so'mda, sizga to'lanadigan)
        </h2>
        <ul className="divide-y divide-stone-100">
          {offers.map((o) => (
            <li key={o.id} className="px-4 py-2.5">
              <form action={updateMyOffer} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="offerId" value={o.id} />
                {o.product.imageUrl ? (
                  <img src={o.product.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg">
                    {productEmoji(o.product.nameUz, o.product.category)}
                  </span>
                )}
                <ProductImageUpload productId={o.productId} />
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
