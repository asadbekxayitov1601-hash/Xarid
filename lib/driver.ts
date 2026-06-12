import { prisma } from "@/lib/db";
import { tg } from "@/lib/telegram";
import { uzs } from "@/lib/format";
import { notifyBuyerStatus } from "@/lib/notifications";
import { postCashCollected, postDelivery } from "@/lib/ledger";

export const shortId = (id: string) => id.slice(-6).toUpperCase();

// ---------------------------------------------------------------------------
// Xarid Go (Agent 5) helpers — geocoding stubs, ETA, status-state machine.
// Documented in docs/XARID_GO.md.
// ---------------------------------------------------------------------------

/** Tashkent center, used as the fallback when an address has no embedded coords. */
export const TASHKENT_CENTER: { lat: number; lng: number } = { lat: 41.2995, lng: 69.2401 };

/** Active states the Xarid Go logistics flow recognises. */
export const ACTIVE_ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "ASSIGNED",
  "PICKED_UP",
  "EN_ROUTE",
  "DELIVERING", // legacy alias
] as const;

/** Statuses where a driver is in motion (used to color map pins). */
export const IN_MOTION_STATUSES = ["PICKED_UP", "EN_ROUTE", "DELIVERING"] as const;

/** Deterministic 31-bit hash, used to scatter same-address orders predictably. */
function hash32(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Best-effort address -> (lat,lng). We never run a paid geocoder; instead:
 *   - if the address ends in `[lat,lng]`, pull them out (used by demo data
 *     and tests so the buyer pin matches the order address);
 *   - otherwise deterministically scatter inside the Tashkent bounding box
 *     based on the address string. Same address always yields the same point.
 */
export function geocodeAddress(address: string): { lat: number; lng: number } {
  const m = /\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\]\s*$/.exec(address);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  // ~12km x 12km box around the center — plenty for Tashkent demo data.
  const h = hash32(address || "tashkent");
  const dLat = ((h & 0xffff) / 0xffff - 0.5) * 0.1; // ~±5.5km
  const dLng = ((h >> 16) / 0xffff - 0.5) * 0.1;
  return { lat: TASHKENT_CENTER.lat + dLat, lng: TASHKENT_CENTER.lng + dLng };
}

/** Great-circle distance in kilometres (haversine). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Minutes between two points at a fixed 25 km/h city average. Null if unknown. */
export function computeEtaMinutes(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number }
): number | null {
  if (!from) return null;
  const km = haversineKm(from, to);
  const minutes = (km / 25) * 60;
  return Math.max(0, Math.round(minutes));
}

/** Map any order status string to a coarse phase the timeline component cares about. */
export type GoPhase = "PLACED" | "CONFIRMED" | "ASSIGNED" | "PICKED_UP" | "EN_ROUTE" | "DELIVERED" | "CANCELLED";

export function toGoPhase(status: string): GoPhase {
  switch (status) {
    case "PLACED":
      return "PLACED";
    case "CONFIRMED":
    case "PARTIAL":
      return "CONFIRMED";
    case "ASSIGNED":
      return "ASSIGNED";
    case "PICKED_UP":
      return "PICKED_UP";
    case "EN_ROUTE":
    case "DELIVERING":
      return "EN_ROUTE";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "PLACED";
  }
}

/** The next status a driver should transition to when they tap the primary CTA. */
export function nextDriverStatus(status: string): GoPhase | null {
  switch (status) {
    case "ASSIGNED":
      return "PICKED_UP";
    case "PICKED_UP":
      return "EN_ROUTE";
    case "EN_ROUTE":
    case "DELIVERING":
      return "DELIVERED";
    default:
      return null;
  }
}

/** One delivery stop as a Telegram message with a "delivered" button. */
export async function sendStopToDriver(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { driver: { include: { user: true } } },
  });
  if (!order?.driver?.user?.telegramId) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await tg("sendMessage", {
    chat_id: Number(order.driver.user.telegramId),
    text:
      `📍 Buyurtma №${shortId(order.id)}\n` +
      `${order.buyerName} — ${order.buyerPhone}\n` +
      `Manzil: ${order.address}\n` +
      `💵 Naqd olinadi: ${uzs(order.total)}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚖️ Tarozidan o'tkazish", web_app: { url: `${appUrl}/driver/orders/${order.id}` } }],
        [{ text: "✅ Yetkazildi", callback_data: `ord:done:${order.id}` }],
      ],
    },
  });
}

/** Sends the driver their full list of today's assigned, undelivered stops. */
export async function sendDriverStops(driverUserTelegramId: number) {
  const driver = await prisma.driver.findFirst({
    where: { user: { telegramId: BigInt(driverUserTelegramId) }, active: true },
  });
  if (!driver) return false;

  const orders = await prisma.order.findMany({
    where: { driverId: driver.id, status: { in: ["CONFIRMED", "PARTIAL", "DELIVERING"] } },
    orderBy: { address: "asc" },
  });

  if (orders.length === 0) {
    await tg("sendMessage", {
      chat_id: driverUserTelegramId,
      text: "Bugungi marshrutda buyurtmalar yo'q.",
    });
    return true;
  }

  for (const order of orders) {
    await sendStopToDriver(order.id);
  }
  return true;
}

/** Driver tapped "Yetkazildi": mark delivered, then ask for the cash amount. */
export async function markDelivered(orderId: string, byTelegramId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { driver: { include: { user: true } } },
  });
  if (!order) return { ok: false, message: "Buyurtma topilmadi" };
  if (order.driver?.user?.telegramId !== BigInt(byTelegramId)) return { ok: false, message: "Ruxsat yo'q" };
  if (order.status === "DELIVERED") return { ok: false, message: "Allaqachon yetkazilgan" };

  await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });
  await postDelivery(orderId).catch(console.error);
  await notifyBuyerStatus(orderId).catch(() => {});

  await tg("sendMessage", {
    chat_id: byTelegramId,
    text: `💵 №${shortId(order.id)} uchun olingan naqd summani yozing (faqat raqam, so'mda):`,
    reply_markup: { force_reply: true },
  });

  return { ok: true, message: "✅ Yetkazildi deb belgilandi" };
}

/**
 * Parses a driver's reply to the cash prompt ("💵 №XXXXXX uchun ...") and
 * records the collected amount. Returns true when the message was handled.
 */
export async function recordCashReply(msg: {
  from?: { id: number };
  text?: string;
  reply_to_message?: { text?: string };
}): Promise<boolean> {
  const promptText = msg.reply_to_message?.text;
  if (!promptText || !msg.from?.id || typeof msg.text !== "string") return false;

  const m = /№([A-Z0-9]{6}) uchun olingan naqd/.exec(promptText);
  if (!m) return false;

  const order = await prisma.order.findFirst({
    where: {
      id: { endsWith: m[1].toLowerCase() },
      driver: { user: { telegramId: BigInt(msg.from.id) } },
    },
  });
  if (!order) return false;

  const amount = Number(msg.text.replace(/[^\d]/g, ""));
  if (!Number.isFinite(amount) || msg.text.replace(/[^\d]/g, "") === "") {
    await tg("sendMessage", { chat_id: msg.from.id, text: "Iltimos, faqat raqam yozing (masalan: 216300)." });
    return true;
  }

  await prisma.order.update({ where: { id: order.id }, data: { cashTaken: amount } });
  await postCashCollected(order.id).catch(console.error);

  const diff = amount - order.total;
  const note =
    diff === 0 ? "✅ Summa to'g'ri." : diff > 0 ? `⚠️ ${uzs(diff)} ortiqcha.` : `⚠️ ${uzs(-diff)} kam.`;
  await tg("sendMessage", {
    chat_id: msg.from.id,
    text:
      `Qabul qilindi: ${uzs(amount)} (№${shortId(order.id)}). ${note}\n\n` +
      `📷 Endi yetkazish suratini yuborishingiz mumkin (ixtiyoriy).`,
  });
  return true;
}

/**
 * Records a proof-of-delivery photo sent by the driver. The Telegram file_id
 * is stored directly — free storage, no bucket needed. Target order: the №
 * in the replied-to message, otherwise the driver's latest delivered order
 * without a photo. Returns true when the message was handled.
 */
export async function recordPodPhoto(msg: {
  from?: { id: number };
  photo?: { file_id: string }[];
  reply_to_message?: { text?: string };
}): Promise<boolean> {
  if (!msg.photo?.length || !msg.from?.id) return false;
  const fileId = msg.photo[msg.photo.length - 1].file_id; // largest size

  const replyShort = msg.reply_to_message?.text ? /№([A-Z0-9]{6})/.exec(msg.reply_to_message.text)?.[1] : null;
  const byDriver = { driver: { user: { telegramId: BigInt(msg.from.id) } } };

  const order = replyShort
    ? await prisma.order.findFirst({ where: { id: { endsWith: replyShort.toLowerCase() }, ...byDriver } })
    : await prisma.order.findFirst({
        where: { ...byDriver, status: "DELIVERED", podFileId: null },
        orderBy: { createdAt: "desc" },
      });
  if (!order) return false;

  await prisma.order.update({ where: { id: order.id }, data: { podFileId: fileId } });
  await tg("sendMessage", {
    chat_id: msg.from.id,
    text: `📷 Surat №${shortId(order.id)} buyurtmasiga biriktirildi. Rahmat!`,
  });
  return true;
}
