"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSupplier } from "@/lib/supplier";
import { sellPrice } from "@/lib/pricing";

// Bound the profile fields so a misbehaving client cannot stuff novels into
// the description or a 50KB data URL into the logo field.
const ABOUT_MAX = 2000;
const NAME_MAX = 120;
const DISTRICT_MAX = 80;
const PHONE_MAX = 32;
const LOGO_MAX = 512;

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

  if (!name || !district || !phone) return { ok: false as const, error: "missing" };

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      name,
      district,
      phone,
      about: about ? about : null,
      logoUrl: logoUrl ? logoUrl : null,
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

