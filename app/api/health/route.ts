import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tablesExist } from "@/lib/setup";

export const dynamic = "force-dynamic";

// Deployment self-diagnosis: open /api/health in a browser to see exactly
// what is and isn't configured. Reports presence of env vars (never values).
//
// HARDENED (Agent 3): this endpoint must NEVER return a 500. A 500 here is
// useless — it hides the very problem you came to diagnose. Everything runs
// inside try/catch and the route always answers HTTP 200 with a JSON report.
// `db` is "ok" when SELECT 1 succeeds, "error" when the DB is unreachable, and
// "unconfigured" when DATABASE_URL is missing entirely.
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    TELEGRAM_BOT_TOKEN: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    ADMIN_TELEGRAM_ID: Boolean(process.env.ADMIN_TELEGRAM_ID),
  };

  // Names of required env vars that are not set — so the report is actionable
  // without leaking any values.
  const missingEnv = (["DATABASE_URL", "SESSION_SECRET"] as const).filter(
    (k) => !env[k],
  );

  // `db`: "ok" | "error" | "unconfigured" (machine-readable, requested shape).
  // `database`: legacy human label kept for backward compatibility.
  let db: "ok" | "error" | "unconfigured" = "unconfigured";
  let database = "unreachable";
  let tables = false;
  let products = 0;
  let suppliers = 0;
  let error: string | undefined;

  if (env.DATABASE_URL) {
    try {
      // Lightweight connectivity probe — cheapest possible round-trip.
      await prisma.$queryRaw`SELECT 1`;
      db = "ok";
      database = "connected";

      // These can each fail independently (e.g. schema not pushed yet); guard
      // them so a missing table never turns the whole health check into a 500.
      try {
        tables = await tablesExist(prisma);
        if (tables) {
          products = await prisma.product.count();
          suppliers = await prisma.organization.count({ where: { type: "SUPPLIER" } });
        }
      } catch (inner) {
        error = inner instanceof Error ? inner.message.split("\n")[0] : String(inner);
      }
    } catch (e) {
      db = "error";
      error = e instanceof Error ? e.message.split("\n")[0] : String(e);
    }
  }

  const hints: string[] = [];
  if (!env.DATABASE_URL) {
    hints.push("DATABASE_URL is not set. Add it to the environment (Neon pooled URL) and REDEPLOY.");
  }
  if (env.DATABASE_URL && db === "error") {
    hints.push(
      "DATABASE_URL is set but the database is unreachable. Check the connection string starts with postgresql:// (not file:/sqlite), and use Neon's POOLED URL on Vercel.",
    );
  }
  if (db === "ok" && !tables) {
    hints.push("Connected, but no tables yet. Run `npx prisma db push`, or open /api/setup?key=<ADMIN_PASSWORD> to create and seed them.");
  }
  if (tables && products === 0) {
    hints.push("Tables exist but the catalog is empty. Run `npx prisma db seed` or open /api/setup?key=<ADMIN_PASSWORD> to seed.");
  }
  if (missingEnv.length > 0) {
    hints.push(`Missing required env vars: ${missingEnv.join(", ")}.`);
  }
  if (hints.length === 0) {
    hints.push("All good.");
  }

  // Always HTTP 200 — the body carries the diagnosis. A non-200 here would
  // defeat the purpose of a health endpoint.
  return NextResponse.json({
    ok: db === "ok" && tables && products > 0,
    db,
    database,
    tables,
    products,
    suppliers,
    env,
    missingEnv,
    error,
    hints,
  });
}
