import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { tg } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Serves an order's proof-of-delivery photo to the admin: resolves the
// Telegram file_id to a temporary file URL and redirects to it.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { podFileId: true } });
  if (!order?.podFileId) return NextResponse.json({ error: "no photo" }, { status: 404 });

  const res = (await tg("getFile", { file_id: order.podFileId })) as {
    ok: boolean;
    result?: { file_path?: string };
  };
  if (!res.ok || !res.result?.file_path) {
    return NextResponse.json({ error: "photo unavailable" }, { status: 503 });
  }

  return NextResponse.redirect(
    `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${res.result.file_path}`
  );
}
