import { requireSupplier } from "@/lib/supplier";
import { getLocale } from "@/lib/locale";
import { SupplierShell } from "@/components/supplier/SupplierShell";
import { ProductUploadForm } from "@/components/supplier/ProductUploadForm";

export const dynamic = "force-dynamic";

export default async function SupplierAddProductPage() {
  const { org } = await requireSupplier();
  const locale = await getLocale();

  return (
    <SupplierShell locale={locale} orgName={org.name}>
      <ProductUploadForm locale={locale} />
    </SupplierShell>
  );
}
