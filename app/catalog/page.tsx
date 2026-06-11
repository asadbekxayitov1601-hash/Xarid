import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { CatalogClient, type CatalogProduct } from "@/components/catalog-client";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const locale = await getLocale();
  const products = await prisma.product.findMany({
    orderBy: { sortKey: "asc" },
    include: {
      offers: {
        where: { available: true },
        orderBy: { price: "asc" },
        include: { supplier: { select: { name: true } } },
      },
    },
  });

  // Transparent price = the cheapest available offer per SKU.
  const items: CatalogProduct[] = products
    .filter((p) => p.offers.length > 0)
    .map((p) => {
      const best = p.offers[0];
      return {
        productId: p.id,
        name: locale === "ru" ? p.nameRu : p.nameUz,
        altName: locale === "ru" ? p.nameUz : p.nameRu,
        category: p.category,
        unit: p.unit,
        offerId: best.id,
        price: best.price,
        minQty: best.minQty,
        supplierName: best.supplier.name,
        offerCount: p.offers.length,
      };
    });

  return <CatalogClient items={items} locale={locale} />;
}
