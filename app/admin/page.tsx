import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { AdminClient } from "@/components/admin-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  const [orders, leads, pendingPos] = await Promise.all([
    prisma.order.findMany({
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
      include: { purchaseOrders: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.count(),
    prisma.purchaseOrder.count({ where: { status: "SENT" } }),
  ]);

  const byStatus = new Map<string, { count: number; gmv: number }>();
  for (const o of orders) {
    const s = byStatus.get(o.status) ?? { count: 0, gmv: 0 };
    s.count++;
    s.gmv += o.total;
    byStatus.set(o.status, s);
  }

  const activeGmv = orders.reduce((s, o) => s + o.total, 0);
  const awaitingCutoff = orders.filter((o) => o.status === "PLACED" && o.purchaseOrders.length === 0).length;

  const pipelineOrders = orders.map((o) => ({
    id: o.id,
    org: o.buyerName || "Mijoz",
    total: o.total,
    itemsCount: o.items.length,
    status: o.status,
    address: o.address,
  }));

  const statusBreakdown = [...byStatus.entries()].map(([status, s]) => ({
    status,
    count: s.count,
    gmv: s.gmv,
  }));

  return (
    <AdminClient
      activeOrdersCount={orders.length}
      activeGmv={activeGmv}
      pendingPosCount={pendingPos}
      leadsCount={leads}
      awaitingCutoffCount={awaitingCutoff}
      pipelineOrders={pipelineOrders}
      statusBreakdown={statusBreakdown}
    />
  );
}
