import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { discountedPrice } from "@/lib/pricing";

export const dynamic = "force-dynamic";

// A single store's header + its available products for the native apps. Mirrors
// app/store/[id]/page.tsx. Names are returned in both locales; the app picks.
// `price` is the original; `discountedPrice` is what the customer pays (store
// discount applied) — kept in lockstep with web + checkout (lib/pricing).
//   GET -> { store: {...}, products: [{ offerId, productId, nameUz, nameRu,
//            category, unit, image, price, discountPct, discountedPrice, minQty }] }
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    if (!org || org.type !== "SUPPLIER") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const products = org.offers.map((o) => ({
      offerId: o.id,
      productId: o.product.id,
      nameUz: o.product.nameUz,
      nameRu: o.product.nameRu,
      category: o.product.category,
      unit: o.product.unit,
      image: o.product.imageUrl,
      price: o.price,
      discountPct: org.discountPct,
      discountedPrice: discountedPrice(o.price, org.discountPct),
      minQty: o.minQty,
    }));

    return NextResponse.json({
      store: {
        id: org.id,
        name: org.name,
        image: org.logoUrl,
        discountPct: org.discountPct,
        etaMin: org.etaMin,
        etaMax: org.etaMax,
      },
      products,
    });
  } catch (e) {
    console.error("[api/stores/[id]] query failed:", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
