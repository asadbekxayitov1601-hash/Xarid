import { prisma } from "@/lib/db";

// Double-entry ledger. Every money event posts balanced entries with a
// deterministic idempotency key — re-posting the same event is a no-op,
// so these hooks can be called from retried webhooks and repeated status
// transitions without double-counting.

export const ACCOUNT = {
  buyer: (userId: string) => `BUYER_RECEIVABLE:${userId}`,
  supplier: (orgId: string) => `SUPPLIER_PAYABLE:${orgId}`,
  margin: "REVENUE:MARGIN",
  driverCash: (driverId: string) => `CASH:DRIVER:${driverId}`,
  officeCash: "CASH:OFFICE",
  bank: (provider: string) => `BANK:${provider}`,
} as const;

type Entry = { key: string; debit: string; credit: string; amount: number; orderId?: string; memo?: string };

async function post(entries: Entry[]) {
  const valid = entries.filter((e) => e.amount > 0);
  if (valid.length === 0) return;
  await prisma.ledgerEntry.createMany({ data: valid, skipDuplicates: true });
}

/**
 * Order delivered: the buyer now owes the order total; we owe each supplier
 * their cost share (at weighed quantities); the rest is margin.
 */
export async function postDelivery(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { offer: { select: { supplierId: true } } } } },
  });
  if (!order || order.status !== "DELIVERED") return;

  const costBySupplier = new Map<string, number>();
  let costTotal = 0;
  for (const i of order.items) {
    const qty = i.qtyActual ?? i.qty;
    const cost = Math.round(i.costPrice * qty);
    costTotal += cost;
    costBySupplier.set(i.offer.supplierId, (costBySupplier.get(i.offer.supplierId) ?? 0) + cost);
  }

  const entries: Entry[] = [...costBySupplier.entries()].map(([supplierId, cost]) => ({
    key: `delivery:${orderId}:${supplierId}`,
    debit: ACCOUNT.buyer(order.buyerUserId),
    credit: ACCOUNT.supplier(supplierId),
    amount: cost,
    orderId,
    memo: `Yetkazildi №${orderId.slice(-6).toUpperCase()}`,
  }));
  entries.push({
    key: `delivery:${orderId}:margin`,
    debit: ACCOUNT.buyer(order.buyerUserId),
    credit: ACCOUNT.margin,
    amount: order.total - costTotal,
    orderId,
    memo: `Marja №${orderId.slice(-6).toUpperCase()}`,
  });
  await post(entries);
}

/** Cash collected at the door goes into the driver's pocket account. */
export async function postCashCollected(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order?.driverId || order.cashTaken == null || order.cashTaken <= 0) return;
  await post([
    {
      key: `cash:${orderId}`,
      debit: ACCOUNT.driverCash(order.driverId),
      credit: ACCOUNT.buyer(order.buyerUserId),
      amount: order.cashTaken,
      orderId,
      memo: `Naqd №${orderId.slice(-6).toUpperCase()}`,
    },
  ]);
}

/** Confirmed online payment settles the buyer's receivable into the bank. */
export async function postOnlinePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.status !== "PAID") return;
  await post([
    {
      key: `pay:${payment.id}`,
      debit: ACCOUNT.bank(payment.provider),
      credit: ACCOUNT.buyer(payment.order.buyerUserId),
      amount: payment.amount,
      orderId: payment.orderId,
      memo: `${payment.provider} to'lovi`,
    },
  ]);
}

/** Driver hands cash in at the office. */
export async function postCashHandover(driverId: string, amount: number) {
  if (amount <= 0) return;
  await post([
    {
      key: `handover:${driverId}:${Date.now()}`,
      debit: ACCOUNT.officeCash,
      credit: ACCOUNT.driverCash(driverId),
      amount,
      memo: "Kassa topshirish",
    },
  ]);
}

/** A supplier's week marked as paid: payable cleared from office cash. */
export async function markPayoutPaid(supplierId: string, periodStart: Date, periodEnd: Date, amount: number) {
  if (amount <= 0) return;
  const payout = await prisma.payout.upsert({
    where: { supplierId_periodStart: { supplierId, periodStart } },
    update: {},
    create: { supplierId, periodStart, periodEnd, amount },
  });
  await post([
    {
      key: `payout:${payout.id}`,
      debit: ACCOUNT.supplier(supplierId),
      credit: ACCOUNT.officeCash,
      amount: payout.amount,
      memo: `Haftalik to'lov ${periodStart.toISOString().slice(0, 10)}`,
    },
  ]);
}

export type Balance = { account: string; balance: number };

/** Net balance per account: debits minus credits. */
export async function balances(prefix?: string): Promise<Balance[]> {
  const [debits, credits] = await Promise.all([
    prisma.ledgerEntry.groupBy({ by: ["debit"], _sum: { amount: true } }),
    prisma.ledgerEntry.groupBy({ by: ["credit"], _sum: { amount: true } }),
  ]);
  const map = new Map<string, number>();
  for (const d of debits) map.set(d.debit, (map.get(d.debit) ?? 0) + (d._sum.amount ?? 0));
  for (const c of credits) map.set(c.credit, (map.get(c.credit) ?? 0) - (c._sum.amount ?? 0));
  return [...map.entries()]
    .filter(([account]) => !prefix || account.startsWith(prefix))
    .map(([account, balance]) => ({ account, balance }))
    .sort((a, b) => a.account.localeCompare(b.account));
}
