"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { runCutoff } from "@/lib/po";
import { saveActuals } from "@/lib/orders";
import { sellPrice } from "@/lib/pricing";
import { sendStopToDriver } from "@/lib/driver";
import { notifyBuyerStatus, notifyCourierNewJob } from "@/lib/notifications";
import { markPayoutPaid, postCashHandover, postDelivery } from "@/lib/ledger";
import { hashPassword, normalizePhone } from "@/lib/password";

// Admin sign-in is unified into the normal phone+password login
// (app/api/auth/credentials -> routed to /admin by role). The admin account is
// provisioned from env in lib/setup.ensureAdminUser. No separate admin login.

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

// ---- Store (Organization type SUPPLIER) management -------------------------

// A store photo is a compressed JPEG/PNG/WebP data URL (~20-40KB), so this cap
// must hold a full data URL, not a plain link.
const STORE_IMAGE_MAX = 300_000;
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

/** Accepts a compressed image data URL within the size cap, else null. */
function parseImage(raw: string): string | null {
  const v = raw.trim();
  return /^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length <= STORE_IMAGE_MAX ? v : null;
}

/** Parses an optional non-negative integer form field; "" / invalid -> null. */
function parseOptionalInt(raw: FormDataEntryValue | null, max: number): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const n = Math.round(Number(s));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, max);
}

export async function createStore(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const district = String(formData.get("district") ?? "").trim().slice(0, 80);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 32);
  if (!name || !phone) return;

  const logoUrl = parseImage(String(formData.get("logoUrl") ?? ""));
  // 0 means "no discount" — store null so no "-0%" badge ever renders.
  const discountPct = parseOptionalInt(formData.get("discountPct"), 90) || null;
  const etaMin = parseOptionalInt(formData.get("etaMin"), 600);
  const etaMaxRaw = parseOptionalInt(formData.get("etaMax"), 600);
  // Keep the window coherent: max must not be below min.
  const etaMax = etaMin != null && etaMaxRaw != null ? Math.max(etaMin, etaMaxRaw) : etaMaxRaw;

  await prisma.organization.create({
    data: { type: "SUPPLIER", name, district, phone, logoUrl, discountPct, etaMin, etaMax },
  });
  revalidatePath("/admin/suppliers");
  revalidatePath("/catalog");
}

export async function updateStore(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("storeId"));
  const store = await prisma.organization.findUnique({ where: { id } });
  if (!store || store.type !== "SUPPLIER") return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const district = String(formData.get("district") ?? "").trim().slice(0, 80);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 32);
  if (!name || !phone) return;

  const logoRaw = String(formData.get("logoUrl") ?? "");
  // Blank or invalid input keeps the current photo; a valid data URL replaces it.
  const logoUrl = parseImage(logoRaw) ?? store.logoUrl;
  // 0 means "no discount" — store null so no "-0%" badge ever renders.
  const discountPct = parseOptionalInt(formData.get("discountPct"), 90) || null;
  const etaMin = parseOptionalInt(formData.get("etaMin"), 600);
  const etaMaxRaw = parseOptionalInt(formData.get("etaMax"), 600);
  const etaMax = etaMin != null && etaMaxRaw != null ? Math.max(etaMin, etaMaxRaw) : etaMaxRaw;

  await prisma.organization.update({
    where: { id },
    data: { name, district, phone, logoUrl, discountPct, etaMin, etaMax },
  });
  revalidatePath("/admin/suppliers");
  revalidatePath(`/admin/suppliers/${id}`);
  revalidatePath("/catalog");
  revalidatePath(`/store/${id}`);
}

// Create a catalog Product and the store's SupplierOffer that carries its price,
// in one admin submit. Mirrors the seller flow (lib supplier/actions) but is
// admin-driven and scoped to a chosen store.
export async function createStoreProduct(formData: FormData) {
  await requireAdmin();
  const supplierId = String(formData.get("storeId"));
  const store = await prisma.organization.findUnique({ where: { id: supplierId } });
  if (!store || store.type !== "SUPPLIER") return;

  const nameUz = String(formData.get("nameUz") ?? "").trim().slice(0, 80);
  const nameRu = String(formData.get("nameRu") ?? "").trim().slice(0, 80) || nameUz;
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const unitRaw = String(formData.get("unit") ?? "").trim();
  const costPrice = Math.round(Number(formData.get("costPrice")));
  if (!nameUz || !Number.isFinite(costPrice) || costPrice <= 0) return;

  const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : "Quruq mahsulotlar";
  const unit = ALLOWED_UNITS.has(unitRaw) ? unitRaw : "KG";
  const imageUrl = parseImage(String(formData.get("imageUrl") ?? ""));

  const product = await prisma.product.create({
    data: { nameUz, nameRu, category, unit, imageUrl },
  });
  await prisma.supplierOffer.create({
    data: { supplierId, productId: product.id, costPrice, price: sellPrice(costPrice), available: true },
  });

  revalidatePath(`/admin/suppliers/${supplierId}`);
  revalidatePath("/catalog");
  revalidatePath(`/store/${supplierId}`);
}

// Wipe the catalog so the admin can rebuild it manually. FK-safe: offers tied
// to past orders (OrderItem has onDelete RESTRICT) are hidden, not deleted, so
// order history is preserved; everything else is removed.
export async function clearCatalog() {
  await requireAdmin();

  const referenced = await prisma.orderItem.findMany({
    select: { offerId: true },
    distinct: ["offerId"],
  });
  const refIds = referenced.map((r) => r.offerId);

  await prisma.supplierOffer.updateMany({
    where: { id: { in: refIds } },
    data: { available: false },
  });
  await prisma.supplierOffer.deleteMany({ where: { id: { notIn: refIds } } });

  // Drop products that no longer have any offer at all.
  const stillOffered = await prisma.supplierOffer.findMany({
    select: { productId: true },
    distinct: ["productId"],
  });
  const keep = stillOffered.map((o) => o.productId);
  await prisma.product.deleteMany({ where: { id: { notIn: keep } } });

  revalidatePath("/admin/suppliers");
  revalidatePath("/catalog");
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

// Provision a phone+password login for an existing Driver so a courier can sign
// in to the Flutter app (Bearer token) and the /driver portal. Creates (or
// reuses, by normalized phone) a User with role DRIVER and a scrypt passwordHash,
// then links it to the Driver via Driver.userId. Idempotent on re-submit: an
// already-linked driver has its password reset rather than duplicating accounts.
export async function provisionDriverLogin(formData: FormData) {
  await requireAdmin();
  const driverId = String(formData.get("driverId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!driverId || password.length < 6) return;

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: true },
  });
  if (!driver) return;

  const passwordHash = hashPassword(password);
  // Prefer the driver's own phone for the login; normalize so it matches the
  // same +998XXXXXXXXX key buyers/admins use. Fall back to the raw value if the
  // phone can't be normalized (the unique constraint still protects us).
  const phoneKey = normalizePhone(driver.phone) ?? (driver.phone.trim() || null);

  // Already linked: just (re)set the credentials on the existing User.
  if (driver.userId) {
    await prisma.user.update({
      where: { id: driver.userId },
      data: { role: "DRIVER", passwordHash, ...(phoneKey ? { phone: phoneKey } : {}) },
    });
    revalidatePath("/admin/drivers");
    return;
  }

  // A User may already exist for this phone (e.g. the courier ordered as a
  // buyer first). Promote and link it instead of creating a duplicate.
  const existing = phoneKey
    ? await prisma.user.findUnique({ where: { phone: phoneKey } })
    : null;

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { role: "DRIVER", passwordHash, name: existing.name ?? driver.name },
      })
    : await prisma.user.create({
        data: { phone: phoneKey, name: driver.name, role: "DRIVER", passwordHash },
      });

  await prisma.driver.update({ where: { id: driverId }, data: { userId: user.id } });

  revalidatePath("/admin/drivers");
}

export async function assignDriver(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  const driverId = String(formData.get("driverId"));
  if (!orderId || !driverId) return;
  await prisma.order.update({ where: { id: orderId }, data: { driverId } });
  await sendStopToDriver(orderId); // no-op if the driver hasn't linked Telegram yet
  await notifyCourierNewJob(orderId).catch(() => {}); // FCM push to the courier's app
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
