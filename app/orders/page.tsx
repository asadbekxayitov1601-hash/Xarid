import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { OrdersClient } from "@/components/orders-client";

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

  const formattedOrders = orders.map((o) => ({
    id: o.id,
    deliveryDate: `${o.deliveryDate.toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
    })} · 06:00–10:00`,
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
  }));

  return (
    <OrdersClient
      initialOrders={formattedOrders}
      locale={locale}
      placed={placed === "1"}
    />
  );
}
