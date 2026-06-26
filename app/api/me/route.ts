import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// Resolves the current user from the Bearer token (or web cookie). The app calls
// this on launch to validate a stored token and learn the account's role so it
// can route to the customer vs courier experience.
//   GET -> { user: { id, name, phone, role, isSeller } | null }
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, role: true, org: { select: { type: true } } },
  });
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isSeller: user.org?.type === "SUPPLIER",
    },
  });
}
