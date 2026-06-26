import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { StoresClient, type StoreCard } from "@/components/stores-client";

export const dynamic = "force-dynamic";

// Store-first catalog: the landing list is the STORES (Do'konlar), each with its
// preview photo, optional discount badge and approximate delivery time. Tapping a
// store opens /store/[id] with that store's products. Only stores with at least
// one available product are shown so customers never enter an empty shop.
export default async function CatalogPage() {
  const locale = await getLocale();

  let stores: StoreCard[] = [];
  let dbError = false;

  try {
    const rows = await prisma.organization.findMany({
      where: { type: "SUPPLIER", offers: { some: { available: true } } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        district: true,
        logoUrl: true,
        discountPct: true,
        etaMin: true,
        etaMax: true,
        _count: { select: { offers: { where: { available: true } } } },
      },
    });

    stores = rows.map((s) => ({
      id: s.id,
      name: s.name,
      image: s.logoUrl,
      discountPct: s.discountPct,
      etaMin: s.etaMin,
      etaMax: s.etaMax,
      district: s.district,
      productCount: s._count.offers,
    }));
  } catch (e) {
    // The DB may be unreachable (DATABASE_URL unset, schema not pushed). Never
    // throw a raw 500 — render a calm, translated state. Diagnose via /api/health.
    console.error("[catalog] store query failed — see /api/health:", e);
    dbError = true;
  }

  return <StoresClient stores={stores} locale={locale} dbError={dbError} />;
}
