import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { name, phone, role, district } = body ?? {};
  if (!name || !phone || !["BUYER", "SUPPLIER"].includes(role)) {
    return NextResponse.json({ error: "name, phone, role required" }, { status: 400 });
  }
  await prisma.lead.create({
    data: { name: String(name), phone: String(phone), role, district: district ? String(district) : null },
  });
  return NextResponse.json({ ok: true });
}
