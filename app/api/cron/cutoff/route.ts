import { NextRequest, NextResponse } from "next/server";
import { runCutoff } from "@/lib/po";

// Manual/external trigger for the cutoff (the scheduled 22:00 run happens
// in-process — see lib/scheduler.ts). Closes the day's baskets into
// per-supplier purchase orders and pushes them to suppliers' Telegram.
// Protected by CRON_SECRET (Bearer token) when set.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runCutoff();
  return NextResponse.json({ ok: true, ...result });
}
