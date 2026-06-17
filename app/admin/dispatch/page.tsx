import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { ACTIVE_ORDER_STATUSES, geocodeAddress, shortId } from "@/lib/driver";
import { hasCoords } from "@/lib/geo";
import { DispatchBoard, type DispatchOrder, type DispatchDriver } from "@/components/logistics/dispatch-board";
import { assignDriver, autoAssignAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  await requireAdmin();
  const locale = await getLocale();
  const theme = (await cookies()).get("theme")?.value || "dark";

  const [rawOrders, rawDrivers, locations] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
      orderBy: { createdAt: "desc" },
      include: {
        driver: { select: { id: true, name: true } },
        // Walk to the primary seller's coords for the pickup pin. `id: asc`
        // keeps "first item wins" deterministic, matching lib/dispatch's
        // resolvePickup so the board and the auto-assign agree on pickup.
        items: {
          orderBy: { id: "asc" },
          include: {
            offer: { include: { supplier: { select: { name: true, lat: true, lng: true } } } },
          },
        },
      },
    }),
    prisma.driver.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.driverLocation.findMany(),
  ]);

  const locByDriver = new Map(locations.map((l) => [l.driverId, l]));

  const orders: DispatchOrder[] = rawOrders.map((o) => {
    // Delivery pin: prefer the real captured coords (Phase 1 location picker),
    // fall back to the deterministic geocode of the address text for legacy
    // rows so every order still appears on the map.
    const pt = hasCoords(o.lat, o.lng)
      ? { lat: o.lat as number, lng: o.lng as number }
      : geocodeAddress(o.address);

    // Pickup pin: the first order item's supplier Organization that has coords.
    let sellerName: string | null = null;
    let sellerLat: number | null = null;
    let sellerLng: number | null = null;
    for (const it of o.items) {
      const sup = it.offer?.supplier;
      if (sup && hasCoords(sup.lat, sup.lng)) {
        sellerName = sup.name;
        sellerLat = sup.lat as number;
        sellerLng = sup.lng as number;
        break;
      }
    }

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
      sellerName,
      sellerLat,
      sellerLng,
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
        autoAssignAction={autoAssignAction}
      />
    </div>
  );
}
