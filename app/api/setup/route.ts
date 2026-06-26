import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/setup";
import { safeStrEqual } from "@/lib/password";

export const dynamic = "force-dynamic";

// One-time bootstrap from the browser — no local Prisma CLI needed:
//   /api/setup?key=<ADMIN_PASSWORD>          (schema only — no demo data)
//   /api/setup?key=<ADMIN_PASSWORD>&seed=1   (also seed the demo catalog if empty)
// Creates the schema if missing and applies idempotent column upgrades. Seeding
// the demo catalog is opt-in (store-first catalogs are entered manually).
// Idempotent: it never modifies a database that already has data.
export async function GET(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not set — set it and redeploy first" }, { status: 503 });
  }
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!safeStrEqual(key, password)) {
    return NextResponse.json({ error: "wrong key — use /api/setup?key=<ADMIN_PASSWORD>" }, { status: 401 });
  }

  const seed = req.nextUrl.searchParams.get("seed") === "1";

  try {
    const result = await ensureDatabase(prisma, { seed });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n")[0] : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
