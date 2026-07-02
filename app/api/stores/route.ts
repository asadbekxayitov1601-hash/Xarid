import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Store-first catalog for the native apps: the list of stores (Do'konlar) that
// have at least one available product, with their preview photo, optional
// discount, approximate delivery window, and the distinct product categories
// they carry (so the app can offer a real, data-driven category filter).
//   GET -> { stores: [{ id, name, district, image, discountPct, etaMin, etaMax,
//                        productCount, categories }] }
export async function GET() {
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
        offers: {
          where: { available: true },
          select: { product: { select: { category: true } } },
        },
      },
    });

    const stores = rows.map((s) => ({
      id: s.id,
      name: s.name,
      district: s.district,
      image: s.logoUrl,
      discountPct: s.discountPct,
      etaMin: s.etaMin,
      etaMax: s.etaMax,
      productCount: s.offers.length,
      // Distinct, non-empty categories carried by this store, for the filter.
      categories: [...new Set(s.offers.map((o) => o.product.category).filter(Boolean))],
    }));

    return NextResponse.json({ stores });
  } catch (e) {
    console.error("[api/stores] query failed:", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
