import { prisma } from "@/lib/db";
import { requireSupplier } from "@/lib/supplier";
import { getLocale } from "@/lib/locale";
import { SupplierShell } from "@/components/supplier/SupplierShell";
import { ProductUploadForm } from "@/components/supplier/ProductUploadForm";

export const dynamic = "force-dynamic";

export default async function SupplierAddProductPage() {
  const { org } = await requireSupplier();
  const locale = await getLocale();

  const offered = await prisma.supplierOffer.findMany({
    where: { supplierId: org.id },
    select: { productId: true },
  });
  const offeredIds = offered.map((o) => o.productId);

  const products = await prisma.product.findMany({
    where: { id: { notIn: offeredIds } },
    orderBy: { sortKey: "asc" },
    select: { id: true, nameUz: true, nameRu: true, unit: true },
  });

  return (
    <SupplierShell locale={locale} orgName={org.name}>
      <ProductUploadForm locale={locale} products={products} />
    </SupplierShell>
  );
}
