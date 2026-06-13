"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/**
 * Assigns or unassigns a driver to an order. Called from the dispatcher
 * board's per-row <form action={assignDriver} />.
 *
 * - `driverId === ""` removes the assignment and reverts status to
 *   CONFIRMED (or PLACED if it was still pre-cutoff).
 * - Any other value: assigns and flips status to `ASSIGNED` (unless we're
 *   already past pickup — then status is left alone so the dispatcher can
 *   reassign mid-route without un-doing the picked-up state).
 */
export async function assignDriver(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const driverIdRaw = String(formData.get("driverId") ?? "");
  if (!orderId) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  if (driverIdRaw === "") {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        driverId: null,
        status: order.status === "ASSIGNED" ? "CONFIRMED" : order.status,
      },
    });
  } else {
    const driver = await prisma.driver.findUnique({ where: { id: driverIdRaw } });
    if (!driver || !driver.active) return;
    const beforePickup = order.status === "PLACED" || order.status === "CONFIRMED";
    await prisma.order.update({
      where: { id: orderId },
      data: {
        driverId: driver.id,
        status: beforePickup ? "ASSIGNED" : order.status,
      },
    });
  }

  revalidatePath("/admin/dispatch");
  revalidatePath(`/track/${orderId}`);
}
