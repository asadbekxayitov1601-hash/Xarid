import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

/** Server-side guard for /admin pages and actions. */
export async function requireAdmin() {
  const userId = await getSessionUserId();
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "ADMIN") return user;
  }
  // Admins sign in through the normal phone+password page; no separate login.
  redirect("/auth");
}
