import { NextRequest, NextResponse } from "next/server";
import { runCutoff } from "@/lib/po";

// 22:00 cutoff (17:00 UTC, see vercel.json): close the day's baskets into
// per-supplier purchase orders and push them to suppliers' Telegram.
// Protected by CRON_SECRET when set (Vercel sends it as a Bearer token).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runCutoff();
  return NextResponse.json({ ok: true, ...result });
}
