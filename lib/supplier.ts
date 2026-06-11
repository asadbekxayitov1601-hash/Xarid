import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

/**
 * Server-side guard for /supplier pages and actions: the session user must
 * be linked to a SUPPLIER organization (via the bot's sup_ deep link, which
 * also authenticates them automatically inside the Mini App).
 */
export async function requireSupplier() {
  const userId = await getSessionUserId();
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { org: true } });
    if (user?.org?.type === "SUPPLIER") return { user, org: user.org };
  }
  redirect("/");
}
