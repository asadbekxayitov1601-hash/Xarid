import { prisma } from "@/lib/db";
import { tg } from "@/lib/telegram";
import { uzs } from "@/lib/format";

// Buyer-facing status updates in Telegram. Bilingual (UZ/RU) because the
// buyer's preferred language isn't known on the server.
export async function notifyBuyerStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { buyerUser: true, driver: true },
  });
  if (!order?.buyerUser.telegramId || !process.env.TELEGRAM_BOT_TOKEN) return;

  const n = order.id.slice(-6).toUpperCase();
  let text: string | null = null;

  if (order.status === "DELIVERING") {
    const drv = order.driver ? ` Haydovchi: ${order.driver.name}, ${order.driver.phone}.` : "";
    const drvRu = order.driver ? ` Водитель: ${order.driver.name}, ${order.driver.phone}.` : "";
    text =
      `🚐 №${n} buyurtmangiz yo'lda!${drv}\n` +
      `🚐 Заказ №${n} в пути!${drvRu}`;
  } else if (order.status === "DELIVERED") {
    text =
      `✅ №${n} buyurtmangiz yetkazildi. Jami: ${uzs(order.total)}. Yoqimli ishtaha!\n` +
      `✅ Заказ №${n} доставлен. Итого: ${uzs(order.total)}.`;
  } else if (order.status === "CANCELLED") {
    text =
      `❌ №${n} buyurtmangiz bekor qilindi. Savol bo'lsa: ${process.env.SUPPORT_PHONE ?? "operator bilan bog'laning"}.\n` +
      `❌ Заказ №${n} отменён.`;
  }

  if (text) {
    await tg("sendMessage", { chat_id: Number(order.buyerUser.telegramId), text });
  }
}
