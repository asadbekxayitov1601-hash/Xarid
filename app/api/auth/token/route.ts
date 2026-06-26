import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, normalizePhone, verifyPassword } from "@/lib/password";
import { createToken } from "@/lib/session";

// Token-based phone + password auth for the native (Flutter) apps. Mirrors the
// web cookie flow in /api/auth/credentials, but returns a Bearer token in the
// body instead of setting a cookie. The app stores the token and sends it as
// `Authorization: Bearer <token>` on every request.
//
//   POST { mode: "signin" | "signup", phone, password, name? }
//   -> { ok: true, token, user: { id, name, phone, role } }
//
// Public signup is buyer-only (role OWNER, no org); stores/couriers/admin are
// provisioned server-side and just sign in.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mode = body?.mode;
  const phone = normalizePhone(String(body?.phone ?? ""));
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();

  if (!phone) return NextResponse.json({ error: "phone" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "password" }, { status: 400 });

  function ok(user: { id: string; name: string | null; phone: string | null; role: string }) {
    return NextResponse.json({
      ok: true,
      token: createToken(user.id),
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    });
  }

  if (mode === "signup") {
    const existing = await prisma.user.findUnique({ where: { phone } });
    // An account that already has a password (buyer, seller, courier, admin)
    // can't be re-claimed via signup.
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
    return ok(user);
  }

  if (mode === "signin") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }
    return ok(user);
  }

  return NextResponse.json({ error: "mode" }, { status: 400 });
}
