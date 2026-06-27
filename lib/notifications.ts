import { prisma } from "@/lib/db";
import { tg } from "@/lib/telegram";
import { uzs } from "@/lib/format";
import { sendPushToUser } from "@/lib/push";

// Buyer-facing status updates. Goes to Telegram (if the buyer linked it) AND as
// an FCM push to the mobile app — so phone+password app users, who have no
// Telegram id, still get notified. Both channels are best-effort, never throw.
export async function notifyBuyerStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { buyerUser: true, driver: true },
  });
  if (!order) return;

  const n = order.id.slice(-6).toUpperCase();
  let text: string | null = null; // bilingual Telegram text
  let push: { title: string; body: string } | null = null; // short mobile push

  if (order.status === "DELIVERING") {
    const drv = order.driver ? ` Haydovchi: ${order.driver.name}, ${order.driver.phone}.` : "";
    const drvRu = order.driver ? ` Водитель: ${order.driver.name}, ${order.driver.phone}.` : "";
    text = `🚐 №${n} buyurtmangiz yo'lda!${drv}\n🚐 Заказ №${n} в пути!${drvRu}`;
    push = { title: "Buyurtmangiz yo'lda 🚐", body: `№${n}${order.driver ? ` · ${order.driver.name}` : ""}` };
  } else if (order.status === "DELIVERED") {
    text =
      `✅ №${n} buyurtmangiz yetkazildi. Jami: ${uzs(order.total)}. Yoqimli ishtaha!\n` +
      `✅ Заказ №${n} доставлен. Итого: ${uzs(order.total)}.`;
    push = { title: "Yetkazildi ✅", body: `№${n} · ${uzs(order.total)}` };
  } else if (order.status === "CANCELLED") {
    text =
      `❌ №${n} buyurtmangiz bekor qilindi. Savol bo'lsa: ${process.env.SUPPORT_PHONE ?? "operator bilan bog'laning"}.\n` +
      `❌ Заказ №${n} отменён.`;
    push = { title: "Buyurtma bekor qilindi", body: `№${n}` };
  }

  if (!push) return;

  if (order.buyerUser.telegramId && process.env.TELEGRAM_BOT_TOKEN && text) {
    await tg("sendMessage", { chat_id: Number(order.buyerUser.telegramId), text }).catch(() => {});
  }
  await sendPushToUser(order.buyerUserId, {
    ...push,
    data: { orderId: order.id, type: "order_status", status: order.status },
  }).catch(() => {});
}

// Pushes a "new job" notification to the courier assigned to an order (their
// linked app account). Best-effort; no-op until FCM is configured.
export async function notifyCourierNewJob(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { driver: { include: { user: { select: { id: true } } } } },
  });
  const userId = order?.driver?.user?.id;
  if (!order || !userId) return;
  const n = order.id.slice(-6).toUpperCase();
  await sendPushToUser(userId, {
    title: "Yangi buyurtma 📦",
    body: `№${n} · ${order.address}`,
    data: { orderId: order.id, type: "new_job" },
  }).catch(() => {});
}
