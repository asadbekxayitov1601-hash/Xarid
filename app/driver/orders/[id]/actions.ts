"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/driver-auth";
import { saveActuals } from "@/lib/orders";

export async function saveDriverActuals(formData: FormData) {
  const driver = await requireDriver();
  const orderId = String(formData.get("orderId"));

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.driverId !== driver.id) return;

  const actuals: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("item_")) actuals[key.slice(5)] = Number(value);
  }
  await saveActuals(orderId, actuals);
  revalidatePath(`/driver/orders/${orderId}`);
}
