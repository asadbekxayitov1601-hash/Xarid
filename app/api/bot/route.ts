import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tg } from "@/lib/telegram";
import { resolvePo } from "@/lib/po";
import { markDelivered, recordCashReply, recordPodPhoto, sendDriverStops } from "@/lib/driver";

// Telegram bot webhook. Register once with:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/bot
//
// Handles:
//   /start                → Mini App button (buyers; supplier portal for supplier staff)
//   /start sup_<botCode>  → links this Telegram account to a supplier org
//   /start drv_<botCode>  → links this Telegram account to a driver
//   callback po:confirm|reject:<id> → supplier confirms/rejects a purchase order
//   callback ord:done:<id>          → driver marks a stop delivered
//   reply to the cash prompt        → records cash collected at the door
export async function POST(req: NextRequest) {
  const update = await req.json().catch(() => null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const cb = update?.callback_query;
  if (cb?.data && cb.from?.id) {
    let result: { ok: boolean; message: string } | null = null;

    const po = /^po:(confirm|reject):(.+)$/.exec(String(cb.data));
    if (po) result = await resolvePo(po[2], po[1] as "confirm" | "reject", cb.from.id);

    const done = /^ord:done:(.+)$/.exec(String(cb.data));
    if (done) result = await markDelivered(done[1], cb.from.id);

    if (result) {
      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: result.message });
      if (result.ok && cb.message) {
        await tg("editMessageText", {
          chat_id: cb.message.chat.id,
          message_id: cb.message.message_id,
          text: `${cb.message.text}\n\n${result.message}`,
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message;
  if (!msg?.chat?.id) return NextResponse.json({ ok: true });

  // Driver replying to the cash prompt.
  if (await recordCashReply(msg)) return NextResponse.json({ ok: true });

  // Driver sending a proof-of-delivery photo.
  if (await recordPodPhoto(msg)) return NextResponse.json({ ok: true });

  if (typeof msg.text === "string" && msg.text.startsWith("/start")) {
    const payload = msg.text.split(" ")[1];
    const from = msg.from;
    const name = from ? [from.first_name, from.last_name].filter(Boolean).join(" ") || null : null;

    // Supplier staff onboarding via deep link: t.me/<bot>?start=sup_<botCode>
    if (payload?.startsWith("sup_") && from?.id) {
      const org = await prisma.organization.findUnique({ where: { botCode: payload.slice(4) } });
      if (org?.type === "SUPPLIER") {
        await prisma.user.upsert({
          where: { telegramId: BigInt(from.id) },
          update: { orgId: org.id, role: "STAFF", name: name ?? undefined },
          create: { telegramId: BigInt(from.id), orgId: org.id, role: "STAFF", name },
        });
        await tg("sendMessage", {
          chat_id: msg.chat.id,
          text:
            `✅ Siz "${org.name}" yetkazib beruvchisiga ulandingiz.\n\n` +
            `Yangi buyurtmalar shu yerga keladi. Narxlaringizni o'zingiz boshqarishingiz mumkin:`,
          reply_markup: {
            inline_keyboard: [[{ text: "📋 Narxlarni boshqarish", web_app: { url: `${appUrl}/supplier` } }]],
          },
        });
        return NextResponse.json({ ok: true });
      }
    }

    // Driver onboarding via deep link: t.me/<bot>?start=drv_<botCode>
    if (payload?.startsWith("drv_") && from?.id) {
      const driver = await prisma.driver.findUnique({ where: { botCode: payload.slice(4) } });
      if (driver) {
        const user = await prisma.user.upsert({
          where: { telegramId: BigInt(from.id) },
          update: { name: name ?? undefined },
          create: { telegramId: BigInt(from.id), name, role: "DRIVER" },
        });
        // One Telegram account drives for one driver record at a time.
        await prisma.driver.updateMany({ where: { userId: user.id }, data: { userId: null } });
        await prisma.driver.update({ where: { id: driver.id }, data: { userId: user.id } });
        await tg("sendMessage", {
          chat_id: msg.chat.id,
          text:
            `✅ Salom, ${driver.name}! Siz haydovchi sifatida ulandingiz.\n\n` +
            `Bugungi marshrutni olish uchun /marshrut deb yozing. Yangi buyurtmalar avtomatik keladi.`,
        });
        return NextResponse.json({ ok: true });
      }
    }

    await sendWelcome(msg.chat.id, from?.id, appUrl);
    return NextResponse.json({ ok: true });
  }

  // Driver requesting today's route.
  if (typeof msg.text === "string" && /^\/?marshrut/i.test(msg.text.trim()) && msg.from?.id) {
    await sendDriverStops(msg.from.id);
    return NextResponse.json({ ok: true });
  }

  // Anything else the bot doesn't understand (e.g. "/admin", free text):
  // answer with the role-aware welcome instead of silence.
  if (typeof msg.text === "string") {
    await sendWelcome(msg.chat.id, msg.from?.id, appUrl);
  }

  return NextResponse.json({ ok: true });
}

// Role-aware default reply: linked supplier staff get their portal, linked
// drivers get today's stops, everyone else gets the buyer Mini App.
async function sendWelcome(chatId: number, fromId: number | undefined, appUrl: string) {
  if (fromId) {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(fromId) },
      include: { org: true, driver: true },
    });
    if (user?.org?.type === "SUPPLIER") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `"${user.org.name}" — narxlar va buyurtmalar:`,
        reply_markup: {
          inline_keyboard: [[{ text: "📋 Narxlarni boshqarish", web_app: { url: `${appUrl}/supplier` } }]],
        },
      });
      return;
    }
    if (user?.driver) {
      await sendDriverStops(fromId);
      return;
    }
  }

  await tg("sendMessage", {
    chat_id: chatId,
    text:
      "Xarid — restoran va kafelar uchun ertalabki ta'minot bozori.\n" +
      "Bitta savatda barcha mahsulotlar, ertalab soat 10:00 gacha yetkazib beramiz.\n\n" +
      "Buyurtma berish uchun ilovani oching:",
    reply_markup: {
      inline_keyboard: [[{ text: "🛒 Xarid ilovasini ochish", web_app: { url: `${appUrl}/catalog` } }]],
    },
  });
}
