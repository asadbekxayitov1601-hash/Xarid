import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tg } from "@/lib/telegram";
import { resolvePo } from "@/lib/po";

// Telegram bot webhook. Register once with:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/bot
//
// Handles:
//   /start                → Mini App button for buyers
//   /start sup_<botCode>  → links this Telegram account to a supplier org
//   callback po:confirm|reject:<id> → supplier confirms/rejects a purchase order
export async function POST(req: NextRequest) {
  const update = await req.json().catch(() => null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const cb = update?.callback_query;
  if (cb?.data && cb.from?.id) {
    const m = /^po:(confirm|reject):(.+)$/.exec(String(cb.data));
    if (m) {
      const result = await resolvePo(m[2], m[1] as "confirm" | "reject", cb.from.id);
      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: result.message });
      if (result.ok && cb.message) {
        await tg("editMessageText", {
          chat_id: cb.message.chat.id,
          message_id: cb.message.message_id,
          text: `${cb.message.text}\n\n${result.message}`,
        }).catch(() => {});
      }
    }
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message;
  if (!msg?.chat?.id) return NextResponse.json({ ok: true });

  if (typeof msg.text === "string" && msg.text.startsWith("/start")) {
    const payload = msg.text.split(" ")[1];

    // Supplier staff onboarding via deep link: t.me/<bot>?start=sup_<botCode>
    if (payload?.startsWith("sup_") && msg.from?.id) {
      const org = await prisma.organization.findUnique({
        where: { botCode: payload.slice(4) },
      });
      if (org?.type === "SUPPLIER") {
        const name = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || null;
        await prisma.user.upsert({
          where: { telegramId: BigInt(msg.from.id) },
          update: { orgId: org.id, role: "STAFF", name: name ?? undefined },
          create: { telegramId: BigInt(msg.from.id), orgId: org.id, role: "STAFF", name },
        });
        await tg("sendMessage", {
          chat_id: msg.chat.id,
          text:
            `✅ Siz "${org.name}" yetkazib beruvchisiga ulandingiz.\n\n` +
            `Endi yangi buyurtmalar shu yerga keladi — tasdiqlash uchun bitta tugma bosasiz.`,
        });
        return NextResponse.json({ ok: true });
      }
    }

    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text:
        "Xarid — restoran va kafelar uchun ertalabki ta'minot bozori.\n" +
        "Bitta savatda barcha mahsulotlar, ertalab soat 10:00 gacha yetkazib beramiz.\n\n" +
        "Buyurtma berish uchun ilovani oching:",
      reply_markup: {
        inline_keyboard: [[{ text: "🛒 Xarid ilovasini ochish", web_app: { url: `${appUrl}/catalog` } }]],
      },
    });
  }

  return NextResponse.json({ ok: true });
}
