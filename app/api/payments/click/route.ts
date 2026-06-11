import { NextRequest, NextResponse } from "next/server";
import { handleClick } from "@/lib/payments/click";

// Click SHOP-API endpoint. Configure BOTH the prepare and complete URLs in
// the Click merchant cabinet to point here — the action field tells them apart.
export async function POST(req: NextRequest) {
  // Click sends application/x-www-form-urlencoded; JSON accepted for tests.
  const params: Record<string, string> = {};
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    const json = await req.json().catch(() => null);
    if (json) for (const [k, v] of Object.entries(json)) params[k] = String(v);
  } else {
    const form = await req.formData().catch(() => null);
    if (form) for (const [k, v] of form.entries()) params[k] = String(v);
  }

  const result = await handleClick(params);
  return NextResponse.json(result);
}
