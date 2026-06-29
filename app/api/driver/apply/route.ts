import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { normalizePhone } from "@/lib/password";

export const dynamic = "force-dynamic";

// POST /api/driver/apply  (Bearer)
//
// A signed-in user applies to become a courier. Creates (or updates, while still
// pending) a Driver row linked to the user with status PENDING and active=false.
// An admin approves it later (app/admin/drivers), which flips the user's role to
// DRIVER. Applying does NOT grant driver access on its own.
//
//   POST { fullName, phone, experienceYears, carType, carNumber }
//   -> { driver: { status, name, phone, experienceYears, carType, carNumber } }
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const phone = normalizePhone(String(body?.phone ?? ""));
  const carType = String(body?.carType ?? "").trim();
  const carNumber = String(body?.carNumber ?? "").trim();
  const experienceYears = Math.trunc(Number(body?.experienceYears));

  if (fullName.length < 2) return NextResponse.json({ error: "name" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "phone" }, { status: 400 });
  if (carType.length < 1) return NextResponse.json({ error: "carType" }, { status: 400 });
  if (carNumber.length < 1) return NextResponse.json({ error: "carNumber" }, { status: 400 });
  if (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 70) {
    return NextResponse.json({ error: "experience" }, { status: 400 });
  }

  const existing = await prisma.driver.findUnique({ where: { userId } });
  // An already-approved courier can't downgrade themselves back to an application.
  if (existing?.status === "APPROVED") {
    return NextResponse.json({ driver: shape(existing) });
  }

  const driver = existing
    ? await prisma.driver.update({
        where: { userId },
        data: { name: fullName, phone, status: "PENDING", active: false, experienceYears, carType, carNumber },
      })
    : await prisma.driver.create({
        data: { userId, name: fullName, phone, status: "PENDING", active: false, experienceYears, carType, carNumber },
      });

  return NextResponse.json({ driver: shape(driver) });
}

type DriverShape = {
  status: string;
  name: string;
  phone: string;
  experienceYears: number | null;
  carType: string | null;
  carNumber: string | null;
};

function shape(d: DriverShape) {
  return {
    status: d.status,
    name: d.name,
    phone: d.phone,
    experienceYears: d.experienceYears,
    carType: d.carType,
    carNumber: d.carNumber,
  };
}
