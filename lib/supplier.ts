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

// ============================================================================
// Analytics helpers (Agent 4 — supplier dashboard)
// ----------------------------------------------------------------------------
// The supplier's analytics view treats DELIVERED + DELIVERING orders as
// recognised revenue (PARTIAL counts too — partial deliveries still ship the
// confirmed lines). Cancelled / placed-only orders are excluded.
// Revenue = qtyActual ?? qty multiplied by costPrice. costPrice is what the
// supplier actually receives (the buyer-facing price hides our take rate, see
// lib/pricing.ts), so this is the right axis for "what did I earn?".
// ============================================================================

const REVENUE_STATUSES = ["CONFIRMED", "PARTIAL", "DELIVERING", "DELIVERED"];

export type DailyRevenuePoint = {
  /** ISO yyyy-mm-dd, in the server's local timezone — the dashboard renders
   *  the label via Intl.DateTimeFormat on the client. */
  date: string;
  revenue: number;
  units: number;
};

export type ProductRevenueSlice = {
  productId: string;
  nameUz: string;
  nameRu: string;
  revenue: number;
  units: number;
};

export type SupplierAnalytics = {
  totalRevenue: number;
  totalUnits: number;
  activeCustomers: number;
  topProduct: { nameUz: string; nameRu: string; revenue: number } | null;
  daily: DailyRevenuePoint[];
  share: ProductRevenueSlice[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Pull every OrderItem the supplier earned on (joined through SupplierOffer)
 *  inside the given date window, then bucket into the daily / per-product
 *  aggregates the dashboard needs. One query — caller decides the window. */
export async function getSupplierAnalytics(
  supplierId: string,
  opts: { days?: number } = {}
): Promise<SupplierAnalytics> {
  const days = opts.days ?? 30;
  const end = new Date();
  const start = startOfDay(new Date(end.getTime() - days * 24 * 60 * 60 * 1000));

  // Join OrderItem -> SupplierOffer (supplierId) -> Order (status, createdAt,
  // buyerUserId for the active-customers count) -> Product (display names).
  const items = await prisma.orderItem.findMany({
    where: {
      offer: { supplierId },
      order: {
        status: { in: REVENUE_STATUSES },
        createdAt: { gte: start, lte: end },
      },
    },
    include: {
      order: { select: { id: true, status: true, createdAt: true, buyerUserId: true } },
      offer: {
        select: {
          product: { select: { id: true, nameUz: true, nameRu: true } },
        },
      },
    },
  });

  // Daily bucket — initialise every day in the window so the line chart shows
  // a 30-point series even on slow days.
  const dailyMap = new Map<string, DailyRevenuePoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const iso = isoDate(d);
    dailyMap.set(iso, { date: iso, revenue: 0, units: 0 });
  }

  const productMap = new Map<string, ProductRevenueSlice>();
  const customers = new Set<string>();
  let totalRevenue = 0;
  let totalUnits = 0;

  for (const it of items) {
    const qty = it.qtyActual ?? it.qty;
    const revenue = Math.round(qty * it.costPrice);
    const iso = isoDate(it.order.createdAt);
    const day = dailyMap.get(iso);
    if (day) {
      day.revenue += revenue;
      day.units += qty;
    }

    const productId = it.offer.product.id;
    const slice = productMap.get(productId) ?? {
      productId,
      nameUz: it.offer.product.nameUz,
      nameRu: it.offer.product.nameRu,
      revenue: 0,
      units: 0,
    };
    slice.revenue += revenue;
    slice.units += qty;
    productMap.set(productId, slice);

    customers.add(it.order.buyerUserId);
    totalRevenue += revenue;
    totalUnits += qty;
  }

  const share = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
  const topProduct = share[0]
    ? { nameUz: share[0].nameUz, nameRu: share[0].nameRu, revenue: share[0].revenue }
    : null;

  return {
    totalRevenue,
    totalUnits: Math.round(totalUnits),
    activeCustomers: customers.size,
    topProduct,
    daily: Array.from(dailyMap.values()),
    share,
  };
}

/** Collapse the long-tail of products into "top N + Other" so the pie chart
 *  never renders 40 micro-slices. */
export function topShareWithOther(
  slices: ProductRevenueSlice[],
  n: number
): ProductRevenueSlice[] {
  if (slices.length <= n) return slices;
  const head = slices.slice(0, n);
  const tail = slices.slice(n);
  const other: ProductRevenueSlice = {
    productId: "__other__",
    nameUz: "__other__",
    nameRu: "__other__",
    revenue: tail.reduce((s, x) => s + x.revenue, 0),
    units: tail.reduce((s, x) => s + x.units, 0),
  };
  return [...head, other];
}
