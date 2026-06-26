import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { CatalogClient, type CatalogProduct, type CatalogStore } from "@/components/catalog-client";

export const dynamic = "force-dynamic";

// Store-first detail: the chosen store's header + its products. Reuses the
// catalog product grid (search, categories, add-to-basket) scoped to this store.
export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();

  let items: CatalogProduct[] = [];
  let dbError = false;
  let store: CatalogStore | null = null;

  try {
    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        name: true,
        logoUrl: true,
        discountPct: true,
        etaMin: true,
        etaMax: true,
        offers: {
          where: { available: true },
          orderBy: { price: "asc" },
          include: { product: true },
        },
      },
    });

    if (!org || org.type !== "SUPPLIER") notFound();

    store = {
      id: org.id,
      name: org.name,
      image: org.logoUrl,
      discountPct: org.discountPct,
      etaMin: org.etaMin,
      etaMax: org.etaMax,
    };

    items = org.offers.map((o) => ({
      productId: o.product.id,
      name: locale === "ru" ? o.product.nameRu : o.product.nameUz,
      altName: locale === "ru" ? o.product.nameUz : o.product.nameRu,
      category: o.product.category,
      unit: o.product.unit,
      image: o.product.imageUrl,
      offerId: o.id,
      price: o.price,
      minQty: o.minQty,
      supplierName: org.name,
      offerCount: 1,
      discountPct: org.discountPct,
    }));
  } catch (e) {
    // notFound() throws a control-flow signal we must not swallow as a DB error.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_")) {
      throw e;
    }
    console.error("[store] query failed — see /api/health:", e);
    dbError = true;
  }

  return (
    <CatalogClient items={items} locale={locale} dbError={dbError} store={store ?? undefined} />
  );
}
