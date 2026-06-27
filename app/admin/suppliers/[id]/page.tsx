import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { UNIT_LABELS } from "@/lib/format";
import { addOffer, updateOffer, updateStore, createStoreProduct } from "../../actions";
import { AdminImageField } from "@/components/admin/admin-image-field";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Mevalar",
  "Sabzavotlar",
  "Sut va tuxum",
  "Non",
  "Go'sht",
  "Quruq mahsulotlar",
  "Ichimliklar",
];
const UNITS = ["KG", "PIECE", "LITER", "BLOCK"];

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const store = await prisma.organization.findUnique({
    where: { id },
    include: {
      offers: { include: { product: true }, orderBy: { product: { sortKey: "asc" } } },
    },
  });
  if (!store || store.type !== "SUPPLIER") notFound();

  const offeredIds = new Set(store.offers.map((o) => o.productId));
  const otherProducts = await prisma.product.findMany({
    where: { id: { notIn: [...offeredIds] } },
    orderBy: { sortKey: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{store.name}</h1>

      {/* Store profile + catalog-card fields */}
      <form action={updateStore} className="space-y-3 rounded-2xl border border-border-primary bg-bg-secondary p-4">
        <input type="hidden" name="storeId" value={store.id} />
        <h2 className="font-semibold">Do'kon ma'lumotlari</h2>
        <div className="flex items-center gap-3">
          {store.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt={store.name} className="h-16 w-16 rounded-xl object-cover" />
          )}
          <AdminImageField name="logoUrl" label="Yangi surat (ixtiyoriy)" size={72} />
        </div>
        <input name="name" required defaultValue={store.name} placeholder="Nomi" className="w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          <input name="district" defaultValue={store.district} placeholder="Tuman" className="min-w-40 flex-1 rounded-lg border border-border-primary px-3 py-2 text-sm" />
          <input name="phone" required defaultValue={store.phone} placeholder="Telefon" className="min-w-40 flex-1 rounded-lg border border-border-primary px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex-1 text-xs text-text-secondary">
            Chegirma %
            <input name="discountPct" type="number" min={0} max={90} defaultValue={store.discountPct ?? ""} placeholder="0" className="mt-1 w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 text-xs text-text-secondary">
            Yetkazish (min, daq)
            <input name="etaMin" type="number" min={0} defaultValue={store.etaMin ?? ""} placeholder="30" className="mt-1 w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 text-xs text-text-secondary">
            Yetkazish (maks, daq)
            <input name="etaMax" type="number" min={0} defaultValue={store.etaMax ?? ""} placeholder="45" className="mt-1 w-full rounded-lg border border-border-primary px-3 py-2 text-sm" />
          </label>
        </div>
        <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">Saqlash</button>
      </form>

      {/* Create a brand-new product for this store */}
      <form action={createStoreProduct} className="space-y-3 rounded-2xl border border-border-primary bg-bg-secondary p-4">
        <input type="hidden" name="storeId" value={store.id} />
        <h2 className="font-semibold">Yangi mahsulot</h2>
        <AdminImageField name="imageUrl" label="Mahsulot surati" />
        <div className="flex flex-wrap gap-2">
          <input name="nameUz" required placeholder="Nomi (uz)" className="min-w-40 flex-1 rounded-lg border border-border-primary px-3 py-2 text-sm" />
          <input name="nameRu" placeholder="Nomi (ru)" className="min-w-40 flex-1 rounded-lg border border-border-primary px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select name="category" className="min-w-40 flex-1 rounded-lg border border-border-primary px-3 py-2 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select name="unit" className="w-32 rounded-lg border border-border-primary px-3 py-2 text-sm">
            {UNITS.map((u) => (
              <option key={u} value={u}>{UNIT_LABELS[u] ?? u}</option>
            ))}
          </select>
          <input name="costPrice" type="number" required min={1} placeholder="Tan narx, so'm" className="w-36 rounded-lg border border-border-primary px-3 py-2 text-sm" />
        </div>
        <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Qo'shish
        </button>
        <p className="text-xs text-text-secondary">Sotuv narxi avtomatik: tan narx + 7% (keyin narxlar ro'yxatida tahrirlash mumkin).</p>
      </form>

      <section className="rounded-2xl border border-border-primary bg-bg-secondary">
        <h2 className="border-b border-border-primary px-4 py-2.5 text-sm font-semibold text-text-secondary">
          Narxlar ro'yxati (tan narx -&gt; sotuv narxi, so'm)
        </h2>
        <ul className="divide-y divide-border-primary">
          {store.offers.map((o) => (
            <li key={o.id} className="px-4 py-2">
              <form action={updateOffer} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="offerId" value={o.id} />
                <span className="min-w-0 flex-1 truncate">
                  {o.product.nameUz}
                  <span className="text-xs text-text-secondary"> / {UNIT_LABELS[o.product.unit] ?? o.product.unit}</span>
                </span>
                <input name="costPrice" type="number" defaultValue={o.costPrice} className="w-24 rounded border border-border-primary px-2 py-1" />
                <span className="text-text-secondary">-&gt;</span>
                <input name="price" type="number" defaultValue={o.price} className="w-24 rounded border border-border-primary px-2 py-1" />
                <label className="flex items-center gap-1 text-xs text-text-secondary">
                  <input name="available" type="checkbox" defaultChecked={o.available} /> mavjud
                </label>
                <button className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white">Saqlash</button>
              </form>
            </li>
          ))}
          {store.offers.length === 0 && <li className="px-4 py-3 text-sm text-text-secondary">Hozircha mahsulot yo'q.</li>}
        </ul>
      </section>

      {otherProducts.length > 0 && (
        <form action={addOffer} className="space-y-3 rounded-2xl border border-border-primary bg-bg-secondary p-4">
          <h2 className="font-semibold">Mavjud mahsulotni qo'shish</h2>
          <input type="hidden" name="supplierId" value={store.id} />
          <div className="flex flex-wrap gap-2 text-sm">
            <select name="productId" className="min-w-48 flex-1 rounded-lg border border-border-primary px-3 py-2">
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
              className="w-36 rounded-lg border border-border-primary px-3 py-2"
            />
            <button className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white hover:opacity-90">
              Qo'shish
            </button>
          </div>
          <p className="text-xs text-text-secondary">Sotuv narxi avtomatik: tan narx + 7% (keyin tahrirlash mumkin).</p>
        </form>
      )}
    </div>
  );
}
