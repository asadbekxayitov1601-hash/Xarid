import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

// Returns a past order's items as basket lines at CURRENT prices —
// yesterday's basket in one tap. Unavailable offers are skipped and counted.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          offer: { include: { product: true, supplier: { select: { name: true } } } },
        },
      },
    },
  });
  if (!order || order.buyerUserId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const locale = req.nextUrl.searchParams.get("locale") === "ru" ? "ru" : "uz";
  const items = [];
  let skipped = 0;
  for (const i of order.items) {
    if (!i.offer.available) {
      skipped++;
      continue;
    }
    items.push({
      offerId: i.offerId,
      productName: locale === "ru" ? i.offer.product.nameRu : i.offer.product.nameUz,
      supplierName: i.offer.supplier.name,
      unit: i.offer.product.unit,
      price: i.offer.price, // current price, not the old snapshot
      minQty: i.offer.minQty,
      image: i.offer.product.imageUrl,
      qty: i.qty,
    });
  }

  return NextResponse.json({ items, skipped });
}
