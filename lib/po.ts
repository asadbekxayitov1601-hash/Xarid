import { prisma } from "@/lib/db";
import { tg } from "@/lib/telegram";
import { uzs, UNIT_LABELS } from "@/lib/format";

/**
 * The cutoff: for every PLACED order that has no purchase orders yet,
 * split its items by supplier into POs and push each PO to the supplier's
 * linked Telegram users. Safe to run repeatedly (idempotent per order).
 */
export async function runCutoff(): Promise<{ orders: number; pos: number }> {
  const orders = await prisma.order.findMany({
    where: { status: "PLACED", purchaseOrders: { none: {} } },
    include: { items: { include: { offer: true } } },
  });

  let poCount = 0;
  for (const order of orders) {
    const bySupplier = new Map<string, typeof order.items>();
    for (const item of order.items) {
      const list = bySupplier.get(item.offer.supplierId) ?? [];
      list.push(item);
      bySupplier.set(item.offer.supplierId, list);
    }

    for (const [supplierId, items] of bySupplier) {
      const po = await prisma.purchaseOrder.create({
        data: {
          orderId: order.id,
          supplierId,
          lines: { connect: items.map((i) => ({ id: i.id })) },
        },
      });
      poCount++;
      await notifySupplier(po.id).catch((e) => console.error("notifySupplier failed", e));
    }
  }

  return { orders: orders.length, pos: poCount };
}

/** Sends (or re-sends) a PO to all Telegram-linked users of the supplier. */
export async function notifySupplier(poId: string) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;

  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: poId },
    include: {
      order: true,
      supplier: { include: { users: { where: { telegramId: { not: null } } } } },
      lines: { include: { offer: { include: { product: true } } } },
    },
  });
  if (po.supplier.users.length === 0) return;

  // Suppliers see THEIR money: costPrice, not the buyer-facing price.
  const lines = po.lines
    .map((l) => {
      const unit = UNIT_LABELS[l.offer.product.unit] ?? "";
      return `• ${l.offer.product.nameUz} — ${l.qty} ${unit} × ${uzs(l.costPrice)}`;
    })
    .join("\n");
  const payout = po.lines.reduce((s, l) => s + Math.round(l.costPrice * l.qty), 0);
  const date = po.order.deliveryDate.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" });

  const text =
    `📦 Yangi buyurtma №${po.id.slice(-6).toUpperCase()}\n` +
    `Yetkazish: ertaga (${date}), 05:30 da olib ketamiz\n\n` +
    `${lines}\n\n` +
    `Sizga to'lanadi: ${uzs(payout)}\n\n` +
    `Iltimos, tasdiqlang:`;

  for (const user of po.supplier.users) {
    await tg("sendMessage", {
      chat_id: Number(user.telegramId),
      text,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlayman", callback_data: `po:confirm:${po.id}` },
            { text: "❌ Rad etaman", callback_data: `po:reject:${po.id}` },
          ],
        ],
      },
    });
  }
}

/**
 * 23:30 escalation: re-ping suppliers about unconfirmed POs and send the
 * admin (ADMIN_TELEGRAM_ID) a summary so they can start calling.
 */
export async function remindUnconfirmed(): Promise<{ pending: number }> {
  const pending = await prisma.purchaseOrder.findMany({
    where: { status: "SENT" },
    include: { supplier: { include: { users: { where: { telegramId: { not: null } } } } } },
  });

  if (pending.length === 0 || !process.env.TELEGRAM_BOT_TOKEN) return { pending: pending.length };

  for (const po of pending) {
    for (const user of po.supplier.users) {
      await tg("sendMessage", {
        chat_id: Number(user.telegramId),
        text: `⏰ Eslatma: №${po.id.slice(-6).toUpperCase()} buyurtmasi hali tasdiqlanmagan. Iltimos, yuqoridagi xabardagi tugma orqali javob bering.`,
      }).catch(() => {});
    }
  }

  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId) {
    const bySupplier = new Map<string, number>();
    for (const po of pending) {
      bySupplier.set(po.supplier.name, (bySupplier.get(po.supplier.name) ?? 0) + 1);
    }
    const lines = [...bySupplier.entries()].map(([name, n]) => `• ${name}: ${n} ta PO`).join("\n");
    await tg("sendMessage", {
      chat_id: Number(adminId),
      text: `⚠️ 23:30 holati — tasdiqlanmagan buyurtmalar:\n${lines}\n\nQo'ng'iroq qilish vaqti keldi.`,
    }).catch(() => {});
  }

  return { pending: pending.length };
}

/**
 * Supplier tapped confirm/reject. Updates the PO, recomputes the parent
 * order status (CONFIRMED when all POs confirmed, PARTIAL otherwise),
 * notifies the buyer when fully confirmed.
 */
export async function resolvePo(poId: string, action: "confirm" | "reject", byTelegramId: number) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { supplier: { include: { users: true } } },
  });
  if (!po) return { ok: false, message: "Buyurtma topilmadi" };

  const isStaff = po.supplier.users.some((u) => u.telegramId === BigInt(byTelegramId));
  if (!isStaff) return { ok: false, message: "Ruxsat yo'q" };
  if (po.status !== "SENT") return { ok: false, message: "Allaqachon javob berilgan" };

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
    await tg("sendMessage", {
      chat_id: Number(order.buyerUser.telegramId),
      text: `✅ Buyurtmangiz tasdiqlandi! Ertaga 06:00–10:00 oralig'ida yetkazib beramiz.\nJami: ${uzs(order.total)}`,
    }).catch(() => {});
  }

  return {
    ok: true,
    message: action === "confirm" ? "✅ Tasdiqlandi, rahmat!" : "❌ Rad etildi. Operator siz bilan bog'lanadi.",
  };
}
