import { prisma } from "@/lib/db";

/**
 * Records actual delivered/weighed quantities for an order's items and
 * recomputes the order total from them — produce and meat never weigh
 * exactly what was ordered, and the invoice must follow the scales.
 */
export async function saveActuals(orderId: string, actuals: Record<string, number>) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;

  for (const item of order.items) {
    const qtyActual = actuals[item.id];
    if (qtyActual === undefined || !Number.isFinite(qtyActual) || qtyActual < 0) continue;
    await prisma.orderItem.update({ where: { id: item.id }, data: { qtyActual } });
  }

  const updated = await prisma.orderItem.findMany({ where: { orderId } });
  const total = updated.reduce((s, i) => s + Math.round(i.price * (i.qtyActual ?? i.qty)), 0);
  await prisma.order.update({ where: { id: orderId }, data: { total } });
}
