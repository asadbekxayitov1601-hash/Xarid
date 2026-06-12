import { prisma } from "@/lib/db";
import { requireSupplier } from "@/lib/supplier";
import { payoutStatement, weekStart } from "@/lib/payouts";
import { getLocale } from "@/lib/locale";
import { SupplierShell } from "@/components/supplier/SupplierShell";
import { SupplierClient } from "@/components/supplier-client";

export const dynamic = "force-dynamic";

const DATE_LOCALES = { uz: "uz-UZ", ru: "ru-RU", en: "en-GB" } as const;

export default async function SupplierPortalPage() {
  const { org } = await requireSupplier();
  const locale = await getLocale();

  const offers = await prisma.supplierOffer.findMany({
    where: { supplierId: org.id },
    include: { product: true },
    orderBy: { product: { sortKey: "asc" } },
  });

  const offeredIds = new Set(offers.map((o) => o.productId));
  const otherProducts = await prisma.product.findMany({
    where: { id: { notIn: [...offeredIds] } },
    orderBy: { sortKey: "asc" },
  });

  const start = weekStart(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const myRow = (await payoutStatement(start, end)).find((r) => r.supplierId === org.id);

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { supplierId: org.id },
    include: {
      order: true,
      lines: {
        include: {
          offer: {
            include: {
              product: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedPurchaseOrders = purchaseOrders.map((po) => ({
    id: po.id,
    orderId: po.orderId,
    status: po.status,
    createdAt: po.createdAt.toISOString(),
    buyerName: po.order.buyerName,
    buyerPhone: po.order.buyerPhone,
    address: po.order.address,
    deliveryDate: `${po.order.deliveryDate.toLocaleDateString(DATE_LOCALES[locale], {
      day: "numeric",
      month: "long",
    })} · 06:00–10:00`,
    lines: po.lines.map((l) => ({
      id: l.id,
      qty: l.qty,
      qtyActual: l.qtyActual,
      price: l.price,
      costPrice: l.costPrice,
      offer: {
        product: {
          nameUz: l.offer.product.nameUz,
          nameRu: l.offer.product.nameRu,
          unit: l.offer.product.unit,
          category: l.offer.product.category,
        },
      },
    })),
  }));

  const formattedOffers = offers.map((o) => ({
    id: o.id,
    productId: o.productId,
    costPrice: o.costPrice,
    price: o.price,
    available: o.available,
    product: {
      nameUz: o.product.nameUz,
      nameRu: o.product.nameRu,
      category: o.product.category,
      unit: o.product.unit,
      imageUrl: o.product.imageUrl,
    },
  }));

  const formattedOtherProducts = otherProducts.map((p) => ({
    id: p.id,
    nameUz: p.nameUz,
    nameRu: p.nameRu,
    unit: p.unit,
  }));

  return (
    <SupplierShell locale={locale} orgName={org.name}>
      <SupplierClient
        locale={locale}
        payoutGross={myRow?.gross ?? 0}
        payoutOrders={myRow?.orders ?? 0}
        payoutLines={myRow?.lines ?? 0}
        initialOffers={formattedOffers}
        otherProducts={formattedOtherProducts}
        purchaseOrders={formattedPurchaseOrders}
      />
    </SupplierShell>
  );
}
