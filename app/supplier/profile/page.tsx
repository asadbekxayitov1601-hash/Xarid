import { requireSupplier } from "@/lib/supplier";
import { getLocale } from "@/lib/locale";
import { SupplierShell } from "@/components/supplier/SupplierShell";
import { AboutCompanyForm } from "@/components/supplier/AboutCompanyForm";

export const dynamic = "force-dynamic";

export default async function SupplierProfilePage() {
  const { org } = await requireSupplier();
  const locale = await getLocale();

  // `about` and `logoUrl` are nullable in the schema (Agent 4 additions).
  // Hand non-null defaults to the controlled form so React doesn't warn about
  // value/defaultValue switching mid-render.
  const initial = {
    name: org.name,
    district: org.district,
    phone: org.phone,
    about: (org as { about?: string | null }).about ?? "",
    logoUrl: (org as { logoUrl?: string | null }).logoUrl ?? "",
  };

  return (
    <SupplierShell locale={locale} orgName={org.name}>
      <AboutCompanyForm locale={locale} initial={initial} />
    </SupplierShell>
  );
}
