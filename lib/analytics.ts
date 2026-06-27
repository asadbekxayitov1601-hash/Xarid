import { prisma } from "@/lib/db";

// Operational analytics for the admin dashboard: orders, GMV and platform margin
// over time, plus customer counts. Uses Postgres date_trunc via $queryRaw (Prisma
// groupBy can't bucket by day/month). Cancelled orders are excluded from money
// metrics. Sums come back as bigint -> coerced to number (fine at this scale).

const num = (v: unknown): number => Number(v ?? 0);

type CountGmvRow = { orders: number; gmv: bigint };
type MarginRow = { margin: bigint };
type CustomerRow = { total: number; active: number };
type BucketRow = { label: string; orders: number; gmv: bigint };

export type Bucket = { label: string; orders: number; gmv: number };

export type Analytics = {
  total: { orders: number; gmv: number; delivered: number; margin: number };
  today: { orders: number; gmv: number };
  month: { orders: number; gmv: number; margin: number };
  year: { orders: number; gmv: number };
  customers: { total: number; active30d: number };
  daily: Bucket[]; // last 30 days (only days with orders)
  monthly: Bucket[]; // last 12 months (only months with orders)
};

export async function getAnalytics(): Promise<Analytics> {
  const [total, today, month, year, marginTotal, marginMonth, customers, daily, monthly] =
    await Promise.all([
      prisma.$queryRaw<(CountGmvRow & { delivered: number })[]>`
        SELECT count(*)::int AS orders, COALESCE(sum(total),0)::bigint AS gmv,
               count(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered
        FROM "Order" WHERE status <> 'CANCELLED'`,
      prisma.$queryRaw<CountGmvRow[]>`
        SELECT count(*)::int AS orders, COALESCE(sum(total),0)::bigint AS gmv
        FROM "Order" WHERE status <> 'CANCELLED' AND "createdAt" >= date_trunc('day', now())`,
      prisma.$queryRaw<CountGmvRow[]>`
        SELECT count(*)::int AS orders, COALESCE(sum(total),0)::bigint AS gmv
        FROM "Order" WHERE status <> 'CANCELLED' AND "createdAt" >= date_trunc('month', now())`,
      prisma.$queryRaw<CountGmvRow[]>`
        SELECT count(*)::int AS orders, COALESCE(sum(total),0)::bigint AS gmv
        FROM "Order" WHERE status <> 'CANCELLED' AND "createdAt" >= date_trunc('year', now())`,
      prisma.$queryRaw<MarginRow[]>`
        SELECT COALESCE(sum(oi.price * oi.qty - oi."costPrice" * oi.qty),0)::bigint AS margin
        FROM "Order" o JOIN "OrderItem" oi ON oi."orderId" = o.id
        WHERE o.status <> 'CANCELLED'`,
      prisma.$queryRaw<MarginRow[]>`
        SELECT COALESCE(sum(oi.price * oi.qty - oi."costPrice" * oi.qty),0)::bigint AS margin
        FROM "Order" o JOIN "OrderItem" oi ON oi."orderId" = o.id
        WHERE o.status <> 'CANCELLED' AND o."createdAt" >= date_trunc('month', now())`,
      prisma.$queryRaw<CustomerRow[]>`
        SELECT count(DISTINCT "buyerUserId")::int AS total,
               count(DISTINCT "buyerUserId") FILTER (WHERE "createdAt" >= now() - interval '30 days')::int AS active
        FROM "Order"`,
      prisma.$queryRaw<BucketRow[]>`
        SELECT to_char(date_trunc('day', "createdAt"), 'DD.MM') AS label,
               count(*)::int AS orders, COALESCE(sum(total),0)::bigint AS gmv
        FROM "Order" WHERE status <> 'CANCELLED' AND "createdAt" >= now() - interval '30 days'
        GROUP BY date_trunc('day', "createdAt") ORDER BY date_trunc('day', "createdAt")`,
      prisma.$queryRaw<BucketRow[]>`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS label,
               count(*)::int AS orders, COALESCE(sum(total),0)::bigint AS gmv
        FROM "Order" WHERE status <> 'CANCELLED' AND "createdAt" >= now() - interval '12 months'
        GROUP BY date_trunc('month', "createdAt") ORDER BY date_trunc('month', "createdAt")`,
    ]);

  return {
    total: {
      orders: num(total[0]?.orders),
      gmv: num(total[0]?.gmv),
      delivered: num(total[0]?.delivered),
      margin: num(marginTotal[0]?.margin),
    },
    today: { orders: num(today[0]?.orders), gmv: num(today[0]?.gmv) },
    month: { orders: num(month[0]?.orders), gmv: num(month[0]?.gmv), margin: num(marginMonth[0]?.margin) },
    year: { orders: num(year[0]?.orders), gmv: num(year[0]?.gmv) },
    customers: { total: num(customers[0]?.total), active30d: num(customers[0]?.active) },
    daily: daily.map((r) => ({ label: r.label, orders: num(r.orders), gmv: num(r.gmv) })),
    monthly: monthly.map((r) => ({ label: r.label, orders: num(r.orders), gmv: num(r.gmv) })),
  };
}
