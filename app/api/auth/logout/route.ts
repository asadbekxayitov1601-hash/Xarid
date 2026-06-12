import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  (await cookies()).set("xarid_session", "", { maxAge: 0, path: "/" });
  return NextResponse.json({ ok: true });
}
