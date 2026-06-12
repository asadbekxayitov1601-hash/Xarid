import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { computeEtaMinutes, geocodeAddress, shortId } from "@/lib/driver";
import { getLocale } from "@/lib/locale";
import { TrackingClient } from "@/components/logistics/tracking-client";

export const dynamic = "force-dynamic";

/**
 * Customer-facing live tracking. URL pattern matches `/api/orders/:id/track`
 * so the share link is straightforward. No auth — see the route handler note.
 */
export default async function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const locale = await getLocale();
  const theme = (await cookies()).get("theme")?.value || "dark";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      driver: true,
      items: { select: { id: true } },
    },
  });
  if (!order) notFound();

  const buyerPt = geocodeAddress(order.address);

  let driverBlock: {
    id: string;
    name: string;
    phone: string;
    lat: number | null;
    lng: number | null;
    updatedAt: string | null;
  } | null = null;
  let driverPt: { lat: number; lng: number } | null = null;

  if (order.driver) {
    const loc = await prisma.driverLocation.findUnique({ where: { driverId: order.driver.id } });
    if (loc) driverPt = { lat: loc.lat, lng: loc.lng };
    driverBlock = {
      id: order.driver.id,
      name: order.driver.name,
      phone: order.driver.phone,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      updatedAt: loc?.updatedAt?.toISOString() ?? null,
    };
  }

  const eta = computeEtaMinutes(driverPt, buyerPt);

  return (
    <TrackingClient
      orderId={orderId}
      locale={locale}
      themeLight={theme === "light"}
      initial={{
        ok: true,
        status: order.status,
        eta,
        buyer: {
          name: order.buyerName,
          address: order.address,
          lat: buyerPt.lat,
          lng: buyerPt.lng,
          itemsCount: order.items.length,
          total: order.total,
          shortId: shortId(order.id),
        },
        driver: driverBlock,
      }}
    />
  );
}
