import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateInitData } from "@/lib/telegram";
import { setSession } from "@/lib/session";

// Called once by the Mini App on load with window.Telegram.WebApp.initData.
// Validates the HMAC, upserts the user, sets the session cookie.
export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "bot not configured" }, { status: 503 });
  }

  const { initData } = await req.json();
  if (typeof initData !== "string" || !initData) {
    return NextResponse.json({ error: "initData required" }, { status: 400 });
  }

  const tgUser = validateInitData(initData, botToken);
  if (!tgUser) {
    return NextResponse.json({ error: "invalid initData" }, { status: 401 });
  }

  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || tgUser.username || null;
  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(tgUser.id) },
    update: { name: name ?? undefined },
    create: { telegramId: BigInt(tgUser.id), name },
  });

  await setSession(user.id);
  return NextResponse.json({ ok: true, name: user.name });
}
