"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSupplier } from "@/lib/supplier";
import { sellPrice } from "@/lib/pricing";
import { hasCoords } from "@/lib/geo";

// Bound the profile fields so a misbehaving client cannot stuff novels into
// the description or a 50KB data URL into the logo field.
const ABOUT_MAX = 2000;
const NAME_MAX = 120;
const DISTRICT_MAX = 80;
const PHONE_MAX = 32;
// Logos are uploaded as a compressed JPEG data URL (~20-40KB, like product
// images), not a plain URL — so this cap must hold a full data URL.
const LOGO_MAX = 300_000;

// Suppliers edit THEIR price (costPrice = their payout); the buyer-facing
// price is derived with the take rate and never shown to them.

export async function updateMyOffer(formData: FormData) {
  const { org } = await requireSupplier();
  const id = String(formData.get("offerId"));
  const costPrice = Math.round(Number(formData.get("costPrice")));
  const available = formData.get("available") === "on";

  const offer = await prisma.supplierOffer.findUnique({ where: { id } });
  if (!offer || offer.supplierId !== org.id) return;
  if (!Number.isFinite(costPrice) || costPrice <= 0) return;

  await prisma.supplierOffer.update({
    where: { id },
    data: { costPrice, price: sellPrice(costPrice), available },
  });
  revalidatePath("/supplier");
}

export async function addMyOffer(formData: FormData) {
  const { org } = await requireSupplier();
  const productId = String(formData.get("productId"));
  const costPrice = Math.round(Number(formData.get("costPrice")));
  if (!productId || !Number.isFinite(costPrice) || costPrice <= 0) return;

  await prisma.supplierOffer.upsert({
    where: { supplierId_productId: { supplierId: org.id, productId } },
    update: { costPrice, price: sellPrice(costPrice), available: true },
    create: { supplierId: org.id, productId, costPrice, price: sellPrice(costPrice), available: true },
  });
  revalidatePath("/supplier");
}

// Bounds for a supplier-created product so a misbehaving client cannot stuff a
// novel into the name or a multi-MB string into the photo data URL.
const PRODUCT_NAME_MAX = 80;
const PRODUCT_IMAGE_MAX = 200_000;
const ALLOWED_UNITS = new Set(["KG", "PIECE", "LITER", "BLOCK"]);
const ALLOWED_CATEGORIES = new Set([
  "Mevalar",
  "Sabzavotlar",
  "Sut va tuxum",
  "Non",
  "Go'sht",
  "Quruq mahsulotlar",
  "Ichimliklar",
  "Sut mahsulotlari",
]);

// Create a brand-new catalog Product owned/offered by this supplier, plus the
// SupplierOffer that carries the typed price. The seller fills name, optional
// Russian name, category, unit, an optional compressed photo (data URL), and a
// plain typed price. Returns a stable error code; the client maps it to
// product_new_err_* i18n keys.
export async function createMyProduct(
  formData: FormData
): Promise<{ ok: true; productId: string } | { ok: false; error: "name" | "price" }> {
  const { org } = await requireSupplier();

  const nameUz = String(formData.get("nameUz") ?? "").trim().slice(0, PRODUCT_NAME_MAX);
  const nameRuRaw = String(formData.get("nameRu") ?? "").trim().slice(0, PRODUCT_NAME_MAX);
  const nameRu = nameRuRaw || nameUz;
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const unitRaw = String(formData.get("unit") ?? "").trim();
  const costPrice = Math.round(Number(formData.get("costPrice")));
  const imageUrlRaw = String(formData.get("imageUrl") ?? "").trim();

  if (!nameUz) return { ok: false as const, error: "name" as const };
  if (!Number.isFinite(costPrice) || costPrice <= 0) {
    return { ok: false as const, error: "price" as const };
  }

  const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : "Quruq mahsulotlar";
  const unit = ALLOWED_UNITS.has(unitRaw) ? unitRaw : "KG";
  const imageUrl =
    /^data:image\/(jpeg|png|webp);base64,/.test(imageUrlRaw) &&
    imageUrlRaw.length <= PRODUCT_IMAGE_MAX
      ? imageUrlRaw
      : null;

  const product = await prisma.product.create({
    data: { nameUz, nameRu, category, unit, imageUrl },
  });

  await prisma.supplierOffer.create({
    data: {
      supplierId: org.id,
      productId: product.id,
      costPrice,
      price: sellPrice(costPrice),
      available: true,
    },
  });

  revalidatePath("/supplier");
  revalidatePath("/supplier/products/new");
  return { ok: true as const, productId: product.id };
}

// Edit the public-facing supplier profile (name, district, phone, about,
// logo URL). Persisted on Organization; both `about` and `logoUrl` are
// nullable columns added by Agent 4 — see prisma/schema.prisma.
export async function updateMyProfile(formData: FormData) {
  const { org } = await requireSupplier();
  const name = String(formData.get("name") ?? "").trim().slice(0, NAME_MAX);
  const district = String(formData.get("district") ?? "").trim().slice(0, DISTRICT_MAX);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, PHONE_MAX);
  const about = String(formData.get("about") ?? "").trim().slice(0, ABOUT_MAX);
  const logoUrl = String(formData.get("logoUrl") ?? "").trim().slice(0, LOGO_MAX);

  // Shop map pin (Phase 1). Empty strings (no pin set, or pin cleared) collapse
  // to null; a malformed pair is rejected the same way. Note Number("") === 0,
  // so we check for a non-empty raw value BEFORE parsing to avoid persisting a
  // bogus (0, 0). Used as the pickup point for auto-dispatch.
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();
  const latNum = Number(latRaw);
  const lngNum = Number(lngRaw);
  const pinOk = latRaw !== "" && lngRaw !== "" && hasCoords(latNum, lngNum);
  const lat = pinOk ? latNum : null;
  const lng = pinOk ? lngNum : null;

  if (!name || !district || !phone) return { ok: false as const, error: "missing" };

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      name,
      district,
      phone,
      about: about ? about : null,
      logoUrl: logoUrl ? logoUrl : null,
      lat,
      lng,
    },
  });
  revalidatePath("/supplier/profile");
  revalidatePath("/supplier");
  return { ok: true as const };
}

export async function resolvePoWeb(poId: string, action: "confirm" | "reject") {
  const { org } = await requireSupplier();

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });
  // Stable error codes — the client maps them to sp_err_* i18n keys.
  if (!po || po.supplierId !== org.id) return { error: "forbidden" as const };
  if (po.status !== "SENT") return { error: "already_resolved" as const };

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: action === "confirm" ? "CONFIRMED" : "REJECTED" },
  });

  const siblings = await prisma.purchaseOrder.findMany({ where: { orderId: po.orderId } });
  const allConfirmed = siblings.every((p) => p.status === "CONFIRMED");
  const orderStatus = allConfirmed ? "CONFIRMED" : "PARTIAL";
  const order = await prisma.order.update({
    where: { id: po.orderId },
    data: { status: orderStatus },
    include: { buyerUser: true },
  });

  if (allConfirmed && order.buyerUser.telegramId && process.env.TELEGRAM_BOT_TOKEN) {
    const { tg } = await import("@/lib/telegram");
    const { uzs } = await import("@/lib/format");
    await tg("sendMessage", {
      chat_id: Number(order.buyerUser.telegramId),
      text: `✅ Buyurtmangiz tasdiqlandi! Ertaga 06:00–10:00 oralig'ida yetkazib beramiz.\nJami: ${uzs(order.total)}`,
    }).catch(() => {});
  }

  revalidatePath("/supplier");
  return { success: true };
}

