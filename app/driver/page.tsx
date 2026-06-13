import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/driver-auth";
import { getLocale } from "@/lib/locale";
import { ACTIVE_ORDER_STATUSES, geocodeAddress, shortId } from "@/lib/driver";
import { DriverClient, type DriverJobView } from "@/components/logistics/driver-client";

export const dynamic = "force-dynamic";

/**
 * Xarid Go driver entry. Picks the driver's current open job (assigned +
 * still in progress) and renders the Yandex Go-style sheet. Falls back to
 * the "no job yet" state. The legacy scale form at /driver/orders/[id] is
 * still reachable from the bottom-sheet action row — we don't rewrite it.
 */
export default async function DriverHomePage() {
  const driver = await requireDriver();
  const locale = await getLocale();
  const theme = (await cookies()).get("theme")?.value || "dark";

  const order = await prisma.order.findFirst({
    where: {
      driverId: driver.id,
      status: { in: [...ACTIVE_ORDER_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
    include: { items: { select: { id: true } } },
  });

  let job: DriverJobView = null;
  if (order) {
    const pt = geocodeAddress(order.address);
    job = {
      id: order.id,
      shortId: shortId(order.id),
      status: order.status,
      buyer: {
        name: order.buyerName,
        phone: order.buyerPhone,
        address: order.address,
        lat: pt.lat,
        lng: pt.lng,
      },
      itemsCount: order.items.length,
      total: order.total,
    };
  }

  return <DriverClient locale={locale} job={job} themeLight={theme === "light"} />;
}
