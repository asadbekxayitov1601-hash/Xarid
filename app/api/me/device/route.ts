import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set(["ANDROID", "IOS"]);

// Register (or refresh) the calling user's FCM device token so they can receive
// push notifications. Requires a session (Bearer token). Idempotent: the same
// token re-binds to the current user.
//   POST { token, platform?: "ANDROID" | "IOS" } -> { ok: true }
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const platformRaw = String(body?.platform ?? "").trim().toUpperCase();
  const platform = PLATFORMS.has(platformRaw) ? platformRaw : null;
  if (!token || token.length > 4096) return NextResponse.json({ error: "token" }, { status: 400 });

  await prisma.deviceToken.upsert({
    where: { token },
    update: { userId, platform },
    create: { userId, token, platform },
  });

  return NextResponse.json({ ok: true });
}

// Unregister a device token (e.g. on logout).
//   DELETE { token } -> { ok: true }
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  if (token) await prisma.deviceToken.deleteMany({ where: { token, userId } });

  return NextResponse.json({ ok: true });
}
