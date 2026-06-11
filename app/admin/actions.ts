"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { requireAdmin } from "@/lib/admin";
import { runCutoff } from "@/lib/po";
import { saveActuals } from "@/lib/orders";
import { sellPrice } from "@/lib/pricing";
import { sendStopToDriver } from "@/lib/driver";
import { notifyBuyerStatus } from "@/lib/notifications";
import { markPayoutPaid, postCashHandover, postDelivery } from "@/lib/ledger";

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
  if (status === "DELIVERED") await postDelivery(id).catch(console.error);
  await notifyBuyerStatus(id).catch(() => {});
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

export async function addOffer(formData: FormData) {
  await requireAdmin();
  const supplierId = String(formData.get("supplierId"));
  const productId = String(formData.get("productId"));
  const costPrice = Math.round(Number(formData.get("costPrice")));
  if (!productId || !Number.isFinite(costPrice) || costPrice <= 0) return;
  await prisma.supplierOffer.upsert({
    where: { supplierId_productId: { supplierId, productId } },
    update: { costPrice, price: sellPrice(costPrice), available: true },
    create: { supplierId, productId, costPrice, price: sellPrice(costPrice), available: true },
  });
  revalidatePath(`/admin/suppliers/${supplierId}`);
}

export async function createDriver(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return;
  await prisma.driver.create({ data: { name, phone } });
  revalidatePath("/admin/drivers");
}

export async function assignDriver(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  const driverId = String(formData.get("driverId"));
  if (!orderId || !driverId) return;
  await prisma.order.update({ where: { id: orderId }, data: { driverId } });
  await sendStopToDriver(orderId); // no-op if the driver hasn't linked Telegram yet
  revalidatePath("/admin/routes");
  revalidatePath("/admin/orders");
}

export async function paySupplierWeek(formData: FormData) {
  await requireAdmin();
  const supplierId = String(formData.get("supplierId"));
  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  const amount = Math.round(Number(formData.get("amount")));
  if (!supplierId || isNaN(+periodStart) || isNaN(+periodEnd)) return;
  await markPayoutPaid(supplierId, periodStart, periodEnd, amount);
  revalidatePath("/admin/finance");
}

export async function recordCashHandover(formData: FormData) {
  await requireAdmin();
  const driverId = String(formData.get("driverId"));
  const amount = Math.round(Number(formData.get("amount")));
  if (!driverId || !Number.isFinite(amount) || amount <= 0) return;
  await postCashHandover(driverId, amount);
  revalidatePath("/admin/drivers");
  revalidatePath("/admin/finance");
}
