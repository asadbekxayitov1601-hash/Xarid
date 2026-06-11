import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/setup";

export const dynamic = "force-dynamic";

// One-time bootstrap from the browser — no local Prisma CLI needed:
//   /api/setup?key=<ADMIN_PASSWORD>
// Creates the schema if missing and seeds the demo catalog if empty.
// Idempotent: it never modifies a database that already has data.
export async function GET(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not set — set it and redeploy first" }, { status: 503 });
  }
  if (req.nextUrl.searchParams.get("key") !== password) {
    return NextResponse.json({ error: "wrong key — use /api/setup?key=<ADMIN_PASSWORD>" }, { status: 401 });
  }

  try {
    const result = await ensureDatabase(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n")[0] : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
