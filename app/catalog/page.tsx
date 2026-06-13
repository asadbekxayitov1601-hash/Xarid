import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { CatalogClient, type CatalogProduct } from "@/components/catalog-client";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const locale = await getLocale();

  // The DB may be unreachable in production (DATABASE_URL unset/misconfigured,
  // schema not pushed). NEVER let that throw a raw 500 here — catch it and let
  // the client render a calm, translated "temporarily unavailable" state.
  // Diagnose the real cause with /api/health.
  let items: CatalogProduct[] = [];
  let dbError = false;

  try {
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
    items = products
      .filter((p) => p.offers.length > 0)
      .map((p) => {
        const best = p.offers[0];
        return {
          productId: p.id,
          name: locale === "ru" ? p.nameRu : p.nameUz,
          altName: locale === "ru" ? p.nameUz : p.nameRu,
          category: p.category,
          unit: p.unit,
          image: p.imageUrl,
          offerId: best.id,
          price: best.price,
          minQty: best.minQty,
          supplierName: best.supplier.name,
          offerCount: p.offers.length,
        };
      });
  } catch (e) {
    // Log server-side for diagnosis; the client only sees a friendly state.
    console.error("[catalog] product query failed — see /api/health:", e);
    dbError = true;
  }

  return <CatalogClient items={items} locale={locale} dbError={dbError} />;
}
