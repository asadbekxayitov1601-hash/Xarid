import { requireSupplier, getSupplierAnalytics, topShareWithOther } from "@/lib/supplier";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { SupplierShell } from "@/components/supplier/SupplierShell";
import { AnalyticsDashboard } from "@/components/supplier/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function SupplierAnalyticsPage() {
  const { org } = await requireSupplier();
  const locale = await getLocale();
  const analytics = await getSupplierAnalytics(org.id, { days: 30 });

  // Pie chart: top 6 + "Other" so a long tail of products doesn't smear the
  // legend. Localised labels resolved here (server) using the active locale.
  const collapsed = topShareWithOther(analytics.share, 6);
  const pie = collapsed.map((s) => ({
    id: s.productId,
    label:
      s.productId === "__other__"
        ? t(locale, "chart_share_other")
        : locale === "ru"
        ? s.nameRu || s.nameUz
        : s.nameUz,
    value: s.revenue,
  }));

  return (
    <SupplierShell locale={locale} orgName={org.name}>
      <AnalyticsDashboard
        locale={locale}
        totalRevenue={analytics.totalRevenue}
        totalUnits={analytics.totalUnits}
        activeCustomers={analytics.activeCustomers}
        topProduct={analytics.topProduct}
        daily={analytics.daily.map((d) => ({ date: d.date, revenue: d.revenue }))}
        share={pie}
      />
    </SupplierShell>
  );
}
