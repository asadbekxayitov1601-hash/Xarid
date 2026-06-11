import { prisma } from "@/lib/db";

export type PayoutRow = {
  supplierId: string;
  supplierName: string;
  orders: number;
  lines: number;
  gross: number; // owed to the supplier: Σ costPrice × qtyActual(or qty)
  margin: number; // Xarid's take: Σ (price − costPrice) × qtyActual(or qty)
};

/**
 * Payout statement per supplier over DELIVERED orders in [from, to).
 * Everything is computed from snapshotted prices and weighed quantities —
 * the same numbers the driver confirmed at the door.
 */
export async function payoutStatement(from: Date, to: Date): Promise<PayoutRow[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: { status: "DELIVERED", deliveryDate: { gte: from, lt: to } } },
    include: { offer: { select: { supplierId: true, supplier: { select: { name: true } } } } },
  });

  const rows = new Map<string, PayoutRow & { orderIds: Set<string> }>();
  for (const i of items) {
    const id = i.offer.supplierId;
    const row =
      rows.get(id) ??
      { supplierId: id, supplierName: i.offer.supplier.name, orders: 0, lines: 0, gross: 0, margin: 0, orderIds: new Set<string>() };
    const qty = i.qtyActual ?? i.qty;
    row.lines++;
    row.gross += Math.round(i.costPrice * qty);
    row.margin += Math.round((i.price - i.costPrice) * qty);
    row.orderIds.add(i.orderId);
    rows.set(id, row);
  }

  return [...rows.values()]
    .map(({ orderIds, ...row }) => ({ ...row, orders: orderIds.size }))
    .sort((a, b) => b.gross - a.gross);
}

/** Monday 00:00 of the week containing `d` (local server time). */
export function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}
