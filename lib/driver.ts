import { prisma } from "@/lib/db";
import { tg } from "@/lib/telegram";
import { uzs } from "@/lib/format";

export const shortId = (id: string) => id.slice(-6).toUpperCase();

/** One delivery stop as a Telegram message with a "delivered" button. */
export async function sendStopToDriver(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { driver: { include: { user: true } } },
  });
  if (!order?.driver?.user?.telegramId) return;

  await tg("sendMessage", {
    chat_id: Number(order.driver.user.telegramId),
    text:
      `📍 Buyurtma №${shortId(order.id)}\n` +
      `${order.buyerName} — ${order.buyerPhone}\n` +
      `Manzil: ${order.address}\n` +
      `💵 Naqd olinadi: ${uzs(order.total)}`,
    reply_markup: {
      inline_keyboard: [[{ text: "✅ Yetkazildi", callback_data: `ord:done:${order.id}` }]],
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

  const diff = amount - order.total;
  const note =
    diff === 0 ? "✅ Summa to'g'ri." : diff > 0 ? `⚠️ ${uzs(diff)} ortiqcha.` : `⚠️ ${uzs(-diff)} kam.`;
  await tg("sendMessage", {
    chat_id: msg.from.id,
    text: `Qabul qilindi: ${uzs(amount)} (№${shortId(order.id)}). ${note}`,
  });
  return true;
}
