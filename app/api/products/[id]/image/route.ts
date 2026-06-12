import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

// Product photo upload: stored as a compressed data URL in Postgres —
// no storage bucket needed at this scale (~30KB per image, hundreds of
// SKUs). Allowed: admins, and supplier staff who offer this product.
const MAX_BYTES = 200_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { org: true } })
    : null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  if (user.role !== "ADMIN") {
    const offersIt =
      user.org?.type === "SUPPLIER" &&
      (await prisma.supplierOffer.findFirst({ where: { supplierId: user.org.id, productId: id } }));
    if (!offersIt) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const dataUrl = String(body?.dataUrl ?? "");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl) || dataUrl.length > MAX_BYTES) {
    return NextResponse.json({ error: "invalid image" }, { status: 400 });
  }

  await prisma.product.update({ where: { id }, data: { imageUrl: dataUrl } });
  return NextResponse.json({ ok: true });
}
