import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { OrdersClient } from "@/components/orders-client";
import { LEGACY_DELIVERY_SLOT } from "@/lib/delivery";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const { placed } = await searchParams;
  const locale = await getLocale();
  const userId = await getSessionUserId();

  const orders = userId
    ? await prisma.order.findMany({
        where: { buyerUserId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              offer: {
                include: {
                  product: true,
                  supplier: { select: { name: true } },
                },
              },
            },
          },
        },
      })
    : [];

  const dateLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ";

  const formattedOrders = orders.map((o) => {
    // `deliverMode` is an additive column (consumer pivot). Read it defensively
    // so this build is safe whether or not the column/generated type exists yet.
    const deliverMode = (o as { deliverMode?: string | null }).deliverMode ?? null;
    // An order is ASAP when explicitly marked, OR (legacy heuristic) when it has
    // no chosen window. Otherwise it carries a scheduled day + window.
    const isAsap = deliverMode === "ASAP" || (deliverMode == null && !o.deliverySlot);

    // For ASAP we hand the client the raw target time and let it render a live
    // relative ETA ("Today, in ~45 min"). For scheduled we pre-format the
    // chosen day + window. Legacy/null scheduled rows fall back to the historic
    // fixed morning window.
    const scheduledLabel = `${o.deliveryDate.toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
    })} · ${o.deliverySlot ?? LEGACY_DELIVERY_SLOT}`;

    return {
      id: o.id,
      deliverMode: isAsap ? ("ASAP" as const) : ("SCHEDULED" as const),
      // Epoch ms target for ASAP ETA computation on the client.
      deliveryTargetMs: o.deliveryDate.getTime(),
      scheduledLabel,
      status: o.status,
      address: o.address,
      total: o.total,
      paidAt: !!o.paidAt,
      items: o.items.map((i) => ({
        id: i.id,
        qty: i.qty,
        qtyActual: i.qtyActual,
        price: i.price,
        offer: {
          offerId: i.offer.id,
          product: {
            nameUz: i.offer.product.nameUz,
            nameRu: i.offer.product.nameRu,
            unit: i.offer.product.unit,
            category: i.offer.product.category,
            image: i.offer.product.imageUrl,
          },
          supplier: {
            name: i.offer.supplier.name,
          },
        },
      })),
    };
  });

  return (
    <OrdersClient
      initialOrders={formattedOrders}
      locale={locale}
      placed={placed === "1"}
    />
  );
}
