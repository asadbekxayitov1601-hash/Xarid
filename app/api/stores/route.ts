import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Store-first catalog for the native apps: the list of stores (Do'konlar) that
// have at least one available product, with their preview photo, optional
// discount and approximate delivery window. Mirrors app/catalog/page.tsx.
//   GET -> { stores: [{ id, name, district, image, discountPct, etaMin, etaMax, productCount }] }
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
        _count: { select: { offers: { where: { available: true } } } },
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
      productCount: s._count.offers,
    }));

    return NextResponse.json({ stores });
  } catch (e) {
    console.error("[api/stores] query failed:", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
