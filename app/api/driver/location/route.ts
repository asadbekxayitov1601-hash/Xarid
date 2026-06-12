import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/driver-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/driver/location
 * Body: { lat: number, lng: number, accuracy?: number }
 *
 * Upserts the driver's last known position. Called by the driver app every
 * ~15s while a job is open. Stateless — no audit trail (we don't need to
 * replay where a driver was; if we ever do, this becomes an append-only
 * table). Driver auth comes from the existing /driver session.
 */
export async function POST(req: NextRequest) {
  const driver = await getCurrentDriver();
  if (!driver) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { lat?: number; lng?: number; accuracy?: number } | null;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ ok: false, error: "bad_coords" }, { status: 400 });
  }
  const accuracy = Number.isFinite(Number(body?.accuracy)) ? Number(body?.accuracy) : null;

  await prisma.driverLocation.upsert({
    where: { driverId: driver.id },
    update: { lat, lng, accuracy: accuracy ?? undefined },
    create: { driverId: driver.id, lat, lng, accuracy: accuracy ?? undefined },
  });

  return NextResponse.json({ ok: true });
}
