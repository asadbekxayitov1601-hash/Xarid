import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/driver/me  (Bearer)
//
// The courier app's gate: tells the app whether the signed-in user has a driver
// application and what state it's in, so it can route to the map (APPROVED),
// the "under review" screen (PENDING), the rejection notice (REJECTED), or the
// application form (no driver row).
//   -> { driver: { status, name, phone, experienceYears, carType, carNumber } | null,
//        role: string }
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user, driver] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.driver.findUnique({
      where: { userId },
      select: {
        status: true,
        name: true,
        phone: true,
        experienceYears: true,
        carType: true,
        carNumber: true,
        active: true,
      },
    }),
  ]);

  return NextResponse.json({ role: user?.role ?? "OWNER", driver: driver ?? null });
}
