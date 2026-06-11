import { NextRequest, NextResponse } from "next/server";
import { remindUnconfirmed } from "@/lib/po";

// 23:30 escalation (18:30 UTC via vercel.json, or the in-process scheduler
// on Railway): re-ping suppliers with unconfirmed POs, summary to admin.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await remindUnconfirmed();
  return NextResponse.json({ ok: true, ...result });
}
