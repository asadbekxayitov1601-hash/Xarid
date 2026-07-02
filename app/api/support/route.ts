import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BODY = 2000;

// GET /api/support  (Bearer)
//
// The signed-in user's support thread, oldest-first. Marks any unread operator
// replies as read so the app's unread badge clears once the thread is opened.
//   -> { messages: [{ id, fromSupport, body, createdAt }] }
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const messages = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fromSupport: true, body: true, createdAt: true },
  });

  // Clear the unread badge for operator replies the user has now seen.
  await prisma.supportMessage.updateMany({
    where: { userId, fromSupport: true, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages });
}

// POST /api/support  (Bearer)  { body }
//
// Append a user message to their support thread. The first message in a brand-new
// thread gets an automatic acknowledgement from support so the user sees an
// immediate response; real operators reply from the admin inbox after that.
//   -> { messages: [...] }  (the full thread after appending)
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const body = String(json?.body ?? "").trim().slice(0, MAX_BODY);
  if (!body) return NextResponse.json({ error: "empty" }, { status: 400 });

  const isFirstEver = (await prisma.supportMessage.count({ where: { userId } })) === 0;

  await prisma.supportMessage.create({ data: { userId, fromSupport: false, body } });
  if (isFirstEver) {
    await prisma.supportMessage.create({
      data: {
        userId,
        fromSupport: true,
        // Support messages are persisted free text stored verbatim in the thread
        // (not localized at render time), so a neutral hardcoded acknowledgement
        // is fine here. Real operators follow up from the admin inbox.
        body: "Rahmat! Murojaatingiz qabul qilindi. Tez orada javob beramiz.",
        readAt: null,
      },
    });
  }

  const messages = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fromSupport: true, body: true, createdAt: true },
  });
  return NextResponse.json({ messages });
}
