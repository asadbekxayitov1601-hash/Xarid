"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { requireAdmin } from "@/lib/admin";
import { runCutoff } from "@/lib/po";
import { saveActuals } from "@/lib/orders";

export async function loginAdmin(formData: FormData) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || formData.get("password") !== password) {
    redirect("/admin/login?error=1");
  }
  let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    admin = await prisma.user.create({ data: { role: "ADMIN", name: "Admin" } });
  }
  await setSession(admin.id);
  redirect("/admin");
}

export async function triggerCutoff() {
  await requireAdmin();
  await runCutoff();
  revalidatePath("/admin");
}

export async function setOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("orderId"));
  const status = String(formData.get("status"));
  if (!["CONFIRMED", "DELIVERING", "DELIVERED", "CANCELLED"].includes(status)) return;
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function saveOrderActuals(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  const actuals: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("item_")) actuals[key.slice(5)] = Number(value);
  }
  await saveActuals(orderId, actuals);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function createSupplier(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return;
  await prisma.organization.create({ data: { type: "SUPPLIER", name, district, phone } });
  revalidatePath("/admin/suppliers");
}

export async function updateOffer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("offerId"));
  const costPrice = Math.round(Number(formData.get("costPrice")));
  const price = Math.round(Number(formData.get("price")));
  const available = formData.get("available") === "on";
  if (!Number.isFinite(costPrice) || !Number.isFinite(price) || costPrice <= 0 || price <= 0) return;
  await prisma.supplierOffer.update({ where: { id }, data: { costPrice, price, available } });
  revalidatePath("/admin/suppliers");
}

const TAKE_RATE = 0.07;

export async function addOffer(formData: FormData) {
  await requireAdmin();
  const supplierId = String(formData.get("supplierId"));
  const productId = String(formData.get("productId"));
  const costPrice = Math.round(Number(formData.get("costPrice")));
  if (!productId || !Number.isFinite(costPrice) || costPrice <= 0) return;
  const price = Math.round((costPrice * (1 + TAKE_RATE)) / 100) * 100;
  await prisma.supplierOffer.upsert({
    where: { supplierId_productId: { supplierId, productId } },
    update: { costPrice, price, available: true },
    create: { supplierId, productId, costPrice, price, available: true },
  });
  revalidatePath(`/admin/suppliers/${supplierId}`);
}
