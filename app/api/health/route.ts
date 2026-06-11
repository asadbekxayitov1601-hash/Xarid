import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tablesExist } from "@/lib/setup";

export const dynamic = "force-dynamic";

// Deployment self-diagnosis: open /api/health in a browser to see exactly
// what is and isn't configured. Reports presence of env vars (never values).
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    TELEGRAM_BOT_TOKEN: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    ADMIN_TELEGRAM_ID: Boolean(process.env.ADMIN_TELEGRAM_ID),
  };

  let database = "unreachable";
  let tables = false;
  let products = 0;
  let suppliers = 0;
  let error: string | undefined;

  if (env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
      tables = await tablesExist(prisma);
      if (tables) {
        products = await prisma.product.count();
        suppliers = await prisma.organization.count({ where: { type: "SUPPLIER" } });
      }
    } catch (e) {
      error = e instanceof Error ? e.message.split("\n")[0] : String(e);
    }
  }

  const hints: string[] = [];
  if (!env.DATABASE_URL) hints.push("Set DATABASE_URL in the platform's environment variables, then REDEPLOY.");
  if (env.DATABASE_URL && database !== "connected")
    hints.push("DATABASE_URL is set but unreachable — check the connection string (use Neon's pooled URL on Vercel).");
  if (database === "connected" && !tables) hints.push("No tables yet — open /api/setup?key=<ADMIN_PASSWORD> to create and seed them.");
  if (tables && products === 0) hints.push("Tables exist but catalog is empty — open /api/setup?key=<ADMIN_PASSWORD> to seed.");
  if (hints.length === 0) hints.push("All good.");

  return NextResponse.json({ env, database, tables, products, suppliers, error, hints });
}
