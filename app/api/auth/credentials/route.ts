import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, normalizePhone, verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";

// Web sign in / sign up with phone + password. Two account types at signup:
//   - "buyer"  (default): an ordinary consumer who orders groceries -> /catalog.
//     Stays exactly as before (a User with no organization).
//   - "seller": a shop / vendor. In addition to the User we create a SUPPLIER
//     Organization the user owns and link it, so requireSupplier() (lib/supplier.ts)
//     admits them to /supplier. Additive: existing buyer signup is unchanged, and
//     sellers onboarded via the Telegram bot's sup_ deep link keep working.
//
// Telegram users authenticate via initData and never see this. An account
// created implicitly at checkout (phone, no password) is "claimed" by signing
// up with that phone, keeping its order history.

// New web sellers default to the launch city; they can refine area/details
// later in /supplier/profile.
const SELLER_DEFAULT_DISTRICT = "Qo'qon";

// Route by the user's actual account type: a user who owns a SUPPLIER org is a
// seller and lands in the seller portal; everyone else is a buyer.
async function destinationFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { org: { select: { type: true } } },
  });
  return user?.org?.type === "SUPPLIER" ? "/supplier" : "/catalog";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mode = body?.mode;
  const accountType = body?.accountType === "seller" ? "seller" : "buyer";
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

    // Seller signup: create and link a SUPPLIER organization they own, unless
    // this user is already linked to one (idempotent / claim-safe).
    if (accountType === "seller" && !user.orgId) {
      const org = await prisma.organization.create({
        data: {
          type: "SUPPLIER",
          name: name || "Do'kon",
          district: SELLER_DEFAULT_DISTRICT,
          phone,
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { orgId: org.id, role: "OWNER" },
      });
    }

    await setSession(user.id);
    return NextResponse.json({ ok: true, redirect: await destinationFor(user.id) });
  }

  if (mode === "signin") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }
    await setSession(user.id);
    return NextResponse.json({ ok: true, redirect: await destinationFor(user.id) });
  }

  return NextResponse.json({ error: "mode" }, { status: 400 });
}
