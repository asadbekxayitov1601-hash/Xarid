import { NextRequest, NextResponse } from "next/server";
import { handlePaynet, paynetAuthOk, PAYNET_ERROR } from "@/lib/payments/paynet";

// Paynet JSON-RPC endpoint: register this single URL in the Paynet cabinet.
export async function POST(req: NextRequest) {
  if (!paynetAuthOk(req.headers.get("authorization"))) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: PAYNET_ERROR.INVALID_LOGIN_OR_PASSWORD, message: "Invalid login or password" } },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: PAYNET_ERROR.JSON_PARSING, message: "Error parsing JSON" },
    });
  }

  const result = await handlePaynet(body);
  return NextResponse.json(result.body, { status: result.httpStatus });
}
