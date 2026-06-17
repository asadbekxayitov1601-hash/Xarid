"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { autoAssignCourier } from "@/lib/dispatch";
import { formatKm } from "@/lib/geo";

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

/**
 * Result of an auto-assign attempt, shaped for the dispatch board to render
 * directly. On success it carries the matched courier's name and a formatted
 * distance label (empty when the courier had no recent location — a fallback
 * pick). On failure it carries a stable `reason` code the client maps to a
 * translated message via `disp_auto_err_*`.
 */
export type AutoAssignResult =
  | { ok: true; orderId: string; driverName: string; distanceLabel: string }
  | { ok: false; orderId: string; reason: string };

/**
 * Algorithmic dispatch: find and assign the nearest available courier to an
 * order, replacing the manual dropdown as the default path. Delegates the
 * ranking to `autoAssignCourier` (lib/dispatch), then resolves the chosen
 * driver's display name and revalidates the affected views.
 *
 * Returns a structured {@link AutoAssignResult} instead of throwing so the
 * board can surface the outcome inline (courier + distance, or a reason).
 */
export async function autoAssignAction(orderId: string): Promise<AutoAssignResult> {
  await requireAdmin();
  if (!orderId) return { ok: false, orderId, reason: "not_found" };

  const res = await autoAssignCourier(orderId);

  if (!res.ok) {
    return { ok: false, orderId, reason: res.reason };
  }

  const driver = await prisma.driver.findUnique({
    where: { id: res.driverId },
    select: { name: true },
  });

  revalidatePath("/admin/dispatch");
  revalidatePath(`/track/${orderId}`);

  return {
    ok: true,
    orderId,
    driverName: driver?.name ?? "",
    distanceLabel: res.distanceKm != null ? formatKm(res.distanceKm) : "",
  };
}
