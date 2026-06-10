import { NextRequest, NextResponse } from "next/server";
import { tg } from "@/lib/telegram";

// Telegram bot webhook. Register once with:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/bot
// The bot's only job for now: hand out the Mini App button.
export async function POST(req: NextRequest) {
  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id) return NextResponse.json({ ok: true });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (typeof msg.text === "string" && msg.text.startsWith("/start")) {
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
