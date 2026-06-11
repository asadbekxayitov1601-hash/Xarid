import { NextRequest, NextResponse } from "next/server";
import { handleUzum, uzumAuthOk, UZUM_ERROR } from "@/lib/payments/uzum";

// Uzum Bank merchant webhooks: /api/payments/uzum/check|create|confirm|reverse|status
// Configure these five URLs in the Uzum merchant cabinet with Basic auth.
export async function POST(req: NextRequest, { params }: { params: Promise<{ op: string }> }) {
  const { op } = await params;

  if (!uzumAuthOk(req.headers.get("authorization"))) {
    return NextResponse.json(
      { timestamp: Date.now(), status: "FAILED", errorCode: UZUM_ERROR.AUTHORIZATION },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { timestamp: Date.now(), status: "FAILED", errorCode: UZUM_ERROR.PARSING_JSON },
      { status: 400 }
    );
  }

  const result = await handleUzum(op, body);
  return NextResponse.json(result.body, { status: result.httpStatus });
}
