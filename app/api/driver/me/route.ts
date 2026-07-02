import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// A profile photo is a compressed image data URL (~20-60KB); cap holds a full
// data URL, not a plain link.
const PHOTO_MAX = 400_000;

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
        photoUrl: true,
        ratingAvg: true,
        ratingCount: true,
        active: true,
      },
    }),
  ]);

  return NextResponse.json({ role: user?.role ?? "OWNER", driver: driver ?? null });
}

// PUT /api/driver/me { photoUrl }  (Bearer) — the driver sets their profile
// photo (a compressed image data URL). Returns the updated driver.
export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findFirst({ where: { userId } });
  if (!driver) return NextResponse.json({ error: "not_driver" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const raw = String(body?.photoUrl ?? "").trim();
  const valid = /^data:image\/(jpeg|png|webp);base64,/.test(raw) && raw.length <= PHOTO_MAX;
  if (!valid) return NextResponse.json({ error: "photo" }, { status: 400 });

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: { photoUrl: raw },
    select: {
      status: true,
      name: true,
      phone: true,
      experienceYears: true,
      carType: true,
      carNumber: true,
      photoUrl: true,
      ratingAvg: true,
      ratingCount: true,
      active: true,
    },
  });
  return NextResponse.json({ driver: updated });
}
