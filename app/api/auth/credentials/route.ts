import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, normalizePhone, verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";

// Web sign in / sign up with phone + password. Telegram users never see
// this — they're authenticated via initData. An account created implicitly
// at checkout (phone, no password) is "claimed" by signing up with that
// phone, keeping its order history.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mode = body?.mode;
  const phone = normalizePhone(String(body?.phone ?? ""));
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();

  if (!phone) return NextResponse.json({ error: "phone" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "password" }, { status: 400 });

  if (mode === "signup") {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing?.passwordHash) {
      return NextResponse.json({ error: "taken" }, { status: 409 });
    }
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash: hashPassword(password), name: name || existing.name },
        })
      : await prisma.user.create({
          data: { phone, passwordHash: hashPassword(password), name: name || null },
        });
    await setSession(user.id);
    return NextResponse.json({ ok: true });
  }

  if (mode === "signin") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }
    await setSession(user.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "mode" }, { status: 400 });
}
