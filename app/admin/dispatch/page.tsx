import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { ACTIVE_ORDER_STATUSES, geocodeAddress, shortId } from "@/lib/driver";
import { DispatchBoard, type DispatchOrder, type DispatchDriver } from "@/components/logistics/dispatch-board";
import { assignDriver } from "./actions";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  await requireAdmin();
  const locale = await getLocale();
  const theme = (await cookies()).get("theme")?.value || "dark";

  const [rawOrders, rawDrivers, locations] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
      orderBy: { createdAt: "desc" },
      include: { driver: { select: { id: true, name: true } } },
    }),
    prisma.driver.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.driverLocation.findMany(),
  ]);

  const locByDriver = new Map(locations.map((l) => [l.driverId, l]));

  const orders: DispatchOrder[] = rawOrders.map((o) => {
    const pt = geocodeAddress(o.address);
    return {
      id: o.id,
      shortId: shortId(o.id),
      buyerName: o.buyerName,
      address: o.address,
      total: o.total,
      status: o.status,
      driverId: o.driverId,
      driverName: o.driver?.name ?? null,
      lat: pt.lat,
      lng: pt.lng,
    };
  });

  const drivers: DispatchDriver[] = rawDrivers.map((d) => {
    const loc = locByDriver.get(d.id);
    return {
      id: d.id,
      name: d.name,
      phone: d.phone,
      active: d.active,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      updatedAt: loc?.updatedAt.toISOString() ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t(locale, "disp_title")}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {t(locale, "disp_subtitle")}
        </p>
      </header>
      <DispatchBoard
        locale={locale}
        orders={orders}
        drivers={drivers}
        themeLight={theme === "light"}
        assignAction={assignDriver}
      />
    </div>
  );
}
