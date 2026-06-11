import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

/**
 * Server-side guard for /driver pages and actions: the session user must be
 * a linked, active driver (authenticated automatically inside the Mini App
 * opened from the bot's stop message).
 */
export async function requireDriver() {
  const userId = await getSessionUserId();
  if (userId) {
    const driver = await prisma.driver.findFirst({ where: { userId, active: true } });
    if (driver) return driver;
  }
  redirect("/");
}
